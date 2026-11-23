(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    /* ---------- Three.js mountain ---------- */
    function initMountain() {
      const canvas = document.getElementById("mountain-canvas");
      const fallback = document.getElementById("mountainFallback");
      const glideBar = document.getElementById("glideBar");
      const glidePct = document.getElementById("glidePct");
      const glideLabel = document.getElementById("glideLabel");
      const labels = ["Entering the valley", "Through the pines", "Village nest", "Climbing the ridge", "Summit light"];

      if (!window.THREE || reduceMotion) {
        canvas.style.display = "none";
        fallback.style.display = "block";
        return;
      }

      let renderer, scene, camera, world, animationId;
      const pointer = { x: 0, y: 0 };
      const glide = { t: 0 };

      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.35 : 2));
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.18;
        renderer.shadowMap.enabled = !isTouch;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const fogColor = 0xc9dff0;
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(fogColor, 10, 72);
        scene.background = null;

        camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 160);
        camera.position.set(0, 2.1, 26);

        const hemi = new THREE.HemisphereLight(0xe8f4ff, 0xb7c9bc, 0.75);
        const sun = new THREE.DirectionalLight(0xfff1dd, 1.7);
        sun.position.set(18, 32, 12);
        sun.castShadow = !isTouch;
        if (!isTouch) {
          sun.shadow.mapSize.set(2048, 2048);
          sun.shadow.camera.near = 2;
          sun.shadow.camera.far = 90;
          sun.shadow.camera.left = -28;
          sun.shadow.camera.right = 28;
          sun.shadow.camera.top = 28;
          sun.shadow.camera.bottom = -28;
          sun.shadow.bias = -0.00025;
          sun.shadow.normalBias = 0.03;
        }
        const bounce = new THREE.DirectionalLight(0xd7e7f5, 0.4);
        bounce.position.set(-12, 10, -6);
        const cool = new THREE.DirectionalLight(0xc5b8e8, 0.2);
        cool.position.set(2, 6, -18);
        scene.add(hemi, sun, bounce, cool);

        world = new THREE.Group();
        scene.add(world);

        // --- Noise helpers ---
        const hash = (x, z) => {
          const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
          return s - Math.floor(s);
        };
        const noise = (x, z) => {
          const xi = Math.floor(x);
          const zi = Math.floor(z);
          const xf = x - xi;
          const zf = z - zi;
          const u = xf * xf * (3 - 2 * xf);
          const v = zf * zf * (3 - 2 * zf);
          const a = hash(xi, zi);
          const b = hash(xi + 1, zi);
          const c = hash(xi, zi + 1);
          const d = hash(xi + 1, zi + 1);
          return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
        };
        const fbm = (x, z) => {
          let v = 0, a = 0.5, f = 1;
          for (let i = 0; i < 5; i++) {
            v += a * noise(x * f, z * f);
            a *= 0.5;
            f *= 2.05;
          }
          return v;
        };

        const snowCol = new THREE.Color(0xf4f8fc);
        const iceCol = new THREE.Color(0xd9eaf6);
        const rockCol = new THREE.Color(0x6d7d8c);
        const darkRock = new THREE.Color(0x556575);

        const terrainMat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.92,
          metalness: 0.04,
          flatShading: false
        });

        const createMountainGeo = (radius, height, seed) => {
          const radSegs = isTouch ? 36 : 64;
          const hSegs = isTouch ? 18 : 32;
          const geo = new THREE.CylinderGeometry(0.02, radius, height, radSegs, hSegs, false);
          const pos = geo.attributes.position;
          const colors = new Float32Array(pos.count * 3);
          const tmp = new THREE.Color();
          for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i);
            let y = pos.getY(i);
            let z = pos.getZ(i);
            const t = Math.max(0, Math.min(1, (y + height * 0.5) / height));
            const ang = Math.atan2(z, x);
            const n = fbm(Math.cos(ang) * 2 + seed, Math.sin(ang) * 2 + seed * 1.3 + t * 3);
            const n2 = fbm(Math.cos(ang * 2) * 3 + seed * 2, t * 5 + seed);
            const n3 = fbm(ang * 2.6 + seed, t * 4.2);
            const flare = Math.pow(1 - t, 1.2);
            const ridgeCut = Math.abs(Math.sin(ang * 2.5 + seed * 0.7)) * 0.28 * flare;
            const gully = Math.pow(Math.abs(n2 - 0.5) * 2, 1.35) * 0.65 * (0.15 + flare);
            const bulge = (n - 0.5) * 0.85 * (0.2 + flare);
            const crest = Math.pow(t, 2.2) * (0.12 + n3 * 0.4);
            let r = radius * Math.max(0.045, flare * (1.12 + bulge - gully - ridgeCut) + crest * 0.15);
            if (t > 0.8) r *= Math.max(0.1, 1 - (t - 0.8) * 2.4);
            x = Math.cos(ang) * r;
            z = Math.sin(ang) * r;
            y = y + (n - 0.5) * height * 0.1 * flare + crest * height * 0.08;
            pos.setXYZ(i, x, y, z);

            const steep = Math.min(1, gully * 1.5 + ridgeCut * 1.7);
            const snowMix = Math.max(0, t * 1.3 - steep * 0.75 + n * 0.08);
            tmp.copy(rockCol).lerp(darkRock, Math.min(1, steep + (1 - t) * 0.3));
            tmp.lerp(iceCol, Math.max(0, snowMix - 0.38) * 0.55);
            tmp.lerp(snowCol, Math.min(1, Math.pow(snowMix, 1.05)));
            colors[i * 3] = tmp.r;
            colors[i * 3 + 1] = tmp.g;
            colors[i * 3 + 2] = tmp.b;
          }
          geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          geo.computeVertexNormals();
          return geo;
        };

        const addMountain = (x, z, radius, height, seed) => {
          const mesh = new THREE.Mesh(createMountainGeo(radius, height, seed), terrainMat);
          mesh.position.set(x, height * 0.42, z);
          mesh.rotation.y = seed * 0.37;
          mesh.castShadow = !isTouch;
          mesh.receiveShadow = !isTouch;
          world.add(mesh);
          return mesh;
        };

        // Valley floor with soft powder undulation
        const floorSeg = isTouch ? 48 : 96;
        const floorGeo = new THREE.PlaneGeometry(36, 86, floorSeg, Math.floor(floorSeg * 1.6));
        {
          const pos = floorGeo.attributes.position;
          const colors = new Float32Array(pos.count * 3);
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i); // will become z after rotate
            const n = fbm(x * 0.22, y * 0.16);
            const n2 = fbm(x * 0.55, y * 0.4);
            const trench = Math.exp(-(x * x) / 16) * 0.55;
            const drifts = Math.sin(x * 1.3 + y * 0.4) * 0.12 * n2;
            const h = n * 0.85 + drifts - trench;
            pos.setZ(i, h);
            const c = 0.86 + n * 0.12;
            colors[i * 3] = c * 0.95;
            colors[i * 3 + 1] = c * 0.98;
            colors[i * 3 + 2] = Math.min(1, c * 1.02);
          }
          floorGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          floorGeo.computeVertexNormals();
        }
        const floor = new THREE.Mesh(
          floorGeo,
          new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.96,
            metalness: 0.03
          })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0.02, -8);
        floor.receiveShadow = !isTouch;
        world.add(floor);

        // Tall valley walls — continuous heightmap ridges
        const makeRidge = (side) => {
          const segsW = isTouch ? 40 : 80;
          const segsH = isTouch ? 24 : 48;
          const geo = new THREE.PlaneGeometry(78, 14, segsW, segsH);
          const pos = geo.attributes.position;
          const colors = new Float32Array(pos.count * 3);
          const tmp = new THREE.Color();
          for (let i = 0; i < pos.count; i++) {
            const u = pos.getX(i); // along valley (-39..39)
            const v = pos.getY(i); // height (-7..7)
            const t = (v + 7) / 14;
            const n = fbm(u * 0.12 + side * 8, t * 3.2 + side);
            const n2 = fbm(u * 0.35 + side * 3, t * 6);
            const peakLine = 0.55 + 0.35 * Math.sin(u * 0.18 + side) + 0.2 * n;
            let depth = Math.max(0, peakLine - t);
            depth = Math.pow(depth, 0.85);
            const carve = Math.pow(Math.abs(n2 - 0.5) * 2, 1.5) * 0.55 * (1 - t);
            const push = depth * 5.5 - carve * 2.2 - t * 0.4;
            pos.setZ(i, -push);
            pos.setY(i, v + n * 1.1 + Math.max(0, t - 0.7) * n2 * 1.4);

            const steep = Math.min(1, carve * 1.3 + (1 - depth) * 0.4);
            const snowMix = Math.max(0, t * 1.15 - steep * 0.65 + n * 0.1);
            tmp.copy(rockCol).lerp(darkRock, steep);
            tmp.lerp(iceCol, Math.max(0, snowMix - 0.35) * 0.5);
            tmp.lerp(snowCol, Math.min(1, snowMix));
            colors[i * 3] = tmp.r;
            colors[i * 3 + 1] = tmp.g;
            colors[i * 3 + 2] = tmp.b;
          }
          geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          geo.computeVertexNormals();
          const mesh = new THREE.Mesh(geo, terrainMat);
          mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          mesh.position.set(side * 4.6, 5.2, -8);
          mesh.castShadow = !isTouch;
          mesh.receiveShadow = !isTouch;
          world.add(mesh);
        };
        makeRidge(-1);
        makeRidge(1);

        // Flanking ranges — natural corridor
        for (let i = 0; i < 14; i++) {
          const z = 20 - i * 3.6;
          const pull = 5.2 + Math.sin(i * 0.7) * 0.7;
          addMountain(-pull - Math.random() * 1.6, z, 2.2 + Math.random() * 1.8, 4.2 + Math.random() * 4.5, i * 2.1);
          addMountain(pull + Math.random() * 1.7, z - 0.8, 2.1 + Math.random() * 1.9, 4 + Math.random() * 4.8, i * 3.3 + 1);
          if (i % 2 === 0) addMountain(-pull - 4.2, z - 1.4, 3.2 + Math.random(), 6.5 + Math.random() * 2.8, i + 40);
          if (i % 3 === 0) addMountain(pull + 4.4, z + 0.6, 3.4 + Math.random(), 7 + Math.random() * 3, i + 70);
        }
        addMountain(-1.6, -24, 4.2, 10.5, 101);
        addMountain(2.8, -30, 4.8, 12.2, 202);
        addMountain(0.2, -36, 3.6, 9.4, 303);
        addMountain(-4.2, -32, 3.1, 8.2, 404);

        // Soft sky dome
        const skyGeo = new THREE.SphereGeometry(90, 32, 16);
        const skyMat = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: {
            topColor: { value: new THREE.Color(0x8ebbd4) },
            midColor: { value: new THREE.Color(0xd5e7f4) },
            bottomColor: { value: new THREE.Color(0xeef5f8) }
          },
          vertexShader: `
            varying vec3 vWorld;
            void main() {
              vec4 w = modelMatrix * vec4(position, 1.0);
              vWorld = w.xyz;
              gl_Position = projectionMatrix * viewMatrix * w;
            }
          `,
          fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 midColor;
            uniform vec3 bottomColor;
            varying vec3 vWorld;
            void main() {
              float h = normalize(vWorld).y;
              vec3 col = mix(bottomColor, midColor, smoothstep(-0.15, 0.25, h));
              col = mix(col, topColor, smoothstep(0.15, 0.85, h));
              gl_FragColor = vec4(col, 1.0);
            }
          `
        });
        scene.add(new THREE.Mesh(skyGeo, skyMat));

        // Atmospheric mist sheets
        const mistMat = new THREE.MeshBasicMaterial({
          color: 0xe4f1fa,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        for (let i = 0; i < 6; i++) {
          const mist = new THREE.Mesh(new THREE.PlaneGeometry(28, 6 + i * 0.4), mistMat.clone());
          mist.material.opacity = 0.08 + i * 0.025;
          mist.position.set(0, 1.2 + i * 0.4, 10 - i * 8.5);
          mist.rotation.x = -0.06;
          world.add(mist);
        }

        // Layered pine trees
        const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2f, roughness: 0.95 });
        const needleA = new THREE.MeshStandardMaterial({ color: 0x3f6b54, roughness: 0.88 });
        const needleB = new THREE.MeshStandardMaterial({ color: 0x2f5643, roughness: 0.9 });
        const makePine = (scale) => {
          const g = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * scale, 0.05 * scale, 0.35 * scale, 6), barkMat);
          trunk.position.y = 0.18 * scale;
          g.add(trunk);
          for (let t = 0; t < 3; t++) {
            const r = (0.28 - t * 0.07) * scale;
            const h = (0.42 - t * 0.04) * scale;
            const foliage = new THREE.Mesh(
              new THREE.ConeGeometry(r, h, isTouch ? 7 : 10),
              t % 2 ? needleA : needleB
            );
            foliage.position.y = (0.42 + t * 0.28) * scale;
            g.add(foliage);
          }
          // light snow cap
          const cap = new THREE.Mesh(
            new THREE.ConeGeometry(0.12 * scale, 0.1 * scale, 7),
            new THREE.MeshStandardMaterial({ color: 0xf2f7fb, roughness: 0.9 })
          );
          cap.position.y = 1.15 * scale;
          g.add(cap);
          return g;
        };

        const treeCount = isTouch ? 46 : 110;
        for (let i = 0; i < treeCount; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const near = i % 4 === 0;
          const scale = near ? 1.15 + Math.random() * 0.55 : 0.65 + Math.random() * 0.7;
          const pine = makePine(scale);
          const x = side * (near ? 1.45 + Math.random() * 0.85 : 2.4 + Math.random() * 3.2);
          const z = 22 - Math.random() * 58;
          const y = fbm(x * 0.2, z * 0.14) * 0.35;
          pine.position.set(x, y, z);
          pine.rotation.y = Math.random() * Math.PI;
          pine.rotation.z = (Math.random() - 0.5) * 0.08;
          pine.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = !isTouch;
              o.receiveShadow = !isTouch;
            }
          });
          world.add(pine);
        }

        // Village nest
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xb89572, roughness: 0.82 });
        const roofSnow = new THREE.MeshStandardMaterial({ color: 0xf3f7fb, roughness: 0.92 });
        for (let i = 0; i < 6; i++) {
          const house = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.36), woodMat);
          house.position.set(-1.7 + i * 0.65, 0.22, -5.2 + (i % 2) * 0.45);
          world.add(house);
          const roof = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.26, 4), roofSnow);
          roof.position.set(house.position.x, 0.48, house.position.z);
          roof.rotation.y = Math.PI / 4;
          world.add(roof);
        }

        // Ski lift
        const liftMat = new THREE.MeshStandardMaterial({ color: 0x2a3d52, roughness: 0.55, metalness: 0.35 });
        const liftPts = [];
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x6a7888, roughness: 0.7 });
        for (let i = 0; i < 11; i++) {
          const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 1.45, 8), poleMat);
          const z = 14 - i * 2.15;
          poleMesh.position.set(-2.95, 0.72, z);
          world.add(poleMesh);
          liftPts.push(new THREE.Vector3(-2.95, 1.4, z));
        }
        world.add(new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(liftPts), 80, 0.014, 8, false),
          liftMat
        ));

        // Distant skiers
        const skiers = [];
        for (let i = 0; i < 5; i++) {
          const skier = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.06, 0.12, 4, 8),
            new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe8c9d4 : 0x273d58, roughness: 0.65 })
          );
          skier.userData = { t: Math.random(), speed: 0.0018 + Math.random() * 0.002, lane: -0.8 + i * 0.34 };
          world.add(skier);
          skiers.push(skier);
        }

        // Soft circular snowflake texture
        const flakeCanvas = document.createElement("canvas");
        flakeCanvas.width = 64;
        flakeCanvas.height = 64;
        const fctx = flakeCanvas.getContext("2d");
        const grad = fctx.createRadialGradient(32, 32, 2, 32, 32, 28);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.35, "rgba(255,255,255,0.85)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        fctx.fillStyle = grad;
        fctx.fillRect(0, 0, 64, 64);
        const flakeTex = new THREE.CanvasTexture(flakeCanvas);
        flakeTex.colorSpace = THREE.SRGBColorSpace;

        const snowCount = isTouch ? 500 : 1400;
        const snowPos = new Float32Array(snowCount * 3);
        for (let i = 0; i < snowCount; i++) {
          snowPos[i * 3] = (Math.random() - 0.5) * 18;
          snowPos[i * 3 + 1] = Math.random() * 14;
          snowPos[i * 3 + 2] = 26 - Math.random() * 70;
        }
        const snowGeo = new THREE.BufferGeometry();
        snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
        const snowPoints = new THREE.Points(
          snowGeo,
          new THREE.PointsMaterial({
            map: flakeTex,
            color: 0xffffff,
            size: 0.12,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
          })
        );
        world.add(snowPoints);

        // Camera glide path
        const camPath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.2, 2.05, 26),
          new THREE.Vector3(0.9, 1.85, 16),
          new THREE.Vector3(-0.75, 1.95, 7.5),
          new THREE.Vector3(0.6, 1.8, 0),
          new THREE.Vector3(-0.4, 2.15, -7.5),
          new THREE.Vector3(0.45, 3.0, -15),
          new THREE.Vector3(-0.1, 4.3, -23),
          new THREE.Vector3(0.25, 6.0, -32)
        ]);
        const lookPath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.15, 1.7, 17),
          new THREE.Vector3(0.45, 1.65, 9),
          new THREE.Vector3(-0.2, 1.75, 1),
          new THREE.Vector3(0.3, 1.95, -8),
          new THREE.Vector3(0, 2.6, -16),
          new THREE.Vector3(0.15, 3.7, -24),
          new THREE.Vector3(0, 5.0, -31),
          new THREE.Vector3(0.2, 6.4, -40)
        ]);

        const _up = new THREE.Vector3(0, 1, 0);
        const _tangent = new THREE.Vector3();
        const _binormal = new THREE.Vector3();
        const _lookTarget = new THREE.Vector3();
        let lastLabelIdx = -1;
        let lastHotspot = -1;
        const hintEl = document.querySelector(".mountain-hint");

        const applyCamera = (tt) => {
          const pos = camPath.getPointAt(tt);
          const look = lookPath.getPointAt(tt);
          camPath.getTangentAt(tt, _tangent);
          _binormal.crossVectors(_tangent, _up).normalize();
          const bank = Math.sin(tt * Math.PI * 2.05) * 0.07;

          camera.position.copy(pos);
          camera.position.x += pointer.x * 0.25 + _binormal.x * bank * 0.35;
          camera.position.y += pointer.y * 0.14;
          _lookTarget.copy(look);
          _lookTarget.x += pointer.x * 0.12;
          camera.lookAt(_lookTarget);
          camera.rotateZ(-bank + pointer.x * 0.025);
          camera.fov = 52 + Math.sin(tt * Math.PI) * 5;
          camera.updateProjectionMatrix();
        };

        const setGlide = (t) => {
          const tt = Math.max(0, Math.min(1, t));
          glide.t = tt;
          applyCamera(tt);

          if (glideBar) glideBar.style.width = (tt * 100).toFixed(1) + "%";
          if (glidePct) glidePct.textContent = Math.round(tt * 100) + "%";
          const idx = Math.min(labels.length - 1, Math.floor(tt * labels.length));
          if (glideLabel && idx !== lastLabelIdx) {
            lastLabelIdx = idx;
            glideLabel.textContent = labels[idx];
          }
          const hotspot = tt < 0.3 ? 0 : tt < 0.62 ? 1 : 2;
          if (hotspot !== lastHotspot) {
            lastHotspot = hotspot;
            document.querySelectorAll("[data-hotspot]").forEach((btn) => {
              btn.classList.toggle("is-active", +btn.dataset.hotspot === hotspot);
            });
          }
          if (hintEl) hintEl.style.opacity = String(Math.max(0, 1 - tt * 1.4));
        };

        setGlide(0);

        ScrollTrigger.create({
          trigger: "#mountain",
          start: "top top",
          end: "bottom bottom",
          scrub: 0.55,
          onUpdate: (self) => setGlide(self.progress)
        });

        const hotspotProgress = [0.08, 0.48, 0.92];
        document.querySelectorAll("[data-hotspot]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const target = hotspotProgress[+btn.dataset.hotspot] || 0;
            const section = document.getElementById("mountain");
            const top = section.offsetTop;
            const travel = section.offsetHeight - window.innerHeight;
            const y = top + travel * target;
            if (window.__neveLenis) window.__neveLenis.scrollTo(y, { duration: 1.4 });
            else window.scrollTo({ top: y, behavior: "smooth" });
          });
        });

        if (!isTouch) {
          canvas.addEventListener("pointermove", (e) => {
            const r = canvas.getBoundingClientRect();
            pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
            pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
          });
        }

        const clock = new THREE.Clock();
        const tick = () => {
          const t = clock.getElapsedTime();

          const pos = snowGeo.attributes.position.array;
          for (let i = 0; i < snowCount; i++) {
            pos[i * 3 + 1] -= 0.018 + (i % 4) * 0.004;
            pos[i * 3] += Math.sin(t * 0.7 + i * 0.15) * 0.003;
            pos[i * 3 + 2] += 0.01 + glide.t * 0.035;
            if (pos[i * 3 + 1] < 0.15 || pos[i * 3 + 2] > camera.position.z + 10) {
              pos[i * 3 + 1] = 5 + Math.random() * 7;
              pos[i * 3] = camera.position.x + (Math.random() - 0.5) * 14;
              pos[i * 3 + 2] = camera.position.z - 3 - Math.random() * 20;
            }
          }
          snowGeo.attributes.position.needsUpdate = true;

          skiers.forEach((s) => {
            s.userData.t += s.userData.speed;
            if (s.userData.t > 1) s.userData.t = 0;
            const p = s.userData.t;
            s.position.set(-2.4 + p * 5.8, 1.35 - p * 0.95, s.userData.lane - 1.8);
            s.rotation.y = -0.4;
          });

          applyCamera(glide.t);
          renderer.render(scene, camera);
          animationId = requestAnimationFrame(tick);
        };
        tick();

        window.addEventListener("resize", () => {
          const { clientWidth: cw, clientHeight: ch } = canvas;
          if (!cw || !ch) return;
          camera.aspect = cw / ch;
          camera.updateProjectionMatrix();
          renderer.setSize(cw, ch, false);
        });
      } catch (err) {
        console.warn("WebGL unavailable", err);
        canvas.style.display = "none";
        fallback.style.display = "block";
        if (animationId) cancelAnimationFrame(animationId);
      }
    }

  function initSnowboard() {
    if (!window.gsap || !window.ScrollTrigger || reduceMotion) return;
    if (!document.getElementById("snowboard")) return;
    gsap.from(".mountain-hud", {
      y: 40, autoAlpha: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: "#mountain", start: "top 80%", toggleActions: "play none none none", once: true }
    });
    gsap.from(".hotspot-btn", {
      x: -24, autoAlpha: 0, stagger: 0.1, duration: 0.65, ease: "power3.out",
      scrollTrigger: { trigger: "#mountain", start: "top 75%", toggleActions: "play none none none", once: true }
    });
    gsap.timeline({
      scrollTrigger: { trigger: "#snowboard", start: "top top", end: "bottom bottom", scrub: 0.65 }
    })
      .fromTo(".sb-media-pin img", { scale: 1.14, yPercent: 0 }, { scale: 1, yPercent: -8, ease: "none" }, 0)
      .fromTo(".sb-rider", { yPercent: 18, rotate: -6 }, { yPercent: -42, rotate: 4, ease: "none" }, 0)
      .fromTo(".sb-copy h2", { y: 28 }, { y: 0, ease: "none" }, 0)
      .fromTo(".sb-copy p", { y: 36, opacity: 0.55 }, { y: 0, opacity: 1, ease: "none" }, 0)
      .fromTo(".sb-graphic", { xPercent: 6 }, { xPercent: -12, ease: "none" }, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { initMountain(); initSnowboard(); });
  } else {
    initMountain();
    initSnowboard();
  }
  window.addEventListener("load", () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
})();
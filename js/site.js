(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
  if (isTouch) document.body.classList.add("is-touch");

  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("mobileMenu");

  // Lenis smooth scroll — cuts snappy native wheel feel
  let lenis = null;
  const bootLenis = async () => {
    if (reduceMotion) return null;
    try {
      const mod = await import("https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.mjs");
      const Lenis = mod.default;
      lenis = new Lenis({
        duration: 1.45,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.85,
        touchMultiplier: 1.1,
        syncTouch: false
      });
      if (window.gsap) {
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        if (window.ScrollTrigger) {
          lenis.on("scroll", ScrollTrigger.update);
        }
      } else {
        const raf = (time) => {
          lenis.raf(time);
          requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
      }
      window.__neveLenis = lenis;
      return lenis;
    } catch (err) {
      console.warn("Lenis unavailable", err);
      return null;
    }
  };
  const lenisReady = bootLenis();

  const onScrollNav = () => {
    if (!nav) return;
    const y = (window.__neveLenis && window.__neveLenis.scroll) || window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
  };
  window.addEventListener("scroll", onScrollNav, { passive: true });
  lenisReady.then((instance) => {
    if (instance) instance.on("scroll", onScrollNav);
  });
  onScrollNav();

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    });
    menu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        menu.classList.remove("is-open");
        toggle.classList.remove("is-open");
        document.body.style.overflow = "";
      });
    });
  }

  // Active nav link
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const href = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
    if (href && href === page) a.classList.add("is-active");
    if ((page === "" || page === "index.html") && (href === "index.html" || href === "./")) a.classList.add("is-active");
  });

  // Custom cursor
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  if (!isTouch && dot && ring) {
    let x = 0, y = 0, rx = 0, ry = 0;
    window.addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.querySelectorAll("[data-cursor], a, button").forEach((el) => {
      el.addEventListener("pointerenter", () => document.body.classList.add("is-hovering"));
      el.addEventListener("pointerleave", () => document.body.classList.remove("is-hovering"));
    });
  }

  // Enquiry / contact forms
  document.querySelectorAll("[data-enquiry-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = form.parentElement.querySelector(".enquiry-msg") || form.querySelector(".enquiry-msg");
      if (msg) {
        msg.textContent = "Thanks — a NÉVÉ advisor will reply with sample ideas shortly.";
        msg.classList.add("is-visible");
      }
      form.reset();
    });
  });

  const newsletter = document.getElementById("newsletterForm");
  if (newsletter) {
    newsletter.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = document.getElementById("newsletterMsg");
      if (msg) {
        msg.textContent = "You're on the powder list.";
        msg.classList.add("is-visible");
      }
      newsletter.reset();
    });
  }

  // FAQ
  document.querySelectorAll(".faq-item button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const open = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  // Light page reveals — visible by default; GSAP only enhances entrance
  const reveals = document.querySelectorAll(".reveal-up");
  if (reveals.length) {
    if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
      reveals.forEach((el) => el.classList.add("is-in"));
    } else {
      gsap.registerPlugin(ScrollTrigger);
      reveals.forEach((el) => {
        gsap.fromTo(el,
          { y: 24, autoAlpha: 0 },
          {
            y: 0, autoAlpha: 1, duration: 0.75, ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: el,
              start: "top 93%",
              toggleActions: "play none none none",
              once: true,
              onEnter: () => el.classList.add("is-in")
            }
          }
        );
      });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }

  // Hero snow if canvas present
  const snowCanvas = document.getElementById("snow-canvas");
  if (snowCanvas && snowCanvas.getContext) {
    const ctx = snowCanvas.getContext("2d");
    const flakes = Array.from({ length: isTouch ? 35 : 70 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + 0.6, s: Math.random() * 0.35 + 0.15
    }));
    const resize = () => {
      snowCanvas.width = snowCanvas.clientWidth;
      snowCanvas.height = snowCanvas.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      const w = snowCanvas.width, h = snowCanvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      flakes.forEach((f) => {
        f.y += f.s * 0.004;
        f.x += Math.sin(f.y * 8 + f.r) * 0.0008;
        if (f.y > 1) { f.y = 0; f.x = Math.random(); }
        ctx.beginPath();
        ctx.arc(f.x * w, f.y * h, f.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    draw();
  }

  // Simple gallery thumbs on destinations page
  document.querySelectorAll("[data-gallery]").forEach((gal) => {
    const imgs = [...gal.querySelectorAll("[data-gallery-img]")];
    gal.querySelectorAll("[data-thumb]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = +btn.dataset.thumb;
        imgs.forEach((img, idx) => img.classList.toggle("is-hidden", idx !== i));
        gal.querySelectorAll("[data-thumb]").forEach((b) => b.classList.toggle("is-active", b === btn));
      });
    });
  });

  // Why manifesto — image stage follows active reason
  const whyList = document.getElementById("whyManifestoList");
  const whyImg = document.getElementById("whyStageImg");
  const whyCaption = document.getElementById("whyStageCaption");
  const whyStage = whyImg && whyImg.closest(".why-manifesto-stage");
  if (whyList && whyImg) {
    const items = [...whyList.querySelectorAll(".why-manifesto-item")];
    const activate = (item) => {
      items.forEach((el) => el.classList.toggle("is-active", el === item));
      const nextSrc = item.dataset.whyImg;
      const nextCaption = item.dataset.whyCaption || "";
      if (!nextSrc || whyImg.getAttribute("src") === nextSrc) {
        if (whyCaption) whyCaption.textContent = nextCaption;
        return;
      }
      if (whyStage) whyStage.classList.add("is-swapping");
      window.setTimeout(() => {
        whyImg.setAttribute("src", nextSrc);
        if (whyCaption) whyCaption.textContent = nextCaption;
        if (whyStage) whyStage.classList.remove("is-swapping");
      }, 220);
    };
    items.forEach((item) => {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.addEventListener("pointerenter", () => activate(item));
      item.addEventListener("focus", () => activate(item));
      item.addEventListener("click", () => activate(item));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(item);
        }
      });
    });
  }

  // Journal horizontal scroll — pin + scrub on desktop, native snap on touch
  const journalSection = document.getElementById("journal");
  const journalTrack = document.getElementById("journalTrack");
  const journalWrap = journalSection && journalSection.querySelector(".journal-track-wrap");
  const journalBar = document.getElementById("journalBar");
  if (journalSection && journalTrack && journalWrap) {
    const useNative = reduceMotion || isTouch || window.innerWidth <= 900;
    if (useNative) {
      journalWrap.classList.add("is-native-scroll");
      const syncBar = () => {
        if (!journalBar) return;
        const max = journalWrap.scrollWidth - journalWrap.clientWidth;
        const pct = max > 0 ? (journalWrap.scrollLeft / max) * 100 : 0;
        journalBar.style.width = `${pct}%`;
      };
      journalWrap.addEventListener("scroll", syncBar, { passive: true });
      syncBar();
    } else if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      const getTravel = () => Math.max(0, journalTrack.scrollWidth - journalWrap.clientWidth);
      gsap.fromTo(journalTrack, { x: 0 }, {
        x: () => -getTravel(),
        ease: "none",
        scrollTrigger: {
          trigger: journalSection,
          start: "top top",
          end: () => `+=${Math.max(window.innerHeight * 0.85, getTravel() * 0.95)}`,
          pin: true,
          scrub: 0.75,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (journalBar) journalBar.style.width = `${self.progress * 100}%`;
          }
        }
      });
      gsap.fromTo(".journal-card",
        { y: 28, autoAlpha: 0 },
        {
          y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: "power3.out",
          immediateRender: false,
          scrollTrigger: { trigger: journalSection, start: "top 70%", toggleActions: "play none none none", once: true }
        }
      );
    }
  }

  // Guest voices — swap quote + mountain stage
  const voicesRoot = document.querySelector("[data-voices]");
  if (voicesRoot) {
    const items = [...voicesRoot.querySelectorAll(".voices-item")];
    const stage = document.getElementById("voicesStage");
    const img = document.getElementById("voicesStageImg");
    const quoteText = document.getElementById("voicesQuoteText");
    const cite = document.getElementById("voicesCite");
    const activate = (item) => {
      items.forEach((el) => {
        const on = el === item;
        el.classList.toggle("is-active", on);
        el.setAttribute("aria-selected", on ? "true" : "false");
      });
      const nextQuote = item.dataset.voiceQuote || "";
      const nextCite = item.dataset.voiceCite || "";
      const nextSrc = item.dataset.voiceImg || "";
      const nextAlt = item.dataset.voiceAlt || "";
      if (stage) stage.classList.add("is-swapping");
      window.setTimeout(() => {
        if (quoteText) quoteText.textContent = nextQuote;
        if (cite) cite.textContent = nextCite;
        if (img && nextSrc) {
          img.setAttribute("src", nextSrc);
          img.setAttribute("alt", nextAlt);
        }
        if (stage) stage.classList.remove("is-swapping");
      }, 180);
    };
    items.forEach((item) => {
      item.addEventListener("pointerenter", () => {
        if (!isTouch) activate(item);
      });
      item.addEventListener("focus", () => activate(item));
      item.addEventListener("click", () => activate(item));
    });
  }

  // Immersive gallery — scroll-linked parallax + staggered tile reveals
  const galleryGrid = document.querySelector(".gallery-page-grid");
  if (galleryGrid && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const tiles = gsap.utils.toArray(".gallery-tile");
    if (reduceMotion) {
      gsap.set(tiles, { clearProps: "all" });
    } else {
      tiles.forEach((tile, i) => {
        const img = tile.querySelector(".gallery-tile-media img");
        const meta = tile.querySelector(".gallery-tile-meta");
        const fromX = i % 3 === 0 ? -36 : i % 3 === 1 ? 0 : 36;
        gsap.fromTo(tile,
          { y: 40, x: fromX, autoAlpha: 0 },
          {
            y: 0,
            x: 0,
            autoAlpha: 1,
            duration: 0.9,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: tile,
              start: "top 92%",
              toggleActions: "play none none none",
              once: true
            }
          }
        );
        if (meta) {
          gsap.fromTo(meta,
            { y: 14, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.65,
              delay: 0.1,
              ease: "power2.out",
              immediateRender: false,
              scrollTrigger: {
                trigger: tile,
                start: "top 88%",
                toggleActions: "play none none none",
                once: true
              }
            }
          );
        }
        if (img) {
          gsap.fromTo(img,
            { yPercent: -14, scale: 1.16 },
            {
              yPercent: 10,
              scale: 1.05,
              ease: "none",
              scrollTrigger: {
                trigger: tile,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.9
              }
            }
          );
        }
      });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }

  // —— Satellite pages only (index keeps its own inline timeline) ——
  const isSatellite = !document.body.classList.contains("is-home") && !document.getElementById("hero");
  if (isSatellite && window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);

    // Scroll progress bar
    const progressEl = document.querySelector(".scroll-progress");
    if (progressEl) {
      gsap.to(progressEl, {
        scaleX: 1,
        ease: "none",
        transformOrigin: "0% 50%",
        scrollTrigger: { scrub: 0.15 }
      });
      gsap.set(progressEl, { scaleX: 0 });
    }

    // Page hero entrance + parallax
    const pageHero = document.querySelector(".page-hero");
    if (pageHero) {
      const heroBg = pageHero.querySelector(".page-hero-bg img");
      const heroContent = pageHero.querySelector(".page-hero-content");
      const heroKids = heroContent
        ? [...heroContent.children]
        : [];
      gsap.set(heroKids, { y: 36, autoAlpha: 0 });
      gsap.to(heroKids, {
        y: 0,
        autoAlpha: 1,
        duration: 0.95,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.08
      });
      if (heroBg) {
        gsap.fromTo(heroBg,
          { scale: 1.14, y: 0 },
          {
            scale: 1,
            y: 48,
            ease: "none",
            scrollTrigger: {
              trigger: pageHero,
              start: "top top",
              end: "bottom top",
              scrub: 0.8
            }
          }
        );
      }
    }

    // Section heads
    gsap.utils.toArray(".page-section-head, .journal-header").forEach((head) => {
      gsap.fromTo(head.children,
        { y: 22, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: head,
            start: "top 88%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
    });

    // Package cards stagger
    const pkgCards = gsap.utils.toArray(".pkg-card");
    if (pkgCards.length) {
      gsap.fromTo(pkgCards,
        { y: 40, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.85,
          stagger: 0.1,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: pkgCards[0].parentElement,
            start: "top 90%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
    }

    // Steps / FAQ / form panels
    gsap.utils.toArray(".step, .faq-item, .contact-card, .enquiry-card, .contact-panel, .enquire-panel").forEach((el, i) => {
      gsap.fromTo(el,
        { y: 28, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.7,
          delay: (i % 6) * 0.04,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
    });

    // Why manifesto stage + list
    const whyShell = document.querySelector(".why-manifesto-shell");
    if (whyShell) {
      const stage = whyShell.querySelector(".why-manifesto-stage");
      if (stage) {
        gsap.fromTo(stage,
          { x: -40, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 1,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: whyShell,
              start: "top 80%",
              toggleActions: "play none none none",
              once: true
            }
          }
        );
      }
    }

    // Awards marquee soft fade-in
    const awards = document.querySelector(".awards-marquee");
    if (awards) {
      gsap.fromTo(awards,
        { autoAlpha: 0, y: 16 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: awards,
            start: "top 92%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
    }

    // Voices stage
    const voices = document.querySelector(".voices-section");
    if (voices) {
      gsap.fromTo(voices.querySelectorAll(".voices-layout > *"),
        { y: 30, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.85,
          stagger: 0.12,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: voices,
            start: "top 82%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
    }

    // Footer columns
    const footerCols = document.querySelectorAll(".footer-standalone .footer-grid > *");
    if (footerCols.length) {
      gsap.fromTo(footerCols,
        { y: 20, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.65,
          stagger: 0.08,
          ease: "power2.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: ".footer-standalone",
            start: "top 92%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
    }

    requestAnimationFrame(() => ScrollTrigger.refresh());
  }
})();

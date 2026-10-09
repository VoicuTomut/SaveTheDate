/* ==========================================================================
   Save the Date — Andrei & Camila
   Envelope · language · music · smooth scroll · parallax · countdown ·
   butterflies · reveals · videos · carousel · calendar
   ========================================================================== */
(function () {
  "use strict";

  var WEDDING_UTC = Date.UTC(2027, 4, 16, 9, 0, 0); // 16 May 2027, 12:00 Bucharest (UTC+3)
  var LANGS = ["ro", "en", "es"];
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var portrait = window.matchMedia("(orientation: portrait)").matches;
  var currentLang = "ro";
  var lenis = null;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function t(key) {
    var dict = window.I18N[currentLang] || window.I18N.ro;
    return dict[key] !== undefined ? dict[key] : window.I18N.ro[key];
  }

  /* ------------------------------------------------------------------
     Language
     ------------------------------------------------------------------ */
  function detectLang() {
    var param = new URLSearchParams(location.search).get("lang");
    if (param && LANGS.indexOf(param) > -1) return param;
    var saved = store("std-lang");
    if (saved && LANGS.indexOf(saved) > -1) return saved;
    var nav = (navigator.languages || [navigator.language || "ro"]).map(function (l) { return l.toLowerCase(); });
    for (var i = 0; i < nav.length; i++) {
      if (nav[i].indexOf("ro") === 0) return "ro";
      if (nav[i].indexOf("es") === 0) return "es";
      if (nav[i].indexOf("en") === 0) return "en";
    }
    return "en";
  }

  function applyLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.title = t("meta.title");

    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    $$(".lang__btn").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });

    updateCalendarLinks();
    store("std-lang", lang);
  }

  function initLang() {
    $$(".lang__btn").forEach(function (btn) {
      btn.addEventListener("click", function () { applyLang(btn.dataset.lang); });
    });
    applyLang(detectLang());
  }

  /* ------------------------------------------------------------------
     Split names into letters
     ------------------------------------------------------------------ */
  function splitLetters() {
    var offset = 0;
    $$("[data-split]").forEach(function (el) {
      var text = el.textContent;
      el.textContent = "";
      el.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(text, function (ch) {
        var span = document.createElement("span");
        span.className = "char";
        span.textContent = ch;
        span.style.setProperty("--i", offset++);
        el.appendChild(span);
      });
      offset += 4; // breathe for the "&"
    });
  }

  /* ------------------------------------------------------------------
     Smooth scrolling (Lenis) — falls back to native scrolling
     ------------------------------------------------------------------ */
  var scrollListeners = [];

  function onScroll(fn) { scrollListeners.push(fn); }

  function emitScroll() {
    for (var i = 0; i < scrollListeners.length; i++) scrollListeners[i]();
  }

  function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function initSmoothScroll() {
    if (!reducedMotion && window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.07, wheelMultiplier: 0.9, smoothWheel: true });
      lenis.on("scroll", emitScroll);
      lenis.stop(); // locked until the envelope opens
      requestAnimationFrame(function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      });
    } else {
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { emitScroll(); ticking = false; });
      }, { passive: true });
    }

    $$("[data-scroll-to]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var target = $(link.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { duration: 2.4, easing: easeInOutCubic });
        else target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      });
    });
  }

  /* ------------------------------------------------------------------
     Parallax
     ------------------------------------------------------------------ */
  function initParallax() {
    if (reducedMotion) return;
    var items = $$("[data-parallax]").map(function (el) {
      return { el: el, speed: parseFloat(el.dataset.parallax) || 0, y: 0 };
    });
    var vh = window.innerHeight;
    window.addEventListener("resize", function () { vh = window.innerHeight; });

    function update() {
      items.forEach(function (it) {
        var rect = it.el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        var center = rect.top + rect.height / 2 - it.y;
        it.y = (center - vh / 2) * -it.speed;
        it.el.style.translate = "0 " + it.y.toFixed(1) + "px";
      });
    }

    onScroll(update);
    update();
  }

  /* ------------------------------------------------------------------
     Videos — right source for the screen, play only while visible
     ------------------------------------------------------------------ */
  function pickSource(video) {
    if (!video.dataset.srcLandscape) return;
    if (portrait && video.dataset.posterPortrait) video.poster = video.dataset.posterPortrait;
    video.src = portrait ? video.dataset.srcPortrait : video.dataset.srcLandscape;
  }

  function safePlay(video) {
    if (!video || reducedMotion) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ });
  }

  function initVideos() {
    var hero = $("#hero-video");
    pickSource(hero);
    hero.load();

    var auto = $$("video[data-autoplay]");
    auto.forEach(pickSource);
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          if (v.preload === "none") { v.preload = "auto"; v.load(); }
          safePlay(v);
        } else {
          v.pause();
        }
      });
    }, { rootMargin: "200px 0px" });
    auto.forEach(function (v) { io.observe(v); });

    // pause the hero when it scrolls away (saves battery)
    new IntersectionObserver(function (entries) {
      if (!document.body.classList.contains("is-revealed")) return;
      if (entries[0].isIntersecting) safePlay(hero); else hero.pause();
    }).observe(hero);
  }

  /* ------------------------------------------------------------------
     Music — starts with the envelope tap, fades in, can be muted
     ------------------------------------------------------------------ */
  var music = { audio: null, btn: null, available: false, fadeTimer: null };

  function fadeVolume(to, ms, done) {
    var a = music.audio;
    clearInterval(music.fadeTimer);
    var from = a.volume;
    var start = performance.now();
    music.fadeTimer = setInterval(function () {
      var k = Math.min(1, (performance.now() - start) / ms);
      a.volume = from + (to - from) * easeInOutCubic(k);
      if (k >= 1) { clearInterval(music.fadeTimer); if (done) done(); }
    }, 30);
  }

  function setPlaying(on) {
    var a = music.audio;
    music.btn.classList.toggle("is-playing", on);
    music.btn.setAttribute("aria-pressed", String(on));
    if (on) {
      a.volume = 0;
      var p = a.play();
      if (p && p.catch) p.catch(function () { music.btn.classList.remove("is-playing"); });
      fadeVolume(0.55, 2500);
    } else {
      fadeVolume(0, 700, function () { a.pause(); });
    }
    store("std-music", on ? "on" : "off");
  }

  function initMusic() {
    music.audio = $("#music");
    music.btn = $("#music-btn");
    // only show the control if a song file is present
    fetch(music.audio.getAttribute("src"), { method: "HEAD" }).then(function (r) {
      music.available = r.ok;
      if (r.ok) music.btn.hidden = false;
    }).catch(function () { /* no song yet */ });

    music.btn.addEventListener("click", function () {
      setPlaying(!music.btn.classList.contains("is-playing"));
    });
  }

  function startMusic() {
    if (!music.available) return;
    music.btn.classList.add("is-shown");
    if (store("std-music") !== "off") setPlaying(true);
  }

  /* ------------------------------------------------------------------
     Butterflies — a few delicate wanderers
     ------------------------------------------------------------------ */
  var BUTTERFLY_SVG =
    '<svg viewBox="-20 -16 40 32">' +
    '<g class="butterfly__wing">' +
    '<path d="M-1 -1C-6 -13 -19 -15 -18 -6c1 5 9 6 17 5z"/>' +
    '<path d="M-1 1c-7 1 -13 7 -10 11 3 3 8 -3 10 -11z"/>' +
    '<path class="butterfly__vein" d="M-2 -2C-7 -8 -12 -10 -15 -7M-2 2c-3 3 -6 5 -8 8"/>' +
    "</g>" +
    '<g class="butterfly__wing">' +
    '<path d="M1 -1C6 -13 19 -15 18 -6c-1 5 -9 6 -17 5z"/>' +
    '<path d="M1 1c7 1 13 7 10 11 -3 3 -8 -3 -10 -11z"/>' +
    '<path class="butterfly__vein" d="M2 -2C7 -8 12 -10 15 -7M2 2c3 3 6 5 8 8"/>' +
    "</g>" +
    '<ellipse class="butterfly__body" cx="0" cy="0" rx="1.1" ry="7"/>' +
    '<path class="butterfly__vein" d="M0 -6c-1 -3 -3 -5 -4 -6M0 -6c1 -3 3 -5 4 -6"/>' +
    "</svg>";

  function Butterfly(container, seed) {
    this.el = document.createElement("div");
    this.el.className = "butterfly";
    this.el.innerHTML = BUTTERFLY_SVG;
    container.appendChild(this.el);
    this.box = container;
    this.t = seed * 100;
    this.speed = 0.0016 + Math.random() * 0.0008;
    this.seed = seed;
    this.running = false;
    this.loop = this.loop.bind(this);
    this.prev = null;
  }

  // smooth wandering path from layered sines (no jitter)
  Butterfly.prototype.pos = function (t) {
    var w = this.box.clientWidth;
    var h = this.box.clientHeight;
    var s = this.seed;
    return {
      x: w * (0.5 + 0.38 * Math.sin(t * 0.9 + s) + 0.08 * Math.sin(t * 2.3 + s * 2)),
      y: h * (0.42 + 0.28 * Math.sin(t * 0.7 + s * 3) + 0.06 * Math.cos(t * 3.1 + s)),
    };
  };

  Butterfly.prototype.loop = function () {
    if (!this.running) return;
    this.t += this.speed * 16;
    var p = this.pos(this.t);
    var ahead = this.pos(this.t + 0.05);
    var angle = Math.atan2(ahead.y - p.y, ahead.x - p.x) * 57.3 + 90;
    var gliding = Math.sin(this.t * 1.7 + this.seed) > 0.75;
    this.el.classList.toggle("is-gliding", gliding);
    this.el.style.transform = "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px) rotate(" + angle.toFixed(1) + "deg)";
    requestAnimationFrame(this.loop);
  };

  Butterfly.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  };

  Butterfly.prototype.stop = function () { this.running = false; };

  function initButterflies() {
    if (reducedMotion) return;
    $$("[data-butterflies]").forEach(function (box) {
      var flock = [];
      var n = parseInt(box.dataset.butterflies, 10) || 1;
      for (var i = 0; i < n; i++) flock.push(new Butterfly(box, 1.3 + i * 2.1));
      new IntersectionObserver(function (entries) {
        flock.forEach(function (b) { if (entries[0].isIntersecting) b.start(); else b.stop(); });
      }).observe(box);
    });
  }

  /* ------------------------------------------------------------------
     Envelope — paper curtains part onto the film
     ------------------------------------------------------------------ */
  function initEnvelope() {
    var env = $("#envelope");
    var seal = $("#seal");
    var opened = false;

    function open() {
      if (opened) return;
      opened = true;
      var k = reducedMotion ? 0.05 : 1;

      safePlay($("#hero-video")); // the film is already rolling underneath
      startMusic();
      env.classList.add("is-opening");

      setTimeout(function () {
        document.body.classList.remove("is-locked");
        document.body.classList.add("is-revealed");
        if (lenis) lenis.start();
      }, 900 * k);

      setTimeout(function () {
        env.remove();
        $("#top").setAttribute("tabindex", "-1");
        $("#top").focus({ preventScroll: true });
      }, 3000 * k);
    }

    seal.addEventListener("click", open);
    env.addEventListener("click", open);
  }

  /* ------------------------------------------------------------------
     Countdown
     ------------------------------------------------------------------ */
  function initCountdown() {
    var nums = {};
    $$(".countdown__num").forEach(function (el) { nums[el.dataset.unit] = el; });
    var timer;

    function pad(n, len) {
      n = String(n);
      while (n.length < len) n = "0" + n;
      return n;
    }

    function set(unit, value) {
      var el = nums[unit];
      if (el.textContent === value) return;
      el.textContent = value;
      if (!reducedMotion) {
        el.classList.remove("tick");
        void el.offsetWidth;
        el.classList.add("tick");
      }
    }

    function update() {
      var diff = WEDDING_UTC - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        $("#countdown").hidden = true;
        $("#countdown-done").hidden = false;
        return;
      }
      var s = Math.floor(diff / 1000);
      set("days", pad(Math.floor(s / 86400), 3));
      set("hours", pad(Math.floor((s % 86400) / 3600), 2));
      set("minutes", pad(Math.floor((s % 3600) / 60), 2));
      set("seconds", pad(s % 60, 2));
    }

    update();
    timer = setInterval(update, 1000);
  }

  /* ------------------------------------------------------------------
     Scroll reveals
     ------------------------------------------------------------------ */
  function initReveals() {
    var targets = $$(".reveal, .corner");

    $$(".reveal").forEach(function (el) {
      var siblings = $$(":scope > .reveal", el.parentElement);
      el.style.setProperty("--stagger", Math.min(siblings.indexOf(el), 5));
      el.addEventListener("transitionend", function clear(e) {
        if (e.target !== el || e.propertyName !== "opacity") return;
        el.style.setProperty("--stagger", 0);
        el.removeEventListener("transitionend", clear);
      });
    });

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     Carousel — infinite, centre mode, swipe / drag / arrows / dots
     ------------------------------------------------------------------ */
  function initCarousel() {
    var root = $("#carousel");
    if (!root) return;
    var slides = $$(".carousel__slide", root);
    var dotsBox = $(".carousel__dots", root);
    var n = slides.length;
    var active = 0;
    var prevOffsets = [];
    var timer = null;
    var visible = false;
    var INTERVAL = 5200;

    var dots = slides.map(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "carousel__dot";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", String(i + 1));
      b.addEventListener("click", function () { go(i); restart(); });
      dotsBox.appendChild(b);
      return b;
    });

    function offsetOf(i) {
      var o = (i - active) % n;
      if (o > n / 2) o -= n;
      if (o < -n / 2) o += n;
      return o;
    }

    function render() {
      slides.forEach(function (s, i) {
        var o = offsetOf(i);
        // a slide that wraps around the back moves instantly while hidden
        var jumped = prevOffsets[i] !== undefined && Math.abs(o - prevOffsets[i]) > 1;
        s.classList.toggle("no-anim", jumped);
        s.style.setProperty("--o", o);
        s.classList.toggle("is-active", o === 0);
        s.classList.toggle("is-far", Math.abs(o) > 1);
        s.setAttribute("aria-hidden", String(o !== 0));
        prevOffsets[i] = o;

        var v = $("video", s);
        if (v) {
          if (o === 0 && visible) {
            if (v.preload === "none") { v.preload = "auto"; v.load(); }
            safePlay(v);
          } else {
            v.pause();
          }
        }
        // warm up neighbours' images
        if (Math.abs(o) <= 2) { var img = $("img", s); if (img) img.loading = "eager"; }
      });
      dots.forEach(function (d, i) { d.setAttribute("aria-selected", String(i === active)); });
      requestAnimationFrame(function () {
        slides.forEach(function (s) { s.classList.remove("no-anim"); });
      });
    }

    function go(i) {
      active = ((i % n) + n) % n;
      render();
    }

    function next() { go(active + 1); }

    function restart() {
      clearInterval(timer);
      if (visible && !reducedMotion) timer = setInterval(next, INTERVAL);
    }

    $$(".carousel__arrow", root).forEach(function (btn) {
      btn.addEventListener("click", function () { go(active + parseInt(btn.dataset.dir, 10)); restart(); });
    });

    // drag / swipe
    var viewport = $(".carousel__viewport", root);
    var startX = null;
    var dx = 0;
    var pointerId = null;

    viewport.addEventListener("pointerdown", function (e) {
      startX = e.clientX;
      dx = 0;
      pointerId = e.pointerId;
      root.classList.add("is-dragging");
      clearInterval(timer);
    });

    window.addEventListener("pointermove", function (e) {
      if (startX === null || e.pointerId !== pointerId) return;
      dx = e.clientX - startX;
      root.style.setProperty("--drag", dx + "px");
    });

    function endDrag() {
      if (startX === null) return;
      root.classList.remove("is-dragging");
      root.style.setProperty("--drag", "0px");
      var threshold = Math.min(80, viewport.clientWidth * 0.12);
      if (dx < -threshold) next();
      else if (dx > threshold) go(active - 1);
      startX = null;
      restart();
    }

    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { next(); restart(); }
      if (e.key === "ArrowLeft") { go(active - 1); restart(); }
    });

    root.addEventListener("mouseenter", function () { clearInterval(timer); });
    root.addEventListener("mouseleave", restart);

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      render();
      restart();
    }, { threshold: 0.3 }).observe(root);

    render();
  }

  /* ------------------------------------------------------------------
     Calendar
     ------------------------------------------------------------------ */
  var CAL = {
    start: "20270516T090000Z",
    end: "20270516T210000Z",
    location: "Catedrala Mică, Târgu Mureș, Romania",
  };

  function updateCalendarLinks() {
    var g = $("#cal-google");
    if (!g) return;
    g.href =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(t("cal.event")) +
      "&dates=" + CAL.start + "/" + CAL.end +
      "&details=" + encodeURIComponent(t("cal.details")) +
      "&location=" + encodeURIComponent(CAL.location);
  }

  function icsEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function downloadIcs() {
    var ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Andrei & Camila//Save the Date//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:andrei-camila-20270516@savethedate",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""),
      "DTSTART:" + CAL.start,
      "DTEND:" + CAL.end,
      "SUMMARY:" + icsEscape(t("cal.event")),
      "DESCRIPTION:" + icsEscape(t("cal.details")),
      "LOCATION:" + icsEscape(CAL.location),
      "BEGIN:VALARM",
      "TRIGGER:-P7D",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + icsEscape(t("cal.event")),
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "andrei-camila-16-05-2027.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function initCalendar() {
    var btn = $("#cal-ics");
    if (btn) btn.addEventListener("click", downloadIcs);
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  splitLetters();
  initLang();
  initSmoothScroll();
  initVideos();
  initMusic();
  initEnvelope();
  initButterflies();
  initCountdown();
  initReveals();
  initParallax();
  initCarousel();
  initCalendar();
})();

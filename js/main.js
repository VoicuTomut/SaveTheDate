/* ==========================================================================
   Save the Date — Andrei & Camila
   Envelope · language · countdown · particles · reveals · route · calendar · gallery
   ========================================================================== */
(function () {
  "use strict";

  var WEDDING_UTC = Date.UTC(2027, 4, 16, 9, 0, 0); // 16 May 2027, 12:00 Bucharest (UTC+3)
  var LANGS = ["ro", "en", "es"];
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var currentLang = "ro";

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
      offset += 3; // pause for the "&"
    });
  }

  /* ------------------------------------------------------------------
     Hero video (landscape / portrait source)
     ------------------------------------------------------------------ */
  var heroVideo = $("#hero-video");

  function loadVideo() {
    if (!heroVideo) return;
    var portrait = window.matchMedia("(orientation: portrait)").matches;
    if (portrait) heroVideo.poster = heroVideo.dataset.posterPortrait;
    heroVideo.src = portrait ? heroVideo.dataset.srcPortrait : heroVideo.dataset.srcLandscape;
    heroVideo.load();
  }

  function playVideo() {
    if (!heroVideo || reducedMotion) return;
    var p = heroVideo.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ });
  }

  /* ------------------------------------------------------------------
     Envelope
     ------------------------------------------------------------------ */
  function initEnvelope() {
    var screen = $("#envelope");
    var card = $("#envelope-card");
    var seal = $("#seal");
    var opened = false;

    function reveal() {
      document.body.classList.remove("is-locked");
      document.body.classList.add("is-revealed");
      playVideo();
      $("#top").setAttribute("tabindex", "-1");
      $("#top").focus({ preventScroll: true });
    }

    function open() {
      if (opened) return;
      opened = true;
      var k = reducedMotion ? 0.1 : 1;
      card.classList.add("is-open");
      setTimeout(function () { card.classList.add("is-leaving"); }, 2000 * k);
      setTimeout(function () {
        screen.classList.add("is-gone");
        reveal();
      }, 2500 * k);
      setTimeout(function () { screen.remove(); }, 3600 * k);
    }

    seal.addEventListener("click", open);
    card.addEventListener("click", open);
    seal.focus({ preventScroll: true });
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
        void el.offsetWidth; // restart animation
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
     Particles — drifting light over the sea
     ------------------------------------------------------------------ */
  function Particles(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.running = false;
    this.items = [];
    var css = getComputedStyle(document.documentElement);
    this.colors = ["--particle-1", "--particle-2", "--particle-3"].map(function (v) {
      return css.getPropertyValue(v).trim();
    });
    this.resize();
    this.loop = this.loop.bind(this);
  }

  Particles.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round(Math.min(70, (this.w * this.h) / 16000));
    this.items = [];
    for (var i = 0; i < count; i++) this.items.push(this.spawn(true));
  };

  Particles.prototype.spawn = function (anywhere) {
    return {
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : this.h + 10,
      r: 0.6 + Math.random() * 2.2,
      vy: 0.15 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      sway: 0.3 + Math.random() * 0.8,
      twinkle: 0.01 + Math.random() * 0.03,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
    };
  };

  Particles.prototype.loop = function () {
    if (!this.running) return;
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    for (var i = 0; i < this.items.length; i++) {
      var p = this.items[i];
      p.phase += p.twinkle;
      p.y -= p.vy;
      p.x += Math.sin(p.phase) * p.sway * 0.3;
      if (p.y < -10) this.items[i] = p = this.spawn(false);
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(p.phase));
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.r * 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(this.loop);
  };

  Particles.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  };

  Particles.prototype.stop = function () { this.running = false; };

  function initParticles() {
    if (reducedMotion) return;
    var systems = $$("canvas[data-particles]").map(function (c) { return new Particles(c); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var sys = systems.filter(function (s) { return s.canvas === entry.target; })[0];
        if (!sys) return;
        if (entry.isIntersecting) sys.start(); else sys.stop();
      });
    });
    systems.forEach(function (s) { io.observe(s.canvas); });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        systems.forEach(function (s) { if (s.canvas.isConnected) s.resize(); });
      }, 200);
    });
  }

  /* ------------------------------------------------------------------
     Scroll reveals
     ------------------------------------------------------------------ */
  function initReveals() {
    var targets = $$(".reveal, .route, .rings");

    $$(".reveal").forEach(function (el) {
      var siblings = $$(":scope > .reveal", el.parentElement);
      var i = siblings.indexOf(el);
      var step = el.classList.contains("gallery__item") ? i % 3 : Math.min(i, 5);
      el.style.setProperty("--stagger", step);
    });

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        if (entry.target.id === "route") startRouteHeart();
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     Route heart — travels Santa Cruz ↔ Târgu Mureș
     ------------------------------------------------------------------ */
  var routeStarted = false;

  function startRouteHeart() {
    var path = $("#route-path");
    var heart = $("#route-heart");
    if (!path || !heart || routeStarted) return;
    routeStarted = true;
    var len = path.getTotalLength();

    function place(progress) {
      var pt = path.getPointAtLength(progress * len);
      var ahead = path.getPointAtLength(Math.min(len, progress * len + 1));
      var angle = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 0.15; // slight tilt
      heart.setAttribute("transform", "translate(" + pt.x + " " + (pt.y - 2) + ") rotate(" + angle * 57.3 + ")");
    }

    if (reducedMotion) { place(1); return; }

    var duration = 4200;
    var pause = 1400;
    var cycle = (duration + pause) * 2;
    var start = null;

    function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

    place(0);
    setTimeout(function () {
      requestAnimationFrame(function frame(now) {
        if (start === null) start = now;
        var tt = (now - start) % cycle;
        var p;
        if (tt < duration) p = ease(tt / duration);
        else if (tt < duration + pause) p = 1;
        else if (tt < duration * 2 + pause) p = 1 - ease((tt - duration - pause) / duration);
        else p = 0;
        place(p);
        requestAnimationFrame(frame);
      });
    }, 2600);
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
     Gallery lightbox
     ------------------------------------------------------------------ */
  function initLightbox() {
    var box = $("#lightbox");
    var img = $(".lightbox__img", box);
    var items = $$(".gallery__item");
    var index = 0;
    var lastFocus = null;
    var touchX = null;

    function show(i) {
      index = (i + items.length) % items.length;
      var item = items[index];
      img.src = item.dataset.full;
      img.alt = $("img", item).alt;
      img.style.animation = "none";
      void img.offsetWidth;
      img.style.animation = "";
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.style.overflow = "hidden";
      $(".lightbox__close", box).focus();
    }

    function close() {
      box.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }

    items.forEach(function (item, i) {
      item.addEventListener("click", function () { open(i); });
    });

    $(".lightbox__close", box).addEventListener("click", close);
    $(".lightbox__prev", box).addEventListener("click", function () { show(index - 1); });
    $(".lightbox__next", box).addEventListener("click", function () { show(index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });

    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });

    box.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  splitLetters();
  initLang();
  loadVideo();
  initEnvelope();
  initCountdown();
  initParticles();
  initReveals();
  initCalendar();
  initLightbox();
})();

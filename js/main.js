/* ==========================================================================
   Save the Date — Andrei & Camila
   Envelope · language · music · smooth scroll · parallax · countdown ·
   reveals · videos · calendar · photo QR codes
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
          if (!(v.hasAttribute("data-once") && v.ended)) safePlay(v);
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

  function setPlaying(on, remember) {
    var a = music.audio;
    music.btn.classList.toggle("is-playing", on);
    music.btn.setAttribute("aria-pressed", String(on));
    clearInterval(music.fadeTimer);
    if (on) {
      a.muted = false;
      a.volume = 0;
      var p = a.play();
      if (p && p.catch) p.catch(function () {
        music.btn.classList.remove("is-playing");
        music.btn.setAttribute("aria-pressed", "false");
      });
      fadeVolume(0.55, 2500); // on iPhone the volume is fixed by the system; the song simply starts
    } else {
      // stop immediately: never rely on a fade (iPhone ignores volume changes)
      a.pause();
      a.muted = true;
    }
    if (remember !== false) store("std-music", on ? "on" : "off");
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

    // silence when the guest switches app or tab, or locks the phone; resume on return
    var wasPlaying = false;
    document.addEventListener("visibilitychange", function () {
      if (!music.available || !music.btn.classList.contains("is-shown")) return;
      if (document.hidden) {
        wasPlaying = music.btn.classList.contains("is-playing");
        if (wasPlaying) setPlaying(false, false);
      } else if (wasPlaying) {
        setPlaying(true, false);
      }
    });
    window.addEventListener("pagehide", function () { music.audio.pause(); });
  }

  function startMusic() {
    if (!music.available) return;
    music.btn.classList.add("is-shown");
    if (store("std-music") !== "off") setPlaying(true);
  }

  /* ------------------------------------------------------------------
     Photos — QR codes to the shared Google Drive folders.
     Paste the two folder links here; until then the codes show "soon".
     ------------------------------------------------------------------ */
  var DRIVE_LINKS = {
    view: "",   // folder where guests can see the wedding photos
    upload: "", // folder (or Drive upload form) where guests add their own photos
  };

  function renderQr(box, url) {
    if (!window.qrcode) return false;
    var qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    return true;
  }

  function initPhotos() {
    $$("[data-drive]").forEach(function (link) {
      var url = DRIVE_LINKS[link.dataset.drive];
      var box = $(".qr__code", link);
      if (url) {
        link.href = url;
        if (!renderQr(box, url)) box.textContent = "QR";
      } else {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        box.innerHTML = '<span class="qr__soon" data-i18n="photos.soon">' + t("photos.soon") + "</span>";
      }
    });
  }

  /* ------------------------------------------------------------------
     Gatefold — untie the bow, the doors swing open onto the film
     ------------------------------------------------------------------ */
  function initEnvelope() {
    var env = $("#envelope");
    var bow = $("#bow");
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
      }, 1500 * k);

      setTimeout(function () {
        env.remove();
        $("#top").setAttribute("tabindex", "-1");
        $("#top").focus({ preventScroll: true });
      }, 3600 * k);
    }

    bow.addEventListener("click", open);
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
  initPhotos();
  initCountdown();
  initReveals();
  initParallax();
  initCalendar();
})();

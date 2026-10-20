/* ==========================================================================
   Save the Date — Andrei & Camila
   Intro (curtain · Save the Date · scroll to the film) · language · smooth scroll · countdown ·
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
    // letters bloom outward from the centre: --i is each letter's distance from it
    var chars = [];
    $$("[data-split]").forEach(function (el) {
      var text = el.textContent;
      el.textContent = "";
      el.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(text, function (ch) {
        var span = document.createElement("span");
        span.className = "char";
        span.textContent = ch;
        el.appendChild(span);
        chars.push(span);
      });
    });
    var mid = (chars.length - 1) / 2;
    chars.forEach(function (span, i) {
      span.style.setProperty("--i", Math.abs(i - mid).toFixed(1));
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
          if (!v.ended) safePlay(v);
        } else {
          v.pause();
        }
      });
    }, { rootMargin: "200px 0px" });
    auto.forEach(function (v) { io.observe(v); });

    // the closing film starts from its first frame only once it is truly on screen,
    // so its opening moments are never missed; it then rests on the sunrise
    $$("video[data-play-when-visible]").forEach(function (v) {
      pickSource(v);
      var started = false;
      new IntersectionObserver(function (entries) {
        var e = entries[0];
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          if (!started) { started = true; v.currentTime = 0; }
          if (!v.ended) safePlay(v);
        } else if (!e.isIntersecting) {
          v.pause();
        }
      }, { threshold: [0, 0.6] }).observe(v);
    });

    // loop, but rest on the last frame for a moment first
    $$("video[data-hold]").forEach(function (v) {
      v.addEventListener("ended", function () {
        setTimeout(function () {
          v.currentTime = 0;
          if (v.getBoundingClientRect().bottom > 0 && v.getBoundingClientRect().top < window.innerHeight) safePlay(v);
        }, parseInt(v.dataset.hold, 10) || 2500);
      });
    });

    // pause the hero when it scrolls away (saves battery)
    new IntersectionObserver(function (entries) {
      if (!document.body.classList.contains("is-revealed")) return;
      if (entries[0].isIntersecting) safePlay(hero); else hero.pause();
    }).observe(hero);
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
     Intro — clean curtain → Save the Date → scroll → the film
     ------------------------------------------------------------------ */
  function initEnvelope() {
    var env = $("#envelope");
    var film = $("#env-film");
    var hero = $("#hero-video");
    var step = "curtain";          // curtain → opening → std → dropping → done

    var landscape = !portrait;
    film.poster = landscape ? film.dataset.posterLandscape : film.dataset.posterPortrait;
    film.src = landscape ? film.dataset.srcLandscape : film.dataset.srcPortrait;
    film.load();

    // 1. tap: the curtain opens onto the navy page, "Save the Date" emerges
    function openCurtain() {
      step = "opening";
      env.classList.add("is-opening");
      hero.currentTime = 0;
      hero.pause();                 // the film waits underneath
      film.playbackRate = 0.75;     // a slower, more graceful opening
      var p = reducedMotion ? null : film.play();
      var shown = false;
      function showStd(fallback) {
        if (shown) return;
        shown = true;
        if (fallback === true) env.classList.add("is-std-fallback");
        env.classList.add("is-std");
        step = "std";
      }
      if (!p) showStd(true);
      else {
        if (p.catch) p.catch(function () { showStd(true); });
        film.addEventListener("ended", showStd, { once: true });
        setTimeout(showStd, 5200);  // safety net
      }
    }

    // 2. scroll / swipe / tap: Save the Date fades away onto the film,
    //    which is already playing underneath
    function drop() {
      step = "dropping";
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      hero.currentTime = 0;
      safePlay(hero);
      reveal();
      env.classList.add("is-leaving");
      setTimeout(finish, reducedMotion ? 0 : 2050);
    }

    function finish() {
      step = "done";
      // land exactly on the film, whatever the scroll gesture did meanwhile
      if (lenis) { lenis.scrollTo(0, { immediate: true, force: true }); lenis.start(); }
      else window.scrollTo(0, 0);
      setTimeout(function () {
        env.remove();
        $("#top").setAttribute("tabindex", "-1");
        $("#top").focus({ preventScroll: true });
      }, 50);
    }

    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      document.body.classList.remove("is-locked");
      document.body.classList.add("is-revealed");
      // let the names appear, then start the guided tour
      setTimeout(startTour, 4200);
    }

    function next(e) {
      if (e) e.preventDefault();
      if (step === "curtain") openCurtain();
      else if (step === "std") drop();
    }

    $("#env-open").addEventListener("click", next);
    // a scroll or swipe on the Save the Date screen also lets the drop fall
    env.addEventListener("wheel", function (e) { if (step === "std") next(e); }, { passive: false });
    var touchY = null;
    env.addEventListener("touchstart", function (e) { touchY = e.touches[0].clientY; }, { passive: true });
    env.addEventListener("touchmove", function (e) {
      if (step === "std" && touchY !== null && touchY - e.touches[0].clientY > 30) { touchY = null; next(); }
    }, { passive: true });
    window.addEventListener("keydown", function (e) {
      if ((e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") && (step === "std" || step === "curtain")) next(e);
    });
  }

  /* ------------------------------------------------------------------
     Cinematic auto-scroll — after the envelope opens the page glides all
     the way down in one continuous, fluid movement (ease-in, steady speed,
     ease-out at the end). Any touch, wheel, key or click hands control
     back to the guest, who can then scroll freely.
     ------------------------------------------------------------------ */
  function startTour() {
    if (reducedMotion) return;
    var stopped = false;
    var y = window.scrollY;
    var last = null;
    var started = null;
    var EASE_IN = 2600;  // ms to reach full speed

    function speed() {
      // about 9% of the screen height per second: calm, but never sluggish
      return Math.max(60, window.innerHeight * 0.09);
    }

    function end() {
      return document.documentElement.scrollHeight - window.innerHeight;
    }

    function stop(e) {
      if (stopped) return;
      if (e && e.target && e.target.closest && e.target.closest(".lang")) return;
      stopped = true;
      ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (type) {
        window.removeEventListener(type, stop, true);
      });
    }

    ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (type) {
      window.addEventListener(type, stop, { capture: true, passive: true });
    });

    function frame(now) {
      if (stopped) return;
      if (last === null) { last = now; started = now; }
      var dt = Math.min(64, now - last) / 1000; // ignore long frame gaps (tab switches)
      last = now;

      var remaining = end() - y;
      if (remaining <= 0.5) return stop();

      // gentle start, steady glide, soft landing over the last 40% of a screen
      var rampIn = Math.min(1, (now - started) / EASE_IN);
      rampIn = rampIn * rampIn * (3 - 2 * rampIn);
      var rampOut = Math.min(1, remaining / (window.innerHeight * 0.4));
      var v = speed() * rampIn * Math.max(0.12, Math.sqrt(rampOut));

      y = Math.min(end(), y + v * dt);
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
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
    }, { threshold: 0.05, rootMargin: "0px 0px -4% 0px" });

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
  initEnvelope();
  initPhotos();
  initCountdown();
  initReveals();
  initParallax();
  initCalendar();
})();

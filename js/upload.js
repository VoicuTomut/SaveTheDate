/* ==========================================================================
   Save the Date — upload.html: guests add their photos without an account.
   Each photo is resized in the browser (long edge 2560px, JPEG) and sent to
   the Apps Script (js/config.js → SCRIPT_URL), which saves it in the shared
   Google Drive folder as "<guest name> – <date> – <n>.jpg".
   ========================================================================== */
(function () {
  "use strict";

  var CONFIG = window.STD_CONFIG || {};
  var LANGS = ["ro", "en", "es"];
  var MAX_EDGE = 2560;
  var QUALITY = 0.86;
  var MAX_RAW = 25 * 1024 * 1024; // fallback when a photo can't be decoded (e.g. HEIC)
  var lang = "ro";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function t(key, vars) {
    var dict = window.I18N[lang] || window.I18N.ro;
    var s = dict[key] !== undefined ? dict[key] : window.I18N.ro[key];
    Object.keys(vars || {}).forEach(function (k) { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }

  /* ---------------- language (shared with the invitation) ---------------- */
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

  var lastStatus = null; // re-translated when the language changes

  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l;
    document.title = "Andrei & Camila · " + t("photos.eyebrow");
    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    $$("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.dataset.i18nPh); });
    $$(".lang__btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === l)); });
    if (lastStatus) setStatus(lastStatus[0], lastStatus[1]);
    store("std-lang", l);
  }

  /* ---------------- photos ---------------- */
  var form = $("#upload");
  var nameInput = form.elements.name;
  var fileInput = form.elements.photos;
  var bar = $(".upload__bar i");
  var status = $(".upload__status");
  var pickLabel = $(".upload__pick [data-i18n]");
  var busy = false;

  function setStatus(key, vars) {
    lastStatus = key ? [key, vars] : null;
    status.textContent = key ? t(key, vars) : "";
  }

  function readAsDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve(img); setTimeout(function () { URL.revokeObjectURL(url); }, 0); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }

  // resize to a sensible size (fast uploads, also drops EXIF/GPS);
  // browsers apply the camera orientation when drawing
  function prepare(file) {
    return loadImage(file).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight;
      var k = Math.min(1, MAX_EDGE / Math.max(w, h));
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(w * k);
      canvas.height = Math.round(h * k);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      return { data: canvas.toDataURL("image/jpeg", QUALITY), mime: "image/jpeg", ext: "jpg" };
    }).catch(function () {
      if (file.size > MAX_RAW) throw new Error("too big");
      return readAsDataUrl(file).then(function (data) {
        var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        return { data: data, mime: file.type || "application/octet-stream", ext: ext };
      });
    });
  }

  function send(file, name, index) {
    return prepare(file).then(function (p) {
      var payload = {
        type: "photo",
        name: name,
        index: index,
        mime: p.mime,
        ext: p.ext,
        data: p.data.split(",")[1],
      };
      return fetch(CONFIG.SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
    }).then(function (r) { return r.json(); })
      .then(function (res) { if (!res || !res.ok) throw new Error("upload failed"); });
  }

  function uploadAll(files, name) {
    var total = files.length, done = 0, failed = 0, next = 0;
    busy = true;
    bar.style.width = "0%";
    setStatus("upload.progress", { done: 0, total: total });

    function worker() {
      if (next >= total) return Promise.resolve();
      var i = next++;
      return send(files[i], name, i + 1)
        .catch(function () { failed++; })
        .then(function () {
          done++;
          bar.style.width = Math.round((done / total) * 100) + "%";
          if (done < total) setStatus("upload.progress", { done: done, total: total });
          return worker();
        });
    }

    // two at a time: quick, but gentle on phones and on the script
    return Promise.all([worker(), worker()]).then(function () {
      busy = false;
      fileInput.value = "";
      pickLabel.dataset.i18n = "upload.more";
      pickLabel.textContent = t("upload.more");
      if (failed) setStatus("upload.failed", { failed: failed });
      else setStatus("upload.done", { name: name, total: total - failed });
    });
  }

  // the name comes first: without it, the picker doesn't open
  $(".upload__pick").addEventListener("click", function (e) {
    if (busy) { e.preventDefault(); return; }
    if (!CONFIG.SCRIPT_URL) { e.preventDefault(); setStatus("upload.soon"); return; }
    if (!nameInput.value.trim()) {
      e.preventDefault();
      setStatus("upload.needName");
      nameInput.focus();
    }
  });

  fileInput.addEventListener("change", function () {
    var files = Array.prototype.slice.call(fileInput.files || []);
    var name = nameInput.value.trim();
    if (!files.length || !name) return;
    store("std-guest", name);
    uploadAll(files, name);
  });

  form.addEventListener("submit", function (e) { e.preventDefault(); });

  /* ---------------- boot ---------------- */
  nameInput.value = store("std-guest") || "";
  $$(".lang__btn").forEach(function (b) {
    b.addEventListener("click", function () { applyLang(b.dataset.lang); });
  });
  applyLang(detectLang());
  $$(".corner").forEach(function (c) { c.classList.add("is-visible"); });
})();

/* ==========================================================================
   Save the Date — gallery.html: everyone's wedding photos, on the site.
   The list comes from the Apps Script (GET ?list=photos); the images are
   served by Google from the shared Drive folder.
   ========================================================================== */
(function () {
  "use strict";

  var CONFIG = window.STD_CONFIG || {};
  var LANGS = ["ro", "en", "es"];
  var BATCH = 36;
  var lang = "ro";
  var all = [];        // every photo, newest first
  var shown = [];      // after the guest filter
  var rendered = 0;
  var filter = "";
  var current = -1;    // index in `shown` open in the lightbox
  var byId = {};

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

  /* ---------------- images ---------------- */
  function img(p, width) {
    if (p.src) return p.src; // (local testing)
    return "https://lh3.googleusercontent.com/d/" + p.id + "=w" + width;
  }
  function fallback(p, width) {
    return "https://drive.google.com/thumbnail?id=" + p.id + "&sz=w" + width;
  }
  function download(p) {
    return p.src || "https://drive.google.com/uc?export=download&id=" + p.id;
  }
  function loadInto(el, p, width) {
    el.onerror = function () { if (!p.src && el.dataset.fb !== "1") { el.dataset.fb = "1"; el.src = fallback(p, width); } };
    el.src = img(p, width);
  }

  /* ---------------- language ---------------- */
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

  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l;
    document.title = "Andrei & Camila · " + t("photos.eyebrow");
    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    $$(".lang__btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === l)); });
    store("std-lang", l);
    updateCount();
    renderFilter();
    if (current > -1) caption();
    Object.keys(byId).forEach(paintLikes);
  }

  /* ---------------- header count + guest filter ---------------- */
  function guests() {
    var seen = {};
    all.forEach(function (p) { seen[p.by] = (seen[p.by] || 0) + 1; });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b); });
  }

  function updateCount() {
    var el = $(".gallery__count");
    if (!all.length) { el.textContent = ""; return; }
    var n = all.length, g = guests().length;
    el.textContent = (n === 1 ? t("gallery.photo") : t("gallery.photos", { n: n })) + " · " +
                     (g === 1 ? t("gallery.guest") : t("gallery.guests", { n: g }));
  }

  function renderFilter() {
    var nav = $(".gallery__filter");
    var names = guests();
    if (names.length < 2) { nav.hidden = true; return; }
    nav.hidden = false;
    nav.innerHTML = "";
    [""].concat(names).forEach(function (name) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = name || t("gallery.everyone");
      b.setAttribute("aria-pressed", String(name === filter));
      b.addEventListener("click", function () { setFilter(name); });
      nav.appendChild(b);
    });
  }

  function setFilter(name) {
    filter = name;
    $$(".chip").forEach(function (b, i) { b.setAttribute("aria-pressed", String(i === 0 ? !name : b.textContent === name)); });
    shown = name ? all.filter(function (p) { return p.by === name; }) : all.slice();
    buildColumns();
    rendered = 0;
    renderMore();
  }

  /* ---------------- grid ---------------- */
  // photos are dealt into columns left to right, so the wall reads in order
  // (newest first) and loading more never reshuffles what is already there
  var cols = [];

  function columnCount() {
    var w = window.innerWidth;
    return w >= 1100 ? 4 : w >= 720 ? 3 : 2;
  }

  function buildColumns() {
    var grid = $("#grid");
    grid.innerHTML = "";
    cols = [];
    for (var c = 0; c < columnCount(); c++) {
      var col = document.createElement("div");
      col.className = "gallery__col";
      grid.appendChild(col);
      cols.push(col);
    }
  }

  window.addEventListener("resize", function () {
    if (!cols.length || cols.length === columnCount()) return;
    var tiles = $$(".tile");
    buildColumns();
    tiles.forEach(function (tile, i) { cols[i % cols.length].appendChild(tile); });
  });

  function renderMore() {
    var end = Math.min(shown.length, rendered + BATCH);
    for (var i = rendered; i < end; i++) {
      (function (index) {
        var p = shown[index];
        // a mounted print: the photo, and beneath it who took it + likes
        var tile = document.createElement("figure");
        tile.className = "tile";
        var a = document.createElement("button");
        a.type = "button";
        a.className = "tile__open";
        a.setAttribute("aria-label", t("gallery.by", { name: p.by }));
        var im = document.createElement("img");
        im.alt = "";
        im.loading = "lazy";
        im.decoding = "async";
        im.addEventListener("load", function () { tile.classList.add("is-loaded"); });
        loadInto(im, p, 900);
        a.appendChild(im);
        a.addEventListener("click", function () { open(index); });
        var cap = document.createElement("figcaption");
        cap.className = "tile__cap";
        var by = document.createElement("span");
        by.className = "tile__by";
        by.textContent = p.by;
        cap.appendChild(by);
        cap.appendChild(likeButton(p));
        tile.appendChild(a);
        tile.appendChild(cap);
        if (isAdmin) tile.appendChild(deleteButton(p));
        cols[index % cols.length].appendChild(tile);
      })(i);
    }
    rendered = end;
  }

  /* ---------------- likes ----------------
     One like per photo per person (remembered on this device); tap again
     to take it back. Counts live in the Apps Script. */
  var liked = {};
  try { (JSON.parse(store("std-likes") || "[]")).forEach(function (id) { liked[id] = true; }); } catch (e) {}

  function saveLiked() { store("std-likes", JSON.stringify(Object.keys(liked))); }

  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.4-4.5-9.1-9.1C1.8 8.1 3.7 4.7 7 4.7c2 0 3.4 1.1 5 2.9 1.6-1.8 3-2.9 5-2.9 3.3 0 5.2 3.4 4.1 6.5-1.7 4.6-9.1 9.1-9.1 9.1z"/></svg>';

  function paintLikes(id) {
    var p = byId[id];
    if (!p) return;
    $$('.like[data-id="' + id + '"]').forEach(function (b) {
      var on = !!liked[id];
      b.classList.toggle("is-liked", on);
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", t(on ? "gallery.unlike" : "gallery.like"));
      $(".like__n", b).textContent = p.likes > 0 ? p.likes : "";
    });
  }

  function toggleLike(id, btn) {
    var p = byId[id];
    if (!p) return;
    var on = !liked[id];
    if (on) liked[id] = true; else delete liked[id];
    p.likes = Math.max(0, (p.likes || 0) + (on ? 1 : -1));
    saveLiked();
    paintLikes(id);
    if (on && btn) { btn.classList.remove("is-pop"); void btn.offsetWidth; btn.classList.add("is-pop"); }
    if (!CONFIG.SCRIPT_URL || p.src) return; // (local testing)
    fetch(CONFIG.SCRIPT_URL, { method: "POST", body: JSON.stringify({ type: "like", id: id, on: on }) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) throw new Error("like failed");
        p.likes = res.likes;
        paintLikes(id);
      })
      .catch(function () {
        // undo, so what the guest sees stays true
        if (on) delete liked[id]; else liked[id] = true;
        p.likes = Math.max(0, p.likes + (on ? -1 : 1));
        saveLiked();
        paintLikes(id);
      });
  }

  function likeButton(p) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "like";
    b.dataset.id = p.id;
    b.innerHTML = HEART + '<span class="like__n"></span>';
    b.addEventListener("click", function (e) { e.stopPropagation(); toggleLike(p.id, b); });
    setTimeout(function () { paintLikes(p.id); }, 0);
    return b;
  }

  /* ---------------- only the couple: delete ----------------
     Open gallery.html?admin=<secret> once on your phone (the secret is the
     ADMIN_KEY Script Property in Apps Script). It is remembered on that
     device and checked by the script; guests never see these buttons. */
  var isAdmin = false;
  var adminKey = "";

  function post(payload) {
    return fetch(CONFIG.SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); });
  }

  function deleteButton(p) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tile__delete";
    b.setAttribute("aria-label", t("gallery.delete"));
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!window.confirm(t("gallery.confirmDelete", { name: p.by }))) return;
      b.disabled = true;
      post({ type: "delete", id: p.id, key: adminKey })
        .then(function (res) {
          if (!res || !res.ok) throw new Error("delete failed");
          all = all.filter(function (x) { return x.id !== p.id; });
          delete byId[p.id];
          updateCount();
          renderFilter();
          $(".gallery__empty").hidden = all.length > 0;
          setFilter(all.some(function (x) { return x.by === filter; }) ? filter : "");
        })
        .catch(function () { b.disabled = false; window.alert(t("gallery.deleteFailed")); });
    });
    return b;
  }

  function initAdmin() {
    var params = new URLSearchParams(location.search);
    var fromUrl = params.get("admin");
    if (fromUrl !== null) {
      if (fromUrl) store("std-admin", fromUrl);
      else store("std-admin", "");
      params.delete("admin");
      history.replaceState(null, "", location.pathname + (params.toString() ? "?" + params : ""));
    }
    adminKey = store("std-admin") || "";
    if (!adminKey || !CONFIG.SCRIPT_URL) return Promise.resolve();
    return post({ type: "auth", key: adminKey })
      .then(function (res) {
        if (!res || !res.ok) { store("std-admin", ""); return; }
        isAdmin = true;
        $(".gallery__admin").hidden = false;
      })
      .catch(function () {});
  }

  $(".gallery__admin-exit").addEventListener("click", function () {
    store("std-admin", "");
    location.reload();
  });

  /* ---------------- lightbox ---------------- */
  var box = $("#lightbox");
  var big = $(".lightbox__img");
  var lastFocus = null;

  function caption() {
    var p = shown[current];
    $(".lightbox__by").textContent = t("gallery.by", { name: p.by });
    $(".lightbox__count").textContent = (current + 1) + " / " + shown.length;
    $(".lightbox__save").href = download(p);
    $(".lightbox .like").dataset.id = p.id;
    paintLikes(p.id);
  }

  function show(index) {
    current = (index + shown.length) % shown.length;
    big.classList.remove("is-loaded");
    big.onload = function () { big.classList.add("is-loaded"); };
    big.dataset.fb = "";
    loadInto(big, shown[current], 2048);
    caption();
    // warm up the neighbours for instant swipes
    [current + 1, current - 1].forEach(function (n) {
      var p = shown[(n + shown.length) % shown.length];
      if (p) new Image().src = img(p, 2048);
    });
  }

  function open(index) {
    lastFocus = document.activeElement;
    box.hidden = false;
    document.body.classList.add("is-lightbox");
    requestAnimationFrame(function () { box.classList.add("is-open"); });
    show(index);
    $(".lightbox__close").focus();
  }

  function close() {
    box.classList.remove("is-open");
    document.body.classList.remove("is-lightbox");
    setTimeout(function () { box.hidden = true; big.removeAttribute("src"); }, 500);
    current = -1;
    if (lastFocus) lastFocus.focus();
  }

  (function () {
    var lb = $(".lightbox .like");
    lb.innerHTML = HEART + '<span class="like__n"></span>';
    lb.addEventListener("click", function (e) { e.stopPropagation(); toggleLike(lb.dataset.id, lb); });
  })();
  $(".lightbox__close").addEventListener("click", close);
  $(".lightbox__prev").addEventListener("click", function () { show(current - 1); });
  $(".lightbox__next").addEventListener("click", function () { show(current + 1); });
  box.addEventListener("click", function (e) { if (e.target === box || e.target.classList.contains("lightbox__figure")) close(); });
  document.addEventListener("keydown", function (e) {
    if (current < 0) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(current + 1);
    else if (e.key === "ArrowLeft") show(current - 1);
  });
  var x0 = null;
  box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  /* ---------------- load ---------------- */
  function load() {
    if (CONFIG.ALBUM_URL) {
      var dl = $(".gallery__download");
      dl.href = CONFIG.ALBUM_URL;
      dl.hidden = false;
    }
    if (!CONFIG.SCRIPT_URL) { $(".gallery__empty").hidden = false; return; }
    var url = CONFIG.SCRIPT_URL + (CONFIG.SCRIPT_URL.indexOf("?") > -1 ? "&" : "?") + "list=photos";
    Promise.all([fetch(url).then(function (r) { return r.json(); }), initAdmin()])
      .then(function (both) { return both[0]; })
      .then(function (res) {
        all = (res && res.photos) || [];
        all.forEach(function (p) { p.likes = p.likes || 0; byId[p.id] = p; });
        $(".gallery__empty").hidden = all.length > 0;
        updateCount();
        renderFilter();
        setFilter("");
      })
      .catch(function () { $(".gallery__empty").hidden = false; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && rendered < shown.length) renderMore();
      }, { rootMargin: "800px 0px" }).observe($(".gallery__more"));
    }
  }

  /* ---------------- boot ---------------- */
  $$(".lang__btn").forEach(function (b) { b.addEventListener("click", function () { applyLang(b.dataset.lang); }); });
  applyLang(detectLang());
  $$(".corner").forEach(function (c) { c.classList.add("is-visible"); });
  load();
})();

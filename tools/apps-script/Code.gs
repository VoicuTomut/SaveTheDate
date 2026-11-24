/**
 * Save the Date — Andrei & Camila
 * Google Apps Script web app behind the site (see README.md next to this file).
 *
 *  - RSVP (reply card)  → a new row in the "RSVP" sheet of the spreadsheet this script is bound to
 *  - Photos (upload.html) → files in the Drive folder PHOTOS_FOLDER_ID,
 *                           named "<guest name> – <date time> – <n>.jpg"
 *  - Gallery (gallery.html) → GET ?list=photos returns the photos (with likes) to show
 *  - Likes → counts kept in Script Properties ("like:<file id>")
 *  - Delete (only the couple) → needs the secret Script Property ADMIN_KEY; the photo goes to the Drive trash
 *
 * Guests never need a Google account: the web app runs as the owner.
 */

// ID of the Google Drive folder for guests' photos: the part after /folders/ in its link.
var PHOTOS_FOLDER_ID = "1FUQrxSLakVRPNqEv4f8bNg1HQhF5I3gH";

var SHEET_NAME = "RSVP";
var HEADERS = ["Date", "Name", "Attending", "Adults", "Children", "Details / allergies", "Language"];
var MAX_PHOTO_BYTES = 30 * 1024 * 1024;
var LIKE_PREFIX = "like:";

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.type === "rsvp") return json_(saveRsvp_(body));
    if (body.type === "photo") return json_(savePhoto_(body));
    if (body.type === "like") return json_(like_(body));
    if (body.type === "auth") return json_({ ok: isAdmin_(body.key) });
    if (body.type === "delete") return json_(deletePhoto_(body));
    return json_({ ok: false, error: "unknown type" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ?list=photos → the photos for gallery.html (newest first); otherwise a health check
function doGet(e) {
  if (e && e.parameter && e.parameter.list === "photos") return json_(listPhotos_());
  return json_({ ok: true, service: "Save the Date" });
}

/* ---------------- gallery ---------------- */

// the files themselves (cached for a minute, refreshed on upload / delete)
function files_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get("photos");
  if (hit) return JSON.parse(hit);

  var photos = [];
  var it = DriveApp.getFolderById(PHOTOS_FOLDER_ID).getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (!/^image\//.test(f.getMimeType())) continue;
    var by = (f.getDescription() || "").replace(/^Uploaded by /, "") || f.getName().split(" – ")[0];
    photos.push({ id: f.getId(), by: by, t: f.getDateCreated().getTime() });
  }
  photos.sort(function (a, b) { return b.t - a.t; });
  var str = JSON.stringify(photos);
  if (str.length < 90000) cache.put("photos", str, 60);
  return photos;
}

// …plus the current like counts (always fresh)
function listPhotos_() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var photos = files_().map(function (p) {
    p.likes = parseInt(props[LIKE_PREFIX + p.id], 10) || 0;
    return p;
  });
  return { ok: true, photos: photos };
}

function like_(b) {
  var id = String(b.id || "");
  var known = files_().some(function (p) { return p.id === id; });
  if (!known) return { ok: false, error: "unknown photo" };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var n = (parseInt(props.getProperty(LIKE_PREFIX + id), 10) || 0) + (b.on ? 1 : -1);
    n = Math.max(0, n);
    props.setProperty(LIKE_PREFIX + id, String(n));
    return { ok: true, likes: n };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- only the couple: delete ----------------
   Set the secret once: Apps Script → ⚙ Project Settings → Script Properties →
   Add property  ADMIN_KEY = <a long secret of your choice>. It never goes into GitHub. */

function isAdmin_(key) {
  var secret = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
  if (!secret || secret.length < 8 || typeof key !== "string" || key.length !== secret.length) return false;
  var diff = 0;
  for (var i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ key.charCodeAt(i);
  return diff === 0;
}

function deletePhoto_(b) {
  if (!isAdmin_(b.key)) return { ok: false, error: "not allowed" };
  var id = String(b.id || "");
  var file = DriveApp.getFileById(id);
  var inFolder = false;
  var parents = file.getParents();
  while (parents.hasNext()) if (parents.next().getId() === PHOTOS_FOLDER_ID) inFolder = true;
  if (!inFolder) return { ok: false, error: "not a wedding photo" };

  file.setTrashed(true); // recoverable from the Drive trash for 30 days
  PropertiesService.getScriptProperties().deleteProperty(LIKE_PREFIX + id);
  CacheService.getScriptCache().remove("photos");
  return { ok: true };
}

/* ---------------- RSVP & uploads ---------------- */

function saveRsvp_(b) {
  var name = clean_(b.name, 120);
  if (!name) return { ok: false, error: "name required" };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    var yes = b.attending === "yes";
    sheet.appendRow([
      new Date(),
      name,
      yes ? "Yes" : "No",
      yes ? toInt_(b.adults) : 0,
      yes ? toInt_(b.kids) : 0,
      clean_(b.notes, 500),
      clean_(b.lang, 5),
    ]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function savePhoto_(b) {
  var name = clean_(b.name, 80) || "Guest";
  var mime = /^image\//.test(b.mime || "") ? b.mime : "image/jpeg";
  var ext = String(b.ext || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  var bytes = Utilities.base64Decode(b.data || "");
  if (!bytes.length) return { ok: false, error: "empty" };
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, error: "too big" };

  var stamp = Utilities.formatDate(new Date(), "Europe/Bucharest", "yyyy-MM-dd HH.mm.ss");
  var safeName = name.replace(/[\\/:*?"<>|]/g, " ").trim();
  var fileName = safeName + " – " + stamp + " – " + toInt_(b.index || 1) + "." + ext;

  var blob = Utilities.newBlob(bytes, mime, fileName);
  var file = DriveApp.getFolderById(PHOTOS_FOLDER_ID).createFile(blob);
  file.setDescription("Uploaded by " + name);
  CacheService.getScriptCache().remove("photos"); // show it in the gallery right away
  return { ok: true, id: file.getId() };
}

function clean_(v, max) {
  // also neutralises spreadsheet formulas typed into the form
  return String(v == null ? "" : v).replace(/^[=+\-@]+/, "").trim().slice(0, max);
}

function toInt_(v) {
  var n = parseInt(v, 10);
  return isNaN(n) ? 0 : Math.max(0, Math.min(n, 99));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

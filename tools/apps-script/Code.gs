/**
 * Save the Date — Andrei & Camila
 * Google Apps Script web app behind the site (see README.md next to this file).
 *
 *  - RSVP (reply card)  → a new row in the "RSVP" sheet of the spreadsheet this script is bound to
 *  - Photos (upload.html) → files in the Drive folder PHOTOS_FOLDER_ID,
 *                           named "<guest name> – <date time> – <n>.jpg"
 *
 * Guests never need a Google account: the web app runs as the owner.
 */

// ID of the Google Drive folder for guests' photos: the part after /folders/ in its link.
var PHOTOS_FOLDER_ID = "PASTE_THE_FOLDER_ID_HERE";

var SHEET_NAME = "RSVP";
var HEADERS = ["Date", "Name", "Attending", "Adults", "Children", "Details / allergies", "Language"];
var MAX_PHOTO_BYTES = 30 * 1024 * 1024;

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.type === "rsvp") return json_(saveRsvp_(body));
    if (body.type === "photo") return json_(savePhoto_(body));
    return json_({ ok: false, error: "unknown type" });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// opening the web app URL in a browser just confirms it is running
function doGet() {
  return json_({ ok: true, service: "Save the Date" });
}

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

/* ==========================================================================
   Save the Date — links to fill in (see tools/apps-script/README.md)
   Until they are filled, the RSVP and upload say "available soon" and the
   photo QR codes show "link coming soon".
   ========================================================================== */
window.STD_CONFIG = {
  // Google Apps Script web app (tools/apps-script/Code.gs):
  // saves RSVP replies to the Google Sheet and guests' photos to Google Drive.
  // Looks like https://script.google.com/macros/s/AKfy…/exec
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbySdlG0B8NzjsrR1tTfkb6L0_xYwoQowbykaYkVGDQuUMTZCtiWFiSyFrr7jj7YCxIr/exec",

  // The Google Drive folder the photos are saved in, shared as "Anyone with the link · Viewer".
  // The gallery page shows the photos itself; this link is its "Download all photos".
  ALBUM_URL: "https://drive.google.com/drive/folders/1FUQrxSLakVRPNqEv4f8bNg1HQhF5I3gH",
};

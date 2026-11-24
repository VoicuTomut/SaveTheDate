# RSVP & photo uploads — Google Apps Script

One small script in your own Google account does both jobs:

- **Reply card (RSVP)** → a new row in a Google Sheet
- **Add your photos** (`upload.html`) → photos saved in a Google Drive folder, named after the guest
- **See the photos** (`gallery.html`) → the site's own gallery lists that folder (guests never see Drive)

Guests never need a Google account. It is free and takes about 10 minutes, once.

## 1. The photos folder

1. In [Google Drive](https://drive.google.com), create a folder, e.g. **Nunta Andrei & Camila – Fotografii**.
2. **Share → General access → Anyone with the link → Viewer**, then **Copy link**.
   Needed so the gallery can show the photos; the link itself is the gallery's "Download all photos" (`ALBUM_URL` below).
3. The folder ID is the part of the link after `/folders/`
   (`https://drive.google.com/drive/folders/`**`1AbC…xyz`**).

## 2. The sheet and the script

1. Create a new [Google Sheet](https://sheets.new), e.g. **Nunta – Confirmări**.
2. **Extensions → Apps Script**. Delete what is there and paste all of [`Code.gs`](Code.gs).
3. On the line `var PHOTOS_FOLDER_ID = "PASTE_THE_FOLDER_ID_HERE";` paste the folder ID from step 1.3. Save.
4. **Deploy → New deployment** → gear icon → **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
5. **Deploy**, then **Authorize access** (choose your account → *Advanced* → *Go to … (unsafe)* → *Allow*;
   the warning appears because the script is yours, not a published app).
6. Copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`).

## 3. Connect the site

In [`js/config.js`](../../js/config.js):

```js
SCRIPT_URL: "https://script.google.com/macros/s/…/exec",
ALBUM_URL:  "https://drive.google.com/drive/folders/…",
```

Commit and push. The QR codes, the reply card and the upload page switch on by themselves.

## Changing the script later

Edit `Code.gs` in Apps Script, then **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
The URL stays the same.

## What you get

| Sheet "RSVP" column | Example |
| --- | --- |
| Date | 24.11.2026 18:02 |
| Name | Maria Popescu |
| Attending | Yes |
| Adults | 2 |
| Children | 1 |
| Details / allergies | one child gluten-free |
| Language | ro |

Photos: `Maria Popescu – 2027-05-16 22.14.05 – 3.jpg` (resized to 2560px on the long edge, location data removed).

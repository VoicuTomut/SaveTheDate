# Save the Date — Style Guide

**Andrei & Camila · 16.05.2027 · Târgu Mureș**

This document is the single source of truth for how the Save the Date website looks, moves and speaks.
Every color, font, animation and sentence on the site should be traceable back to a rule here.

---

## 1. Concept & mood

> *A blue letterpress invitation that opens onto the sea.*

Andrei is from **Romania** 🇷🇴, Camila is from **Santa Cruz, Bolivia** 🇧🇴.
The site opens like a theatre: a full-screen **royal-navy velvet curtain** with "Save the Date" pressed into it.
A tap draws it open — **cloth-simulated and rendered in Blender** (real velvet, weight, folds and light) — onto our
film by the sea, on a calm **denim-blue** page.

References: minimal digital save-the-date videos (velvet curtain reveal, embossed tone-on-tone florals, soft reveal)
and fields of blue flowers (nemophila, cornflower).

| Keyword        | In practice                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| **Luxurious**  | Velvet curtain, embossed flowers, refined serif + formal script               |
| **Clean**      | One paper color everywhere, lots of air, no busy decoration                 |
| **Continuous** | Pages flow into each other; videos fade into the paper — no hard breaks     |
| **Clear**      | Videos at full quality, never tinted or blurred; text always crisp           |
| **Smooth**     | Slow, silky motion — never bouncy, never blurred                            |

**Avoid:** colored clip-art flowers, heavy overlays on video, blur effects on text, bouncy easing, emoji in copy.

---

## 2. Color

All colors live as CSS custom properties in [`css/colors.css`](../css/colors.css) —
**never hard-code a color in components.** Embossed SVG art uses the same values (see `tools/generate_emboss.py`).

| Token            | Hex       | Role                                               |
| ---------------- | --------- | -------------------------------------------------- |
| `--paper`        | `#A7BAD9` | Denim blue — the page, everywhere                  |
| `--paper-light`  | `#B6C7E2` | Lighter denim — cards, raised surfaces             |
| `--paper-deep`   | `#93A8CC` | Denim in shadow                                    |
| `--paper-raised` | `#B0C2DE` | Embossed flower surface                            |
| `--ink`          | `#1B2B57` | Primary text (7.0:1 on paper)                      |
| `--ink-soft`     | `#24365F` | Secondary text (6.0:1 on paper)                    |
| `--cornflower`   | `#203A78` | Eyebrows, links, icons (5.5:1 on paper)            |
| `--curtain-velvet`| `#0B1452` | Royal-navy velvet curtain (Blender render)        |
| `--curtain-ink`  | `#C9D6F0` | Pale blue lettering pressed into the velvet        |
| `--midnight`     | `#0F1A3A` | Video shading (only behind text)                   |
| `--white`        | `#FFFFFF` | Text on video                                      |

Rules:

- **One paper color** for every non-video page — continuity comes from never switching backgrounds.
- **Videos stay clear.** Shading is a gradient *only* where text sits (bottom/top edge), never a full tint.
- Video pages hand off to paper with a short `--fade-to-paper` / `--fade-from-paper` gradient.
- Text on paper is ink; text on video is white with a soft shadow.

---

## 3. Typography

Google Fonts with the `latin-ext` subset (Romanian `ă â î ș ț`, Spanish `á é í ó ú ñ ¡ ¿`).

| Role          | Font                 | Usage                                                  |
| ------------- | -------------------- | ------------------------------------------------------ |
| **Script**    | *Ephesis*            | Names, love quote, "Save the Date" on the curtain, closing |
| **Serif**     | *Cormorant Garamond* | Titles, dates, times, tracked uppercase labels         |
| **Body**      | *Jost* (300)         | Paragraphs                                             |

Rules:

- Tracked uppercase labels (`SAVE THE DATE`, `CUNUNIA RELIGIOASĂ`) use Cormorant 600, `letter-spacing ≈ 0.3–0.5em`,
  with equal `padding-left` so they stay optically centred.
- **Text must never be cut:** fluid sizes with `clamp()`, wrapping allowed, `text-wrap: balance` for script lines,
  no fixed widths on text.
- Script never below `1.75rem`.
- The "&" between names is always Cormorant Garamond *italic 300*, never the script ampersand.
- Script lines get extra inline padding so swashes are never clipped.
- Numbers use lining figures (`font-variant-numeric: lining-nums`).

---

## 4. Layout

- **Mobile first** — most guests open the link from WhatsApp.
- Pages: centred single column, max `640px` (text) / `980px` (wide content), generous vertical padding.
- Embossed flower corners decorate paper pages; on phones they shrink so they never touch text.
- Thin `1px` lines (ink at 22–45% opacity) separate items; no boxes or cards.
- Photos and film get a thin white inner frame line, like a mounted print.

### Page structure

1. **Curtain** — full screen, royal-navy velvet rendered in Blender; HTML overlay *"Save the Date"* (stacked script),
   *ANDREI & CAMILA · 16 · 05 · 2027* and a translated hint. A tap draws the curtain open (cloth physics: the top leads,
   the hem trails, the folds gather) onto the hero film, which plays in sync underneath; music fades in.
2. **Hero film** — beach kiss video (AI-sharpened), clear; names, date, place over a bottom shade.
3. **Invitation** — script names, one simple sentence, date box (*MAI · DUMINICĂ | 16 | 2027 · ORA 12:00*), countdown.
4. **Our story** — love quote *"Te iubesc până la infinit și mai departe"*, framed film of us walking toward each other,
   Santa Cruz ↔ Târgu Mureș arc with a gliding heart, "11.000 km" and *"Ce înseamnă 11.000 de kilometri…?"*.
5. **Godparents** — Ciprian & Andreea Nicoară.
6. **The day** — ceremony 12:00 Catedrala Mică · reception 14:00 Casa Boema; 🇷🇴 & 🇧🇴 *"Două tradiții, o singură petrecere"*;
   add to calendar; **photo QR codes** (see the photos / add your photos — shared Google Drive folders).
7. **Closing film** — sunset lift, played once and resting on the last frame; "Vă așteptăm", names, flags.

Controls: small language pill (top right) and a small round music button (bottom right), both glass so they read on paper and video.

---

## 5. Motion

| Token           | Value                            | Use                               |
| --------------- | -------------------------------- | --------------------------------- |
| `--ease-silk`   | `cubic-bezier(0.16, 1, 0.3, 1)`  | Entrances, reveals, carousel      |
| `--ease-velvet` | `cubic-bezier(0.76, 0, 0.24, 1)` | Line drawing                      |
| `--ease-breeze` | `cubic-bezier(0.45, 0, 0.55, 1)` | Looping: breathing hint, heart    |

- Durations are long: reveals 0.9–1.1 s, curtain about 2 s.
- **Smooth scrolling** via Lenis (falls back to native).
- Reveals: **fade + 26px rise only** — no blur, so text is crisp at every frame.
- Curtain: a pre-rendered film (3.3 s, 30 fps, motion blur), cloth-simulated in Blender — the realism comes from physics,
  not CSS. The hero video is the texture behind the curtain in the render, and the live hero video starts at the same
  moment, so the hand-off is seamless. Fully reproducible from `tools/blender/` (see the README there).
- Respect `prefers-reduced-motion`: instant reveals, no autoplay.
- Animate only `transform` and `opacity`.

---

## 6. Imagery, video & music

- Only our own photos and videos. Raw originals stay in `resources/` (git-ignored).
- Photos: max 1600px, JPEG q80, **EXIF/GPS stripped**.
- Videos: H.264, CRF 20–23, full 1080p (portrait crops for phones where needed), muted, `playsinline`,
  played only while on screen.

| File                | Source            | Where           |
| ------------------- | ----------------- | --------------- |
| `hero(-portrait)`   | beach kiss (edit), Real-ESRGAN x4plus | Hero  |
| `story`             | walking together  | Our story       |
| `closing(-portrait)`| sunset lift, cut at 4.9 s (before she is set down); loops, holding the last frame 2.5 s | Closing |
| `curtain(-portrait)`| Blender cloth render (`tools/blender/curtain.py`) | Curtain opening |

- **Music:** `assets/audio/song.mp3` — Chopin, Nocturne Op. 9 No. 2 (public domain). Starts softly when the gatefold
  opens, loops; the music button stops it **instantly** (iPhone ignores volume changes, so muting never relies on a fade);
  it pauses when the guest leaves the tab/app. The choice is remembered.
- **Photo QR codes:** the two Google Drive links live in `DRIVE_LINKS` in `js/main.js`; until filled, the codes show
  "link coming soon".

---

## 7. Voice & languages

Fully trilingual: **Română (default) · English · Español**, auto-detected, switchable, remembered, `?lang=ro|en|es`.

- All copy lives in `js/i18n.js`.
- Tone: warm, short, elegant.
- Proper names never translated: **Catedrala Mică**, **Casa Boema**, **Târgu Mureș**, **Santa Cruz**.

| Item       | Value                                       |
| ---------- | ------------------------------------------- |
| Couple     | Andrei & Camila                             |
| Godparents | Ciprian & Andreea Nicoară                   |
| Date       | Sunday, 16 May 2027                         |
| Ceremony   | 12:00 — Catedrala Mică, Târgu Mureș         |
| Reception  | 14:00 — Restaurant Casa Boema, Târgu Mureș  |

---

## 8. Quality checklist

- [ ] No text cut or overlapping decoration at 360px, 390px and desktop widths
- [ ] Contrast ≥ 4.5:1 for body text
- [ ] Videos sharp, untinted; shading only behind text
- [ ] Keyboard reachable controls with visible focus
- [ ] `prefers-reduced-motion` honored
- [ ] Works on iOS Safari & Android Chrome

---

## 9. File organization

```
/
├── index.html
├── css/
│   ├── colors.css            # color tokens (only place with color values)
│   └── style.css             # layout, components, motion
├── js/
│   ├── i18n.js               # RO / EN / ES copy
│   └── main.js               # curtain, music, auto-scroll, reveals, countdown, …
├── assets/
│   ├── florals/              # embossed SVG flowers (generated)
│   ├── img/                  # optimized photos
│   ├── video/                # optimized videos + posters
│   └── audio/                # background song
├── tools/
│   ├── generate_emboss.py    # regenerates assets/florals
│   └── blender/              # velvet curtain scene (cloth simulation + render script)
├── docs/
│   └── STYLE_GUIDE.md
└── resources/                # raw originals (git-ignored)
```

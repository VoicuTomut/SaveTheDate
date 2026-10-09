# Save the Date — Style Guide

**Andrei & Camila · 16.05.2027 · Târgu Mureș**

This document is the single source of truth for how the Save the Date website looks, moves and speaks.
Every color, font, animation and sentence on the site should be traceable back to a rule here.

---

## 1. Concept & mood

> *A blue letterpress invitation that opens onto the sea.*

Andrei is from **Romania** 🇷🇴, Camila is from **Santa Cruz, Bolivia** 🇧🇴.
The site feels like receiving a luxury paper invitation: a full-screen **blue envelope** with
**embossed flowers** and a **wax seal**; when it opens, the paper parts like curtains onto our film by the sea.

References: minimal digital save-the-date videos (embossed tone-on-tone florals, soft reveal,
delicate butterflies) and fields of blue flowers (nemophila, cornflower).

| Keyword        | In practice                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| **Luxurious**  | Letterpress paper, embossed flowers, wax seal, refined serif + formal script |
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
| `--paper`        | `#D4DFF0` | Powder cornflower paper — the page, everywhere     |
| `--paper-light`  | `#E2EAF6` | Envelope flaps, light side                         |
| `--paper-deep`   | `#C3D1EA` | Envelope interior, shadows                         |
| `--paper-raised` | `#DBE4F3` | Embossed flower surface                            |
| `--ink`          | `#1B2B57` | Primary text (10.2:1 on paper)                     |
| `--ink-soft`     | `#3D5486` | Secondary text (5.6:1 on paper)                    |
| `--cornflower`   | `#2E4A8E` | Eyebrows, links, icons (6.3:1 on paper)            |
| `--seal`         | `#3554A8` | Wax seal (with `--seal-light` / `--seal-dark`)     |
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
| **Script**    | *Pinyon Script*      | Names, "Această invitație este pentru voi", closing    |
| **Serif**     | *Cormorant Garamond* | Titles, dates, times, tracked uppercase labels         |
| **Body**      | *Jost* (300)         | Paragraphs                                             |

Rules:

- Tracked uppercase labels (`SAVE THE DATE`, `CUNUNIA RELIGIOASĂ`) use Cormorant 600, `letter-spacing ≈ 0.3–0.5em`,
  with equal `padding-left` so they stay optically centred.
- **Text must never be cut:** fluid sizes with `clamp()`, wrapping allowed, `text-wrap: balance` for script lines,
  no fixed widths on text.
- Script never below `1.75rem`.
- Numbers use lining figures (`font-variant-numeric: lining-nums`).

---

## 4. Layout

- **Mobile first** — most guests open the link from WhatsApp.
- Pages: centred single column, max `640px` (text) / `980px` (wide content), generous vertical padding.
- Embossed flower corners decorate paper pages; on phones they shrink so they never touch text.
- Thin `1px` lines (ink at 22–45% opacity) separate items; no boxes or cards.
- Photos and film get a thin white inner frame line, like a mounted print.

### Page structure

1. **Envelope** — full screen: four embossed paper flaps, wax seal "A&C", script line
   *"Această invitație este pentru voi"*, butterflies. Tap the seal → flaps part, music fades in.
2. **Hero film** — beach kiss video, clear; names, date, place over a bottom shade.
3. **Invitation** — script names, message, date box (*MAI · DUMINICĂ | 16 | 2027 · ORA 12:00*), countdown.
4. **Our story** — framed film of us walking toward each other; Santa Cruz ↔ Târgu Mureș line with a gliding heart.
5. **The day** — ceremony 12:00 Catedrala Mică · reception 15:00 Casa Boema; map links; add to calendar.
6. **Godparents** — Ciprian & Andreea Nicoară.
7. **Moments** — infinite centre-mode carousel of photos + a video slide.
8. **Closing film** — sunset video; "formal invitation to follow", names, flags.

Controls: language pill (top right) and music button (bottom right), both glass so they read on paper and video.

---

## 5. Motion

| Token           | Value                            | Use                               |
| --------------- | -------------------------------- | --------------------------------- |
| `--ease-silk`   | `cubic-bezier(0.16, 1, 0.3, 1)`  | Entrances, reveals, carousel      |
| `--ease-velvet` | `cubic-bezier(0.76, 0, 0.24, 1)` | Envelope flaps, line drawing      |
| `--ease-breeze` | `cubic-bezier(0.45, 0, 0.55, 1)` | Looping: breathing hint, heart    |

- Durations are long: reveals 1.4–1.6 s, envelope 2 s, carousel 1.2 s.
- **Smooth scrolling** via Lenis (falls back to native).
- Reveals: **fade + 26px rise only** — no blur, so text is crisp at every frame.
- Envelope: seal & texts lift away → top/bottom/side flaps slide out (staggered) → the film is already playing underneath.
- Butterflies wander on smooth sine paths, gliding now and then.
- Respect `prefers-reduced-motion`: no butterflies, instant reveals, no autoplay.
- Animate only `transform` and `opacity`.

---

## 6. Imagery, video & music

- Only our own photos and videos. Raw originals stay in `resources/` (git-ignored).
- Photos: max 1600px, JPEG q80, **EXIF/GPS stripped**.
- Videos: H.264, CRF 20–23, full 1080p (portrait crops for phones where needed), muted, `playsinline`,
  played only while on screen.

| File                | Source            | Where           |
| ------------------- | ----------------- | --------------- |
| `hero(-portrait)`   | beach kiss (edit) | Hero            |
| `story`             | walking together  | Our story       |
| `sand`              | couple on sand    | Carousel slide  |
| `closing(-portrait)`| sunset lift       | Closing         |

- **Music:** `assets/audio/song.mp3`, starts softly (fade-in) when the envelope is opened, loops, and can be muted
  at any time with the music button; the choice is remembered. If the file is missing the button is hidden.

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
| Reception  | 15:00 — Restaurant Casa Boema, Târgu Mureș  |

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
│   └── main.js               # envelope, music, carousel, butterflies, reveals, …
├── assets/
│   ├── florals/              # embossed SVG flowers (generated)
│   ├── img/                  # optimized photos
│   ├── video/                # optimized videos + posters
│   └── audio/                # background song
├── tools/
│   └── generate_emboss.py    # regenerates assets/florals
├── docs/
│   └── STYLE_GUIDE.md
└── resources/                # raw originals (git-ignored)
```

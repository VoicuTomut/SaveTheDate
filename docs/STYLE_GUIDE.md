# Save the Date — Style Guide

**Andrei & Camila · 16.05.2027 · Târgu Mureș**

This document is the single source of truth for how the Save the Date website looks, moves and speaks.
Every color, font, animation and sentence on the site should be traceable back to a rule here.

---

## 1. Concept & mood

> *"Two oceans apart, one horizon."*

Andrei is from **Romania** 🇷🇴, Camila is from **Santa Cruz, Bolivia** 🇧🇴.
Our photos were taken by the sea at sunrise — soft light, calm water, white linen.
The site should feel like that moment: **calm, airy, romantic, a little cinematic.**

| Keyword      | What it means in practice                                          |
| ------------ | ------------------------------------------------------------------ |
| **Serene**   | Lots of white space, slow transitions, no visual noise             |
| **Oceanic**  | Blue palette, waves as dividers, gentle floating motion            |
| **Elegant**  | Serif + script typography, thin lines, small gold accents only     |
| **Personal** | Real photos & video of us, the RO ↔ BO journey, three languages    |

**Avoid:** neon colors, heavy drop shadows, bouncy/cartoon easing, stock imagery, emoji in the main copy.

---

## 2. Color

The theme color is **blue**. All colors live as CSS custom properties in
[`css/colors.css`](../css/colors.css) — **never hard-code a hex value in components.**

Usage ratio (approximate):

- **60 %** light neutrals — ivory / mist backgrounds
- **30 %** blues — headings, sections, overlays, buttons
- **10 %** accents — sunrise gold for tiny details (dividers, seal, countdown digits glow)

Rules:

- Body text is always **deep navy on light** or **ivory on dark navy** (WCAG AA ≥ 4.5:1).
- Gold is decoration only — never use it for body text or small labels.
- Overlays on photos/video use a navy gradient so white text stays readable.

---

## 3. Typography

All fonts are loaded from Google Fonts and **must include the `latin-ext` subset**
so Romanian (`ă â î ș ț`) and Spanish (`á é í ó ú ñ ¡ ¿`) characters render correctly.

| Role              | Font                    | Weight      | Usage                                      |
| ----------------- | ----------------------- | ----------- | ------------------------------------------ |
| **Script**        | *Great Vibes*           | 400         | Couple's names, "&", signature moments only |
| **Display serif** | *Cormorant Garamond*    | 300 / 500 / 600, italic | Section titles, date, big numbers |
| **Body / UI**     | *Jost*                  | 300 / 400 / 500 | Paragraphs, labels, buttons, nav        |

Type scale (fluid with `clamp()`):

| Token        | Size                              | Used for                    |
| ------------ | --------------------------------- | --------------------------- |
| `--fs-names` | `clamp(3.5rem, 11vw, 8rem)`        | Andrei & Camila             |
| `--fs-h1`    | `clamp(2.25rem, 6vw, 4rem)`        | Big date, hero headline     |
| `--fs-h2`    | `clamp(1.75rem, 4vw, 2.75rem)`     | Section titles              |
| `--fs-h3`    | `clamp(1.25rem, 2.5vw, 1.6rem)`    | Card titles                 |
| `--fs-body`  | `clamp(1rem, 1.2vw, 1.125rem)`     | Paragraphs                  |
| `--fs-small` | `0.8125rem`                        | Eyebrows, captions, labels  |

Rules:

- Eyebrow labels (e.g. *SAVE THE DATE*, *CEREMONY*) use Jost, uppercase, `letter-spacing: 0.3em`.
- Line height: `1.7` for body, `1.1` for display text.
- Never set the script font below `2rem` — it becomes unreadable.
- Max line length for paragraphs: `60ch`.

---

## 4. Layout & spacing

- **Mobile first.** Most guests will open the link from WhatsApp on a phone.
- Spacing scale based on `0.25rem`: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 px`.
- Content max width: `1100px`; text blocks max `60ch`; side padding `clamp(1.25rem, 5vw, 3rem)`.
- Sections are full-width bands that alternate **light** (ivory/mist) and **deep** (navy) backgrounds,
  separated by **animated SVG waves**.
- Corners: `--radius-sm 6px`, `--radius-md 14px`, `--radius-lg 28px`, pills `999px`.
- Shadows: soft and blue-tinted only (`--shadow-soft`, `--shadow-lift`).
- Breakpoints: `640px` (large phone), `900px` (tablet), `1200px` (desktop).

### Page structure

1. **Envelope intro** — sealed envelope with wax seal "A&C"; language choice; tap to open.
2. **Hero** — sunset beach video, names in script, date, "Save the Date".
3. **Countdown** — days / hours / minutes / seconds to the ceremony.
4. **Our story** — Romania ↔ Bolivia animated route (Târgu Mureș ↔ Santa Cruz).
5. **The day** — Ceremony card + Reception card, with map links and *Add to calendar*.
6. **Godparents** — Ciprian & Andreea Nicoară.
7. **Gallery** — selected photos with reveal + lightbox.
8. **Footer** — "Formal invitation to follow", names, date.

---

## 5. Motion & animation

Fancy, but **slow and soft** — like waves, not fireworks.

| Token              | Value                                  | Use                        |
| ------------------ | -------------------------------------- | -------------------------- |
| `--ease-out-soft`  | `cubic-bezier(0.22, 1, 0.36, 1)`       | Reveals, entrances         |
| `--ease-in-out`    | `cubic-bezier(0.65, 0, 0.35, 1)`       | Envelope, page transitions |
| `--dur-fast`       | `250ms`                                | Hovers, buttons            |
| `--dur-med`        | `700ms`                                | Scroll reveals             |
| `--dur-slow`       | `1400ms`                               | Envelope, hero titles      |

Signature animations:

- **Envelope opening** — flap rotates in 3D, letter slides up, envelope fades away into the hero.
- **Names reveal** — letters of *Andrei & Camila* fade/blur in one by one.
- **Floating bubbles/light** — a subtle canvas layer of drifting light particles in blue & gold.
- **Waves** — layered SVG waves drift horizontally between sections.
- **Scroll reveals** — elements rise 24px and fade in when they enter the viewport (staggered).
- **Route line** — dotted arc draws itself from Târgu Mureș to Santa Cruz with a heart traveling along it.
- **Countdown** — digits flip softly when they change.

Rules:

- Animate only `transform`, `opacity` and `filter` (60 fps on phones).
- **Respect `prefers-reduced-motion`**: disable particles, waves drifting and staggered reveals; show content immediately.
- No animation should block reading for more than ~1.5 s (except the optional envelope, which waits for a tap).

---

## 6. Imagery

- Use **only our own photos and videos** from the sea shoot and Barcelona walk.
- Hero background: the sunset beach video (people-removed / kiss version), muted, looped, `playsinline`,
  with a still poster frame for slow connections.
- Photos are exported at **max 1600px** on the long edge, JPEG quality ~80, and **EXIF metadata (incl. GPS) is stripped**.
- Raw originals stay in `resources/` and are **not committed** (too large, private).
- Every image needs meaningful `alt` text; gallery images are lazy-loaded.

---

## 7. Voice & languages

The site is fully trilingual: **Română (default) · English · Español**.

- Language is auto-detected from the browser (`ro*` → RO, `es*` → ES, otherwise EN),
  can be switched at any time and is remembered; `?lang=ro|en|es` forces a language.
- All copy lives in one translations object in JavaScript — no hard-coded text in HTML
  except the default Romanian fallback.
- Tone: warm, joyful, short sentences. Address guests directly ("Vă așteptăm", "We'd love you to be there", "Los esperamos").
- Dates are always written out per locale: *Duminică, 16 mai 2027* · *Sunday, 16 May 2027* · *Domingo, 16 de mayo de 2027*.
- Times use 24h format in RO/ES (`12:00`, `15:00`) and the same in EN for consistency.
- Proper names never get translated: **Catedrala Mică**, **Casa Boema**, **Târgu Mureș**, **Santa Cruz**.

### Key facts (must be identical in every language)

| Item          | Value                                            |
| ------------- | ------------------------------------------------ |
| Couple        | Andrei & Camila                                  |
| Godparents    | Ciprian & Andreea Nicoară                        |
| Date          | Sunday, 16 May 2027                              |
| Ceremony      | 12:00 — Catedrala Mică, Târgu Mureș              |
| Reception     | 15:00 — Restaurant Casa Boema, Târgu Mureș       |

---

## 8. Accessibility & quality checklist

- [ ] Text contrast ≥ 4.5:1 (≥ 3:1 for large display text)
- [ ] All interactive elements reachable by keyboard with visible focus ring
- [ ] `lang` attribute on `<html>` updates with the selected language
- [ ] `prefers-reduced-motion` honored
- [ ] Works on iOS Safari & Android Chrome; video autoplays muted inline
- [ ] Page weight on first load < 5 MB (video streamed after)
- [ ] Open Graph tags so the WhatsApp/Messenger link preview shows a photo and the date

---

## 9. File organization

```
/
├── index.html            # single page
├── css/
│   ├── colors.css        # color tokens (only place with hex values)
│   └── style.css         # layout, components, animations
├── js/
│   ├── i18n.js           # RO / EN / ES translations
│   └── main.js           # envelope, countdown, particles, reveals, gallery
├── assets/
│   ├── img/              # optimized photos
│   └── video/            # optimized hero video + poster
├── docs/
│   └── STYLE_GUIDE.md    # this file
└── resources/            # raw originals (git-ignored)
```

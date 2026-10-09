# Save the Date — Andrei & Camila

**Sunday, 16 May 2027 · Târgu Mureș**

| | |
|---|---|
| Ceremony  | 12:00 — Catedrala Mică |
| Reception | 15:00 — Restaurant Casa Boema |
| Godparents | Ciprian & Andreea Nicoară |

A trilingual (Română · English · Español) single-page Save the Date with an envelope intro,
sunset video hero, live countdown, Romania ↔ Bolivia route animation, add-to-calendar and photo gallery.

## Run locally

```bash
python -m http.server 8000
# open http://localhost:8000          (auto-detects language)
# open http://localhost:8000/?lang=es (force a language: ro | en | es)
```

No build step — plain HTML, CSS and JavaScript.

## Structure

- `index.html` — page markup
- `css/colors.css` — color tokens (only place with color values)
- `css/style.css` — layout, components, animations
- `js/i18n.js` — all copy in RO / EN / ES
- `js/main.js` — envelope, countdown, particles, reveals, calendar, lightbox
- `assets/` — optimized photos & video (EXIF/GPS stripped)
- `docs/STYLE_GUIDE.md` — design rules
- `resources/` — raw originals (git-ignored)

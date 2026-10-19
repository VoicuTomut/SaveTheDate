# Save the Date — Andrei & Camila

**Sunday, 16 May 2027 · Târgu Mureș**

| | |
|---|---|
| Ceremony  | 12:00 — Catedrala Mică |
| Reception | 14:00 — Restaurant Casa Boema |
| Godparents | Ciprian & Andreea Nicoară |

A trilingual (Română · English · Español) single-page Save the Date on deep navy: a clean royal-navy velvet
curtain (cloth-simulated in Blender) draws open onto "Save the Date"; a drop of water then ripples our film
by the sea into view, followed by the date, our story, godparents and parents, the day's details, photo QR
codes and a closing film.

## Live site

**https://voicutomut.github.io/SaveTheDate/** — published from `main` with GitHub Pages
(append `?lang=ro`, `?lang=en` or `?lang=es` to force a language).

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
- `js/main.js` — intro (curtain → Save the Date → water drop), music, smooth scroll, auto-scroll, countdown, calendar, photo QR codes
- `js/ripple.js` — the WebGL water-drop transition
- `assets/` — optimized videos (EXIF/GPS stripped), embossed SVG flowers
- `tools/generate_emboss.py` — regenerates the embossed flower artwork
- `tools/blender/` — the velvet curtain scene (see its README)
- `docs/STYLE_GUIDE.md` — design rules
- `resources/` — raw originals (git-ignored)

## Credits

- Hero video sharpened with [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) (x4plus).

# Save the Date — Andrei & Camila

**Sunday, 16 May 2027 · Târgu Mureș**

| | |
|---|---|
| Ceremony  | 12:00 — Catedrala Mică |
| Reception | 14:00 — Restaurant Casa Boema |
| Godparents | Ciprian & Andreea Nicoară |

A trilingual (Română · English · Español) single-page Save the Date: a royal-navy velvet curtain
(cloth-simulated in Blender) draws open onto our film by the sea, followed by the date, our story,
godparents and parents, the day's details, photo QR codes and a closing film — with background music.

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
- `js/main.js` — curtain, music, smooth scroll, auto-scroll, countdown, calendar, photo QR codes
- `assets/` — optimized videos (EXIF/GPS stripped), embossed SVG flowers, `audio/song.mp3`
- `tools/generate_emboss.py` — regenerates the embossed flower artwork
- `tools/blender/` — the velvet curtain scene (see its README)
- `docs/STYLE_GUIDE.md` — design rules
- `resources/` — raw originals (git-ignored)

## Credits

- Music: Frédéric Chopin — *Nocturne in E-flat major, Op. 9 No. 2*, performed by Frank Levy.
  [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/), via
  [archive.org](https://archive.org/details/nocturneineflatmajorop.9no.2).
- Hero video sharpened with [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) (x4plus).

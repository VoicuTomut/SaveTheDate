"""Build the curtain opening for any Save the Date lettering in seconds.

The Blender curtain is rendered once over a transparent background
(tools/blender/build/<orient>-alpha/f0001.png …, see tools/blender/README.md).
This script captures the site's Save the Date screen with the chosen font and
lays the curtain frames over it with ffmpeg.

    python tools/composite_curtain.py --font "Pinyon Script"            # writes assets/video/curtain*.mp4
    python tools/composite_curtain.py --font "Pinyon Script" --preview out/   # preview only

Needs: a local server on http://127.0.0.1:5577 (python -m http.server 5577),
Node with playwright-core, Google Chrome and ffmpeg.
"""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "tools" / "blender" / "build"
CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"

CAPTURE_JS = r"""
const { chromium } = require("playwright-core");
const [out, font] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: %(chrome)s });
  for (const [name, vp, dpr] of [["portrait", { width: 390, height: 693 }, 1080 / 390],
                                 ["landscape", { width: 1440, height: 810 }, 1920 / 1440]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: dpr });
    await p.goto("http://127.0.0.1:5577/?lang=ro", { waitUntil: "load" });
    if (font) {
      await p.addStyleTag({ url: "https://fonts.googleapis.com/css2?family=" + font.replace(/ /g, "+") + "&display=swap" });
      await p.addStyleTag({ content: `:root { --font-std: "${font}", cursive; }` });
    }
    await p.addStyleTag({ content: ".env__film, .env__tap, .env__invite, .env__hint, .lang { display: none !important; }" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(1200);
    await p.locator("#std").screenshot({ path: `${out}/std_${name}.png` });
    await p.close();
  }
  await b.close();
})();
"""


def capture(out_dir, font, node_modules):
    js = Path(out_dir) / "capture.js"
    js.write_text(CAPTURE_JS % {"chrome": json.dumps(CHROME)}, encoding="utf-8")
    subprocess.run(["node", str(js), str(out_dir), font or ""], check=True,
                   cwd=node_modules, env={**__import__("os").environ, "NODE_PATH": str(Path(node_modules) / "node_modules")})


def compose(std_png, alpha_dir, out_mp4, scale=None):
    # the captured screen can be a pixel off the render size: match it to the curtain frames first
    vf = ("[0:v][1:v]scale2ref[bg][fg];[bg][fg]overlay=format=auto,format=yuv420p"
          + (f",scale={scale}" if scale else ""))
    subprocess.run([
        "ffmpeg", "-loglevel", "error", "-y",
        "-loop", "1", "-framerate", "30", "-i", str(std_png),
        "-framerate", "30", "-i", str(Path(alpha_dir) / "f%04d.png"),
        "-filter_complex", vf, "-frames:v", "100", "-an",
        "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", str(out_mp4),
    ], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--font", default="", help="Google Font family for Save the Date (empty = site default)")
    ap.add_argument("--preview", default=None, help="write small portrait previews here instead of assets/video")
    ap.add_argument("--node", default=None, help="folder whose node_modules has playwright-core")
    args = ap.parse_args()

    tmp = Path(tempfile.mkdtemp())
    capture(tmp, args.font, args.node or ROOT)
    if args.preview:
        out = Path(args.preview)
        out.mkdir(parents=True, exist_ok=True)
        name = (args.font or "default").replace(" ", "_")
        compose(tmp / "std_portrait.png", BUILD / "portrait-alpha", out / f"{name}.mp4", scale="540:-2")
        print("preview:", out / f"{name}.mp4")
        return
    video = ROOT / "assets" / "video"
    for orient, suffix in (("portrait", "-portrait"), ("landscape", "")):
        compose(tmp / f"std_{orient}.png", BUILD / f"{orient}-alpha", video / f"curtain{suffix}.mp4")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(BUILD / f"{orient}-alpha" / "f0001.png"),
                        "-q:v", "2", str(video / f"curtain{suffix}-poster.jpg")], check=True)
        (ROOT / "tools" / "blender" / "textures" / f"std_{orient}.png").write_bytes((tmp / f"std_{orient}.png").read_bytes())
    print("curtain videos written for font:", args.font or "(site default)")


if __name__ == "__main__":
    main()

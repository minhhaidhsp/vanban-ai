"""Download DejaVu Serif fonts into backend/app/static/fonts/."""
import io
import os
import urllib.request
import zipfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "app", "static", "fonts"))
os.makedirs(OUT_DIR, exist_ok=True)

NEEDED = {
    "DejaVuSerif.ttf",
    "DejaVuSerif-Bold.ttf",
    "DejaVuSerif-Italic.ttf",
    "DejaVuSerif-BoldItalic.ttf",
}

already = {f for f in NEEDED if os.path.exists(os.path.join(OUT_DIR, f))}
if already == NEEDED:
    print("All fonts already present — nothing to do.")
    raise SystemExit(0)

ZIP_URL = (
    "https://github.com/dejavu-fonts/dejavu-fonts/releases/download/"
    "version_2_37/dejavu-fonts-ttf-2.37.zip"
)
print(f"Downloading {ZIP_URL} ...")
req = urllib.request.Request(ZIP_URL, headers={"User-Agent": "python/3.12"})
with urllib.request.urlopen(req, timeout=120) as resp:
    data = resp.read()
print(f"  {len(data):,} bytes downloaded")

with zipfile.ZipFile(io.BytesIO(data)) as zf:
    for entry in zf.namelist():
        fname = os.path.basename(entry)
        if fname in NEEDED:
            dest = os.path.join(OUT_DIR, fname)
            with zf.open(entry) as src, open(dest, "wb") as dst:
                dst.write(src.read())
            print(f"  extracted {fname}  ({os.path.getsize(dest):,} bytes)")

print(f"\nFonts saved to: {OUT_DIR}")

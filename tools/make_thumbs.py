#!/usr/bin/env python3
"""Добавляет встроенные превью (WebP, base64) в src/thumbs.html для фото из PHOTOS, у которых превью ещё нет.

Берёт фото из photos/<slug>.webp (сначала запустите tools/fetch_photos.py).
Размер: 420x280 для обложек городов и мест с историей (как у остальных), 240x160 — для остальных.
Запуск из папки проекта: python3 tools/fetch_photos.py && python3 tools/make_thumbs.py
"""
import base64, io, json, os, re, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from fetch_photos import slug  # noqa: E402

THUMBS = os.path.join(ROOT, "src", "thumbs.html")


def big_keys():
    """Ключи, которым нужен большой размер: photoKey города и места с историей (storyId)."""
    js = r'''
const fs=require("fs"); const s=fs.readFileSync(process.argv[1],"utf8");
const a=s.indexOf("<script id=\"qz-data\">")+21, b=s.indexOf("</script>",a);
const m={exports:{}}; new Function("module", s.slice(a,b)+";module.exports={CITIES,PHOTOS};")(m);
const big=[]; for (const c of Object.values(m.exports.CITIES)) { big.push(c.photoKey); c.spots.forEach((x)=>{ if (x.storyId) big.push(x.w); }); }
console.log(JSON.stringify({big, keys: Object.keys(m.exports.PHOTOS)}));'''
    out = subprocess.run(["node", "-e", js, os.path.join(ROOT, "src", "index.src.html")], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def thumb(path, size):
    im = Image.open(path).convert("RGB")
    tw, th = size
    k = max(tw / im.width, th / im.height)
    im = im.resize((max(tw, round(im.width * k)), max(th, round(im.height * k))), Image.LANCZOS)
    x, y = (im.width - tw) // 2, (im.height - th) // 2
    im = im.crop((x, y, x + tw, y + th))
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=62 if size[0] > 300 else 58, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def main():
    info = big_keys()
    src = open(THUMBS, encoding="utf-8").read()
    have = set(json.loads('"' + k + '"') for k in re.findall(r'^"((?:[^"\\]|\\.)*)": "data:', src, re.M))
    add, missing = [], []
    for key in info["keys"]:
        if key in have:
            continue
        f = os.path.join(ROOT, "photos", slug(key) + ".webp")
        if not os.path.exists(f):
            missing.append(key); continue
        size = (420, 280) if key in info["big"] else (240, 160)
        add.append(f'{json.dumps(key, ensure_ascii=False)}: "{thumb(f, size)}"')
    if add:
        i = src.rindex("\n};")
        src = src[:i] + ",\n" + ",\n".join(add) + src[i:]
        open(THUMBS, "w", encoding="utf-8").write(src)
    print(f"добавлено превью: {len(add)}; нет фото в photos/: {len(missing)} {missing[:8]}")


if __name__ == "__main__":
    main()

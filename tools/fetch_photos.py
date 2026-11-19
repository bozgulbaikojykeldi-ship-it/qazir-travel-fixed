#!/usr/bin/env python3
"""Скачивает фото из PHOTOS (src/index.src.html) с Wikimedia в хорошем качестве для сторис.

Результат: photos/<slug>.webp, вписано в квадрат 1920x1920 (WebP).
Эти файлы лежат рядом с index.html на хостинге: сторис рисуются с ними в 1080x1920.
Запуск из папки проекта:  python3 tools/fetch_photos.py        (только недостающие)
                          python3 tools/fetch_photos.py --all  (перекачать все)
Имя файла (slug) считается так же, как в приложении: функция photoSlug() в src/index.src.html.
"""
import io, os, re, shutil, subprocess, sys, time, unicodedata, urllib.error, urllib.parse, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "index.src.html")
OUT = os.path.join(ROOT, "photos")
UA = "QazirTravelPhotoCache/1.0 (static travel guide; photos shown with author and license)"
BOX = 1920
QUALITY = 74


def slug(key):
    s = unicodedata.normalize("NFKD", key)
    s = "".join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def photos():
    src = open(SRC, encoding="utf-8").read()
    block = src[src.index("const PHOTOS = {"):]
    block = block[:block.index("\n};")]
    rx = re.compile(r'^\s*"((?:[^"\\]|\\.)*)":\s*\{file:\s*"((?:[^"\\]|\\.)*)",\s*p:\s*"([^"]+)",\s*w:\s*(\d+),\s*h:\s*(\d+)', re.M)
    return [(k.replace('\\"', '"'), f.replace('\\"', '"'), p, int(w), int(h)) for k, f, p, w, h in rx.findall(block)]


def url(file, p, w, width):
    name = urllib.parse.quote(file.replace(" ", "_"), safe="")
    base = "https://upload.wikimedia.org/wikipedia/"
    if w <= width:
        return base + p + "/" + name
    return base + re.sub(r"^([a-z]+)/", r"\1/thumb/", p) + "/" + name + "/" + str(width) + "px-" + name


def get(u):
    # curl, если он есть: Wikimedia чаще отвечает «429 Too many requests» на запросы из urllib
    if shutil.which("curl"):
        r = subprocess.run(["curl", "-sS", "-f", "-L", "-A", UA, "--max-time", "60", "-w", "\n%{http_code}", u], capture_output=True)
        body, _, code = r.stdout.rpartition(b"\n")
        if r.returncode == 0:
            return body
        raise urllib.error.HTTPError(u, int(code or 0), r.stderr.decode(errors="replace").strip(), None, None)
    req = urllib.request.Request(u, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    redo = "--all" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    items = photos()
    slugs = [slug(k) for k, *_ in items]
    dup = {s for s in slugs if slugs.count(s) > 1}
    if dup:
        sys.exit("Одинаковые имена файлов: " + ", ".join(sorted(dup)))
    ok = fail = 0
    for key, file, p, w, h in items:
        dst = os.path.join(OUT, slug(key) + ".webp")
        if os.path.exists(dst) and not redo:
            continue
        # для вертикальных фото нужна ширина поменьше, чтобы высота уложилась в 1920
        want = 1920 if w >= h else 1280
        data = None
        for width in (want, 1280, 960):
            for attempt in range(4):
                try:
                    data = get(url(file, p, w, width))
                    break
                except urllib.error.HTTPError as e:
                    err = e
                    if e.code != 429:
                        break
                    time.sleep(20 * (attempt + 1))  # Wikimedia просит не спешить: ждём и пробуем снова
                except Exception as e:  # noqa: BLE001
                    err = e
                    break
            if data is not None:
                break
        if data is None:
            print("НЕ СКАЧАНО:", key, "—", err)
            fail += 1
            continue
        im = Image.open(io.BytesIO(data)).convert("RGB")
        im.thumbnail((BOX, BOX), Image.LANCZOS)
        im.save(dst, "WEBP", quality=QUALITY, method=6)
        ok += 1
        print(f"{slug(key)}.webp {im.size[0]}x{im.size[1]} {os.path.getsize(dst)//1024} KB")
        time.sleep(4)
    print(f"готово: {ok} скачано, {fail} ошибок, всего в PHOTOS {len(items)}")


if __name__ == "__main__":
    main()

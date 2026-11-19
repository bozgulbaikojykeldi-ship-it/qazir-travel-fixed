#!/bin/sh
# Собирает итоговый index.html: рабочий файл src/index.src.html + встроенные фото src/thumbs.html.
# Заодно меняет версию офлайн-кэша в sw.js, чтобы телефоны получили новую версию сайта.
cd "$(dirname "$0")" || exit 1
python3 - <<'PY'
import hashlib, re
src = open("src/index.src.html", encoding="utf-8").read()
th = open("src/thumbs.html", encoding="utf-8").read()
assert "<!--THUMBS-->\n" in src
out = src.replace("<!--THUMBS-->\n", th)
open("index.html", "w", encoding="utf-8").write(out)
ver = hashlib.md5(out.encode()).hexdigest()[:10]
sw = open("sw.js", encoding="utf-8").read()
sw = re.sub(r'const VERSION = "qz-[^"]*";', f'const VERSION = "qz-{ver}";', sw)
open("sw.js", "w", encoding="utf-8").write(sw)
print("index.html собран:", len(out.encode()) // 1024, "KB · версия кэша", ver)
PY

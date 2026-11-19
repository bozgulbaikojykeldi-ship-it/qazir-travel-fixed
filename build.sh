#!/bin/sh
# Собирает итоговый index.html: рабочий файл src/index.src.html + встроенные фото src/thumbs.html
cd "$(dirname "$0")" || exit 1
python3 - <<'PY'
src = open("src/index.src.html", encoding="utf-8").read()
th = open("src/thumbs.html", encoding="utf-8").read()
assert "<!--THUMBS-->\n" in src
open("index.html", "w", encoding="utf-8").write(src.replace("<!--THUMBS-->\n", th))
print("index.html собран:", len((src.replace("<!--THUMBS-->\n", th)).encode()) // 1024, "KB")
PY

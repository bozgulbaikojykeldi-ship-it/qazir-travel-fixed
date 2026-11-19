#!/usr/bin/env python3
"""Фирменный QR-код Qazir Travel: точки вместо квадратов, «глаза» в цветах логотипа, логотип в центре.

Запуск из папки проекта: python3 tools/make_qr.py [ссылка]
Результат: marketing/qr-brand.png (прозрачный фон) и marketing/qr-brand-white.png (белая подложка).
Ссылку по умолчанию берёт из CONTACT.site. После смены домена — запустить заново.
Проверка: каждый файл распознаётся сканером (zxing-cpp и OpenCV), иначе скрипт падает.
"""
import os, re, sys
import qrcode
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "marketing")
INK, SKY, SUN = (11, 37, 69), (27, 179, 209), (255, 194, 46)
TEAL = (8, 96, 120)   # тёмный бирюзовый: в цвет бренда, но достаточно тёмный для сканера
M = 40          # пикселей на модуль
QUIET = 2       # поля в модулях (подложка карточки добавляет ещё)


def site_url():
    s = open(os.path.join(ROOT, "src", "index.src.html"), encoding="utf-8").read()
    return re.search(r'site: "([^"]+)"', s).group(1)


def logo(size):
    """Логотип: тёмный круг, голубое кольцо, жёлтый «хвост» и точка (как icons/icon.svg)."""
    k = 4  # рисуем крупнее и уменьшаем — сглаживание
    S = size * k
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.24), fill=INK + (255,))
    u = S / 112  # координаты как в SVG 112×112, логотип 56×56 со сдвигом 14 и масштабом 1.3125
    tr = lambda x, y: (14 * u + x * 1.3125 * u, 14 * u + y * 1.3125 * u)
    cx, cy = tr(28, 28); r = 17 * 1.3125 * u; w = 8 * 1.3125 * u
    d.ellipse([cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2], outline=SKY + (255,), width=int(w))
    pts = [tr(38 + (56 - 38) * t / 20, 38 + ((1 - t / 20) ** 2 * 0 + 2 * (1 - t / 20) * (t / 20) * 8 + (t / 20) ** 2 * 12)) for t in range(21)]
    d.line(pts, fill=SUN + (255,), width=int(w), joint="curve")
    for p in (pts[0], pts[-1]):
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=SUN + (255,))
    rd = 4.5 * 1.3125 * u
    d.ellipse([cx - rd, cy - rd, cx + rd, cy + rd], fill=SUN + (255,))
    return im.resize((size, size), Image.LANCZOS)


def icon_logo(size):
    """Логотип из иконки приложения (icons/icon-512.png, её рисует tools/make_assets.mjs) со скруглёнными углами."""
    path = os.path.join(ROOT, "icons", "icon-512.png")
    if not os.path.exists(path):
        return logo(size)
    im = Image.open(path).convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.24), fill=255)
    im.putalpha(mask.resize((size, size), Image.LANCZOS))
    return im


def draw_qr(url):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=0)
    qr.add_data(url); qr.make(fit=True)
    mat = qr.get_matrix(); n = len(mat)
    size = (n + 2 * QUIET) * M
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    eyes = [(0, 0), (n - 7, 0), (0, n - 7)]
    in_eye = lambda r, c: any(er <= r < er + 7 and ec <= c < ec + 7 for er, ec in eyes)
    lg = int(n * 0.22) | 1            # сторона логотипа в модулях (нечётная, ~22 % ширины)
    lo = (n - lg) // 2
    in_logo = lambda r, c: lo - 1 <= r <= lo + lg and lo - 1 <= c <= lo + lg
    for r in range(n):
        for c in range(n):
            if not mat[r][c] or in_eye(r, c) or in_logo(r, c):
                continue
            x, y = (c + QUIET) * M, (r + QUIET) * M
            rad = M * 0.46
            d.ellipse([x + M / 2 - rad, y + M / 2 - rad, x + M / 2 + rad, y + M / 2 + rad], fill=INK + (255,))
    for er, ec in eyes:  # «глаза» должны быть тёмными, иначе телефон не найдёт код: тёмная рамка и тёмно-бирюзовый центр (светлая точка в центре ломает распознавание)
        x, y = (ec + QUIET) * M, (er + QUIET) * M
        d.rounded_rectangle([x, y, x + 7 * M - 1, y + 7 * M - 1], radius=int(M * 0.9), fill=INK + (255,))
        d.rounded_rectangle([x + M, y + M, x + 6 * M - 1, y + 6 * M - 1], radius=int(M * 0.6), fill=(0, 0, 0, 0))
        d.rounded_rectangle([x + 2 * M, y + 2 * M, x + 5 * M - 1, y + 5 * M - 1], radius=int(M * 0.5), fill=TEAL + (255,))
    # белая «подушка» вокруг логотипа и сам логотип
    x0 = (lo + QUIET) * M
    L = icon_logo(lg * M)
    pad = Image.new("RGBA", (lg * M + M, lg * M + M), (0, 0, 0, 0))
    ImageDraw.Draw(pad).rounded_rectangle([0, 0, pad.width - 1, pad.height - 1], radius=int(M * 2), fill=(255, 255, 255, 255))
    im.alpha_composite(pad, (x0 - M // 2, x0 - M // 2))
    im.alpha_composite(L, (x0, x0))
    return im


def decodes(img):
    """Распознаётся ли QR — zxing-cpp (как в телефонах) и OpenCV; плюс уменьшенная и размытая копии."""
    import numpy as np, zxingcpp, cv2
    bg = Image.new("RGB", img.size, "white"); bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
    # как видит камера: половина, четверть, треть с размытием
    tests = [bg.resize((bg.width // 2, bg.height // 2), Image.LANCZOS), bg.resize((bg.width // 4, bg.height // 4), Image.LANCZOS), bg.resize((bg.width // 3, bg.height // 3)).filter(ImageFilter.GaussianBlur(1.2))]
    out = []
    for t in tests:
        z = zxingcpp.read_barcodes(t)
        a = cv2.cvtColor(np.array(t), cv2.COLOR_RGB2BGR)
        cvv, _, _ = cv2.QRCodeDetector().detectAndDecode(a)
        out.append((z[0].text if z else "", cvv))
    return out


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else site_url()
    os.makedirs(OUT, exist_ok=True)
    qr = draw_qr(url)
    qr.save(os.path.join(OUT, "qr-brand.png"))
    white = Image.new("RGBA", (qr.width + 4 * M, qr.height + 4 * M), (255, 255, 255, 255))
    white.alpha_composite(qr, (2 * M, 2 * M))
    white.convert("RGB").save(os.path.join(OUT, "qr-brand-white.png"))
    res = decodes(white)
    print("ссылка:", url)
    for i, (z, cv) in enumerate(res):
        print(f"  проверка {i + 1}: zxing={'OK' if z == url else 'НЕТ'} opencv={'OK' if cv == url else 'нет'}")
    # zxing (ядро многих телефонных сканеров) — во всех случаях; OpenCV — хотя бы в двух
    if not all(z == url for z, _ in res) or sum(cv == url for _, cv in res) < 2:
        sys.exit("QR не распознаётся — упростите стиль")


if __name__ == "__main__":
    main()

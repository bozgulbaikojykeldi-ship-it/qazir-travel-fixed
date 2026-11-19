// Рисует иконки приложения (icons/) и картинку превью ссылки (og.png) через Playwright.
// Запуск из папки проекта: node tools/make_assets.mjs   (нужен playwright: npm i playwright)
import pw from "playwright";
import fs from "node:fs";
const {chromium} = pw;

const LOGO = (size, pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 112 112">
  <rect width="112" height="112" fill="#0B2545"/>
  <g transform="translate(${56 - 28 * pad} ${56 - 28 * pad}) scale(${pad})">
    <circle cx="28" cy="28" r="17" fill="none" stroke="#1BB3D1" stroke-width="8"/>
    <path d="M38 38 Q46 46 56 50" fill="none" stroke="#FFC22E" stroke-width="8" stroke-linecap="round"/>
    <circle cx="28" cy="28" r="4.5" fill="#FFC22E"/>
  </g></svg>`;

const OG = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Manrope:wght@600;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; background: #0B2545; color: #fff; font-family: Manrope, sans-serif; position: relative; overflow: hidden; }
  .ring { position: absolute; right: -120px; top: -120px; width: 420px; height: 420px; border-radius: 50%; border: 80px solid #1BB3D1; opacity: .9; box-sizing: border-box; }
  .sun { position: absolute; right: 70px; top: 70px; width: 56px; height: 56px; border-radius: 50%; background: #FFC22E; }
  .logo { position: absolute; left: 72px; top: 64px; display: flex; align-items: center; gap: 16px; font: 800 38px Montserrat, sans-serif; }
  .logo svg { width: 64px; height: 64px; border-radius: 14px; }
  h1 { position: absolute; left: 72px; top: 190px; margin: 0; font: 800 66px/1.12 Montserrat, sans-serif; letter-spacing: -.02em; max-width: 900px; }
  p { position: absolute; left: 72px; top: 370px; margin: 0; font-size: 30px; opacity: .9; max-width: 900px; }
  .chips { position: absolute; left: 72px; bottom: 64px; display: flex; gap: 14px; }
  .chips span { background: rgba(255,255,255,.12); border-radius: 999px; padding: 12px 22px; font: 700 26px Manrope, sans-serif; }
  .chips span.v { background: #FFC22E; color: #0B2545; }
</style></head><body>
  <div class="ring"></div><div class="sun"></div>
  <div class="logo">${LOGO(64, 1.3125)}<span>qazir<span style="color:#1BB3D1">.travel</span></span></div>
  <h1>Еуропаға саяхат және Шенген визасы</h1>
  <p>Маршрут по Европе, шенгенская виза и красивые сторис</p>
  <div class="chips"><span class="v">🛂 Виза</span><span>🧭 Маршрут</span><span>📲 Сторис</span></div>
</body></html>`;

fs.mkdirSync("icons", {recursive: true});
fs.writeFileSync("icons/icon.svg", LOGO(512, 1.3125));
const browser = await chromium.launch();
const page = await browser.newPage();
const shot = async (html, w, h, path) => {
  await page.setViewportSize({width: w, height: h});
  await page.setContent(html, {waitUntil: "networkidle"});
  await page.screenshot({path, clip: {x: 0, y: 0, width: w, height: h}});
  console.log("✓", path);
};
const icon = (size, pad) => `<html><body style="margin:0">${LOGO(size, pad)}</body></html>`;
await shot(icon(192, 1.3125), 192, 192, "icons/icon-192.png");
await shot(icon(512, 1.3125), 512, 512, "icons/icon-512.png");
await shot(icon(512, 1.0), 512, 512, "icons/icon-maskable-512.png"); // логотип в «безопасной зоне» 80 %
await shot(icon(180, 1.3125), 180, 180, "icons/apple-touch-icon.png");
await shot(OG, 1200, 630, "og.png");
await browser.close();

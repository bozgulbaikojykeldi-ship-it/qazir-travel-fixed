// Рекламные макеты с фирменным QR-кодом: открытка для печати, пост и сторис для Instagram.
// Запуск из папки проекта (сначала python3 tools/make_qr.py):  node tools/make_marketing.mjs
// Результат: marketing/qr-card-print.png (A6, 300 dpi), marketing/qr-post.png (1080×1350), marketing/qr-story.png (1080×1920).
// Фото: photos/rome.webp (CC0, Julian Lupyan) и photos/eiffel-tower.webp (общественное достояние, Benh LIEU SONG) — подпись не обязательна.
import pw from "playwright";
import fs from "node:fs";
const {chromium} = pw;

const b64 = (p, type) => `data:${type};base64,${fs.readFileSync(p).toString("base64")}`;
const QR = b64("marketing/qr-brand.png", "image/png");
const ICON = b64("icons/icon-512.png", "image/png");
const ROME = b64("photos/rome.webp", "image/webp");
const EIFFEL = b64("photos/eiffel-tower.webp", "image/webp");
const src = fs.readFileSync("src/index.src.html", "utf8");
const WA = src.match(/whatsappLabel: "([^"]+)"/)[1];
const TG = src.match(/telegram: "([^"]+)"/)[1];

const HEAD = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Manrope:wght@500;600;700;800&family=Bad+Script&display=swap" rel="stylesheet">
<style>
  :root { --ink: #0B2545; --sky: #1BB3D1; --sun: #FFC22E; }
  * { box-sizing: border-box; }
  body { margin: 0; overflow: hidden; position: relative; font-family: Manrope, sans-serif; color: #fff; background: var(--ink); }
  .brand { display: flex; align-items: center; gap: .45em; font: 800 1em Montserrat, sans-serif; letter-spacing: -.01em; }
  .brand img { width: 1.5em; height: 1.5em; border-radius: .36em; }
  .brand b { color: var(--sky); }
  .card { background: #fff; color: var(--ink); text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,.35); }
  .card img { display: block; margin: 0 auto; }
  .pill { display: inline-flex; align-items: center; gap: .4em; background: var(--sun); color: var(--ink); border-radius: 999px; font: 800 1em Montserrat, sans-serif; }
  .chips { display: flex; flex-wrap: wrap; gap: .5em; }
  .chips span { background: rgba(255,255,255,.13); border-radius: 999px; padding: .45em .9em; font-weight: 700; }
  .script { font-family: "Bad Script", cursive; color: var(--sun); line-height: 1; }
</style></head><body>`;

// 1) Открытка A6 для печати (105×148 мм при 300 dpi)
const PRINT = `${HEAD}
<style>
  body { width: 1240px; height: 1748px; }
  .ring { position: absolute; right: -170px; top: -170px; width: 560px; height: 560px; border-radius: 50%; border: 104px solid var(--sky); }
  .sun { position: absolute; right: 96px; top: 96px; width: 74px; height: 74px; border-radius: 50%; background: var(--sun); }
  .brand { position: absolute; left: 96px; top: 92px; font-size: 54px; }
  h1 { position: absolute; left: 96px; top: 250px; width: 900px; margin: 0; font: 800 76px/1.1 Montserrat, sans-serif; letter-spacing: -.02em; }
  h1 em { font-style: normal; color: var(--sun); }
  .sub { position: absolute; left: 96px; top: 520px; width: 980px; margin: 0; font-size: 34px; font-weight: 600; opacity: .85; }
  .card { position: absolute; left: 50%; top: 640px; transform: translateX(-50%); width: 760px; padding: 44px 44px 34px; border-radius: 56px; }
  .card img { width: 672px; height: 672px; }
  .card .cta { margin-top: 18px; font: 800 36px Montserrat, sans-serif; }
  .card .cta2 { margin-top: 6px; font-size: 27px; font-weight: 600; opacity: .7; }
  .chips { position: absolute; left: 60px; right: 60px; top: 1528px; justify-content: center; font-size: 29px; flex-wrap: nowrap; }
  .chips .free { background: var(--sun); color: var(--ink); font-weight: 800; }
  .foot { position: absolute; left: 0; right: 0; bottom: 70px; text-align: center; white-space: nowrap; font-size: 32px; font-weight: 700; }
</style>
<div class="ring"></div><div class="sun"></div>
<div class="brand"><img src="${ICON}"><span>qazir<b>.travel</b></span></div>
<h1>Еуропаға саяхат пен<br><em>Шенген визасы</em> —<br>бір қосымшада</h1>
<p class="sub">Маршрут, шенгенская виза, сторис и помощь в поездке — в одном приложении</p>
<div class="card"><img src="${QR}">
  <div class="cta">📷 Камераны бағыттаңыз</div>
  <div class="cta2">Наведите камеру — откроется приложение</div></div>
<div class="chips"><span>🛂 Виза</span><span>🧭 Маршрут</span><span>📲 Сторис</span><span>🆘 SOS</span><span class="free">Тегін · Бесплатно</span></div>
<div class="foot">WhatsApp ${WA} · Telegram @${TG}</div>
</body></html>`;

// 2) Пост Instagram 4:5
const POST = `${HEAD}
<style>
  body { width: 1080px; height: 1350px; }
  .bg { position: absolute; inset: 0; background: url(${ROME}) center/cover; }
  .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(11,37,69,.82) 0%, rgba(11,37,69,.25) 34%, rgba(11,37,69,.15) 50%, rgba(11,37,69,.92) 78%, #0B2545 100%); }
  .brand { position: absolute; left: 64px; top: 60px; font-size: 40px; }
  .pill { position: absolute; left: 64px; top: 150px; font-size: 28px; padding: .45em 1em; }
  h1 { position: absolute; left: 64px; top: 236px; width: 900px; margin: 0; font: 800 64px/1.08 Montserrat, sans-serif; letter-spacing: -.02em; text-shadow: 0 4px 24px rgba(0,0,0,.35); }
  .script { position: absolute; left: 60px; top: 840px; font-size: 128px; transform: rotate(-6deg); text-shadow: 0 4px 20px rgba(0,0,0,.4); }
  .list { position: absolute; left: 64px; top: 1010px; width: 560px; margin: 0; padding: 0; list-style: none; font-size: 30px; font-weight: 700; line-height: 1.55; }
  .foot { position: absolute; left: 64px; bottom: 50px; font-size: 25px; font-weight: 700; opacity: .9; }
  .card { position: absolute; right: 56px; bottom: 56px; width: 426px; padding: 24px 24px 18px; border-radius: 40px; }
  .card img { width: 378px; height: 378px; }
  .card div { margin-top: 10px; font: 800 26px Montserrat, sans-serif; }
  .card small { display: block; font: 600 20px Manrope, sans-serif; opacity: .65; margin-top: 2px; }
</style>
<div class="bg"></div><div class="shade"></div>
<div class="brand"><img src="${ICON}"><span>qazir<b>.travel</b></span></div>
<div class="pill">📍 Еуропадағы 9 қала</div>
<h1>Шенген визасы мен саяхат жоспары — бір қосымшада</h1>
<div class="script">Еуропа</div>
<ul class="list"><li>🛂 Виза: құжаттар мен мерзімдер</li><li>🧭 Күн сайынғы маршрут</li><li>📲 Әдемі сторис</li><li>🆘 Елшілік, 112, ₸ курс</li></ul>
<div class="foot">WhatsApp ${WA} · TG @${TG}</div>
<div class="card"><img src="${QR}"><div>📷 Сканерлеңіз</div><small>Сканируйте · Тегін</small></div>
</body></html>`;

// 3) Сторис 9:16: сверху ~230 px и снизу ~260 px свободно — там имя профиля и строка ответа Instagram
const STORY = `${HEAD}
<style>
  body { width: 1080px; height: 1920px; }
  .bg { position: absolute; inset: 0; background: url(${EIFFEL}) center 30%/cover; }
  .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(11,37,69,.7) 0%, rgba(11,37,69,.1) 22%, rgba(11,37,69,.05) 40%, rgba(11,37,69,.78) 62%, #0B2545 100%); }
  .brand { position: absolute; left: 0; right: 0; top: 240px; justify-content: center; font-size: 44px; }
  .pill { position: absolute; left: 50%; top: 340px; transform: translateX(-50%); font-size: 30px; padding: .45em 1.1em; white-space: nowrap; }
  .script { position: absolute; left: 0; right: 0; top: 680px; text-align: center; font-size: 190px; transform: rotate(-5deg); text-shadow: 0 6px 26px rgba(0,0,0,.45); }
  h1 { position: absolute; left: 80px; right: 80px; top: 890px; margin: 0; text-align: center; font: 800 58px/1.12 Montserrat, sans-serif; letter-spacing: -.02em; }
  .sub { position: absolute; left: 80px; right: 80px; top: 1040px; margin: 0; text-align: center; font-size: 32px; font-weight: 600; opacity: .88; }
  .card { position: absolute; left: 50%; top: 1120px; transform: translateX(-50%); width: 430px; padding: 26px 26px 20px; border-radius: 44px; }
  .card img { width: 378px; height: 378px; }
  .card div { margin-top: 10px; font: 800 28px Montserrat, sans-serif; }
  .foot { position: absolute; left: 0; right: 0; top: 1610px; text-align: center; font-size: 28px; font-weight: 700; opacity: .92; }
</style>
<div class="bg"></div><div class="shade"></div>
<div class="brand"><img src="${ICON}"><span>qazir<b>.travel</b></span></div>
<div class="pill">📍 Еуропа · 9 қала</div>
<div class="script">Еуропа</div>
<h1>Сапарыңды жоспарла, визаны бізбен рәсімде</h1>
<p class="sub">Маршрут · Шенген визасы · Сторис · SOS</p>
<div class="card"><img src="${QR}"><div>📷 Сканерлеңіз · Тегін</div></div>
<div class="foot">WhatsApp ${WA} · Telegram @${TG}</div>
</body></html>`;

fs.mkdirSync("marketing", {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [html, w, h, path] of [[PRINT, 1240, 1748, "marketing/qr-card-print.png"], [POST, 1080, 1350, "marketing/qr-post.png"], [STORY, 1080, 1920, "marketing/qr-story.png"]]) {
  await page.setViewportSize({width: w, height: h});
  await page.setContent(html, {waitUntil: "networkidle"});
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path, clip: {x: 0, y: 0, width: w, height: h}});
  console.log("✓", path);
}
await browser.close();

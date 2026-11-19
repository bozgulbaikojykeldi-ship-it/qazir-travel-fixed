// Виза и сторис: консульство, сроки, паспорт, ссылка WhatsApp, PDF маршрута, редактор сторис.
// Запуск из папки проекта: node tests/visa_story_test.mjs
import pw from "playwright";
import fs from "node:fs";
const {chromium} = pw;
const FILE = process.env.QZ_FILE || "file://" + process.cwd() + "/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
await page.goto(FILE); await page.waitForTimeout(300);
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
let fails = 0;
const check = (name, ok, extra) => { if (!ok) fails++; console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };

// 1. консульство: больше всего дней
const r1 = await page.evaluate(() => {
  Object.assign(QZ.S, {cities: ["paris", "venice", "milan", "rome"], startCity: null, autoEnd: true, days: 10, start: "2026-12-19", people: 2});
  const v = QZ.visaTrip();
  return {main: v.main.key, tie: v.tie, list: v.list.map((e) => e.key + ":" + e.days).join(" "), end: v.end.toISOString().slice(0, 10)};
});
check("консульство по большинству дней", r1.main === "Italy" && !r1.tie, JSON.stringify(r1));

// 2. дней поровну → страна первого въезда (первый город маршрута)
const r2 = await page.evaluate(() => {
  Object.assign(QZ.S, {cities: ["vienna", "paris"], startCity: "vienna", days: 3});
  QZ.S.days = 2; const v = QZ.visaTrip();
  return {main: v.main.key, tie: v.tie, list: v.list.map((e) => e.key + ":" + e.days).join(" ")};
});
check("дней поровну → страна первого въезда", r2.main === "Austria" && r2.tie, JSON.stringify(r2));

// 3. сообщение и ссылка WhatsApp
await page.evaluate(() => Object.assign(QZ.S, {cities: ["paris", "venice", "milan", "rome"], startCity: null, days: 10, start: "2026-12-19", people: 2, lang: "ru", view: "visa"}));
await page.evaluate(() => QZ.render());
const wa = await page.$eval("#view-visa a.btn-wa", (a) => a.href);
const msg = decodeURIComponent(wa.split("text=")[1] || "");
check("ссылка WhatsApp на нужный номер", wa.startsWith("https://wa.me/77719895607?text="), wa.slice(0, 40));
check("в сообщении даты, маршрут, консульство, люди", /19\.12\.2026 – 28\.12\.2026/.test(msg) && /Париж → /.test(msg) && /Италия/.test(msg) && /Человек: 2/.test(msg), msg.replace(/\n/g, " | "));

// 4. сроки подачи: не раньше чем за 6 мес., не позже чем за 15 дней
const win = await page.$eval("#view-visa .v-big", (e) => e.textContent);
check("окно подачи 19.06.2026 – 04.12.2026", win.includes("19.06.2026") && win.includes("04.12.2026"), win);

// 5. проверка паспорта: нужен до 28.03.2027
await page.fill("#vpExpires", "2027-03-27"); await page.waitForTimeout(100);
const bad = await page.$eval("#vpResult", (e) => e.textContent);
await page.fill("#vpExpires", "2027-03-28"); await page.waitForTimeout(100);
const good = await page.$eval("#vpResult", (e) => e.textContent);
check("паспорт: 27.03.2027 мало, 28.03.2027 достаточно", bad.includes("❌") && good.includes("✅") && good.includes("28.03.2027"), good.slice(0, 80));

// 6. PDF маршрута: структура и смещения xref
const pdf = await page.evaluate(async () => {
  QZ.S.vname = "Test Person";
  const bl = QZ.makeItineraryPdf(), buf = new Uint8Array(await bl.arrayBuffer());
  const s = Array.from(buf, (c) => String.fromCharCode(c)).join("");
  const x = +s.match(/startxref\n(\d+)/)[1], rows = s.slice(x).split("\n").slice(3).filter((l) => / n $/.test(l));
  const offsOk = rows.every((l, i) => s.slice(+l.slice(0, 10), +l.slice(0, 10) + 12).startsWith(`${i + 1} 0 obj`));
  return {head: s.slice(0, 8), offsOk, objs: rows.length, name: s.includes("TEST PERSON"), coeur: s.includes("Sacré-C\u009Cur"), size: buf.length};
});
check("PDF корректный (заголовок и таблица xref)", pdf.head === "%PDF-1.4" && pdf.offsOk && pdf.objs >= 5, JSON.stringify(pdf));
check("PDF: имя заявителя и буква œ (Sacré-Cœur)", pdf.name && pdf.coeur);
const itin = await page.evaluate(() => QZ.itineraryText());
check("маршрут для консульства на английском без кириллицы", !/[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(itin) && itin.includes("Day 10") && itin.includes("Departure to Kazakhstan"));

// 7. сторис: редактор для каждого места, картинка 1080×1920
const st = await page.evaluate(async () => {
  const ids = Object.values(CITIES).flatMap((c) => c.spots.filter((s) => s.storyId).map((s) => s.storyId));
  let ok = 0, bad = [];
  for (const id of ids) {
    try { QZ.openStoryStudio({type: "place", id}); const b = await QZ.stBlob(); if (b && b.size > 20000) ok++; else bad.push(id); } catch (e) { bad.push(id + ": " + e.message); }
  }
  for (const id of Object.keys(CITIES)) { QZ.openStoryStudio({type: "city", id}); if (!(await QZ.stBlob())) bad.push("city " + id); }
  const c = document.querySelector("#stCanvas");
  return {n: ids.length, ok, bad, w: c.width, h: c.height};
});
check(`сторис для всех мест (${st.ok}/${st.n}) и городов`, st.ok === st.n && !st.bad.length && st.w === 1080 && st.h === 1920, st.bad.join(", "));

// 8. переключатели редактора меняют картинку
const diff = await page.evaluate(async () => {
  QZ.openStoryStudio({type: "place", id: "paris-eiffel"});
  const a = await QZ.stBlob();
  document.querySelector('[data-st-tab="font"]').click(); document.querySelector('[data-st-font="hand"]').click(); document.querySelector('[data-st-color="#FFC22E"]').click();
  const b = await QZ.stBlob();
  return {a: a.size, b: b.size, font: QZ.S.st.font, color: QZ.S.st.color};
});
check("шрифт и цвет применяются", diff.a !== diff.b && diff.font === "hand" && diff.color === "#FFC22E", JSON.stringify(diff));

// 9. фото для сторис: имена файлов
const slugs = await page.evaluate(() => Object.keys(PHOTOS).map((k) => QZ.photoSlug(k)));
const missing = fs.existsSync("photos") ? slugs.filter((s) => !fs.existsSync(`photos/${s}.webp`)) : slugs;
check("имена фото уникальны и латиницей", new Set(slugs).size === slugs.length && slugs.every((s) => /^[a-z0-9-]+$/.test(s)));
console.log(`INFO фото для сторис в photos/: ${slugs.length - missing.length} из ${slugs.length}${missing.length ? " (нет: " + missing.slice(0, 6).join(", ") + (missing.length > 6 ? "…" : "") + ")" : ""}`);

console.log("ERRORS:", errors.length ? errors : "none");
console.log(fails ? `ПРОВАЛЕНО: ${fails}` : "ВСЁ ОК");
await browser.close();
process.exit(fails || errors.length ? 1 : 0);

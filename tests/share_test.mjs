// Ссылка на маршрут (#trip=…) и PDF «Сапар кітапшасы».
// Запуск из папки проекта: node tests/share_test.mjs   (сеть закрыта; на Windows задайте QZ_FILE=file:///C:/…/index.html)
// QZ_BOOK_OUT=путь.pdf — сохранить получившуюся кітапшу, чтобы посмотреть глазами.
import fs from "node:fs";
import pw from "playwright";
const {chromium} = pw;
const FILE = process.env.QZ_FILE || "file://" + process.cwd() + "/index.html";
const browser = await chromium.launch();
const errors = [];
async function open(url) {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}});
  await ctx.route(/^https?:\/\//, (r) => r.abort());
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  await page.goto(url); await page.waitForTimeout(300);
  return page;
}
let fails = 0;
const check = (name, ok, extra) => { if (!ok) fails++; console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };

const page = await open(FILE);
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);

// 1. у каждого города свой код для ссылки
const codes = await page.evaluate(() => ({ids: Object.keys(CITIES), code: QZ.TRIP_CODE}));
const missing = codes.ids.filter((id) => !/^[a-z]{2}$/.test(codes.code[id] || ""));
const vals = Object.values(codes.code);
check("у каждого города есть двухбуквенный код, коды не повторяются", !missing.length && new Set(vals).size === vals.length, missing.join(", "));

// 2. план → код → ссылка
await page.click('[data-lang="kk"]'); await page.click('[data-tier="2"]'); await page.click('[data-style="mix"]');
for (const c of ["munich", "rome", "barcelona", "paris"]) await page.click(`[data-city="${c}"]`);
await page.click('[data-start="rome"]'); await page.click('[data-end="paris"]'); await page.click('[data-days="14"]');
await page.evaluate(() => {
  const set = (id, v) => { const el = document.querySelector(id); el.value = v; el.dispatchEvent(new Event("change", {bubbles: true})); };
  set("#start", "2027-07-26"); set("#people", "2");
});
await page.click("#go"); await page.waitForTimeout(300);
const st = await page.evaluate(() => ({code: QZ.tripCode(), url: QZ.shareUrl(), site: CONTACT.site, visa: QZ.visaMessage(), trip: QZ.tripMessage()}));
const expCode = "2x-murobapa-d14-p2-20270726-sro-epa";
check("код плана", st.code === expCode, st.code);
check("код подходит и для Telegram startapp (≤ 64, A-Z a-z 0-9 _ -)", /^[A-Za-z0-9_-]{1,64}$/.test(st.code));
check("ссылка = адрес сайта + #trip=код (с file:// — адрес сайта)", st.url === st.site + "#trip=" + expCode, st.url);
check("в сообщении менеджеру (виза и маршрут) есть ссылка на план", st.visa.includes(st.url) && st.trip.includes(st.url));

const card = await page.evaluate(() => ({
  wa: (document.querySelector("#shareCard a.btn-wa") || {}).href || "",
  link: !!document.querySelector("#shareCard [data-share-link]"),
  book: !!document.querySelector("#shareCard [data-book-pdf]"),
  story: !!document.querySelector("#shareCard [data-open-trip-story]"),
  url: (document.querySelector("#shareUrl") || {}).textContent || ""
}));
check("карточка «Бөлісу»: сілтеме, WhatsApp, PDF, сторис", card.link && card.book && card.story && card.url === st.url);
check("WhatsApp менеджеру: нужный номер и ссылка на план", card.wa.startsWith("https://wa.me/77719895607?text=") && decodeURIComponent(card.wa).includes(st.url));

// 3. другой человек открывает ссылку
const p2 = await open(FILE + "#trip=" + expCode);
const got = await p2.evaluate(() => ({
  S: {tier: QZ.S.tier, style: QZ.S.style, cities: QZ.S.cities, startCity: QZ.S.startCity, endCity: QZ.S.endCity, autoEnd: QZ.S.autoEnd, days: QZ.S.days, people: QZ.S.people, start: QZ.S.start},
  view: !document.querySelector("#view-result").classList.contains("hidden"),
  order: QZ.S.route && QZ.S.route.order, hash: location.hash, toast: document.querySelector("#toast").textContent === T[QZ.S.lang].shareOpened,
  saved: JSON.parse(localStorage.getItem("qz_plan") || "{}")
}));
const exp = {tier: 2, style: "mix", cities: ["munich", "rome", "barcelona", "paris"], startCity: "rome", endCity: "paris", autoEnd: false, days: 14, people: 2, start: "2027-07-26"};
check("ссылка открывает тот же план", JSON.stringify(got.S) === JSON.stringify(exp), JSON.stringify(got.S));
check("сразу страница результата, старт Рим, финиш Париж", got.view && got.order && got.order[0] === "rome" && got.order[got.order.length - 1] === "paris", (got.order || []).join("→"));
check("план сохранён у получателя, код убран из адреса", got.saved.days === 14 && !got.hash.includes("trip"), got.hash);
check("сообщение «маршрут ашылды» на языке получателя", got.toast);

// 4. испорченные и старые ссылки
const parsed = await page.evaluate(() => [
  QZ.parseTripCode("zz-garbage"), QZ.parseTripCode("9x-vi-d3-p1-20270726"), QZ.parseTripCode("1c-vixx-d3-p1-20270726"),
  QZ.parseTripCode("0m-viroparomi-d3-p1-20200101"), QZ.parseTripCode("1m-viro-d7-p99-20270230-sxx-evi"), QZ.parseTripCode("1M-VIRO-D7-P1-20270726")]);
check("мусор и уровень вне диапазона — игнор", parsed[0] === null && parsed[1] === null);
check("незнакомый город отброшен", parsed[2] && parsed[2].cities.join() === "vienna", JSON.stringify(parsed[2]));
check("повторы убраны, дней ≥ городов, прошедшая дата → будущая", parsed[3] && parsed[3].cities.join() === "vienna,rome,paris,milan" && parsed[3].days === 5 && parsed[3].start > new Date().toISOString().slice(0, 10), JSON.stringify(parsed[3]));
check("людей ≤ 10, несуществующая дата и финиш = старт — по умолчанию", parsed[4] && parsed[4].people === 10 && parsed[4].autoEnd === true && parsed[4].startCity === null && parsed[4].start !== "2027-02-30", JSON.stringify(parsed[4]));
check("регистр букв не важен", parsed[5] && parsed[5].cities.join() === "vienna,rome");
const p3 = await open(FILE + "#trip=zz-garbage");
const bad = await p3.evaluate(() => ({cities: QZ.S.cities.length, plan: !document.querySelector("#view-plan").classList.contains("hidden")}));
check("испорченная ссылка: обычный экран планирования", bad.cities === 0 && bad.plan);

// 5. PDF «Сапар кітапшасы»
async function bookInfo(pg) {
  return pg.evaluate(async () => {
    const b = await QZ.makeBookPdf(); if (!b) return null;
    const buf = new Uint8Array(await b.arrayBuffer());
    let txt = ""; for (let i = 0; i < buf.length; i += 65536) txt += String.fromCharCode(...buf.subarray(i, i + 65536)); // 1 байт = 1 знак
    const sx = +txt.match(/startxref\n(\d+)/)[1], offs = [...txt.slice(sx).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => +m[1]);
    return {size: b.size, head: txt.slice(0, 8), pages: (txt.match(/\/Type \/Page\b(?!s)/g) || []).length, links: (txt.match(/\/Subtype \/Link/g) || []).length,
      mosques: Object.values(PRAYER).flat().filter((p) => p.type === "mosque").map((p) => p.name),
      uris: [...txt.matchAll(/\/URI \(([^)]*)\)/g)].map((m) => m[1]), xref: txt.slice(sx, sx + 4) === "xref", objs: offs.length > 0 && offs.every((o, i) => txt.startsWith(`${i + 1} 0 obj`, o))};
  });
}
const bk = await bookInfo(page);
check("PDF собран: заголовок, xref и адреса всех объектов верны", bk && bk.head === "%PDF-1.4" && bk.xref && bk.objs, bk && `${bk.head} xref=${bk.xref} objs=${bk.objs}`);
check("в кітапше обложка, дни и полезное (≥ 4 страниц), размер < 6 МБ", bk && bk.pages >= 4 && bk.size < 6e6, bk && `${bk.pages} стр., ${Math.round(bk.size / 1024)} КБ`);
check("кликабельные ссылки: план, карты, телефоны, WhatsApp", bk && bk.uris.includes(st.url) && bk.uris.some((u) => u.startsWith("https://www.google.com/maps/")) && bk.uris.some((u) => u.startsWith("tel:+")) && bk.uris.some((u) => u.startsWith("https://wa.me/")), bk && `${bk.links} ссылок`);
check("адреса ссылок — только ASCII", bk && bk.uris.every((u) => /^[\x20-\x7E]+$/.test(u)));
const dec = (u) => { try { return decodeURIComponent(u); } catch (e) { return u; } };
check("намаза в кітапше нет (решение владельца): ни мечетей, ни muftyat", bk && bk.mosques.length > 0 && !bk.uris.some((u) => /muftyat/.test(u) || bk.mosques.some((n) => dec(u).includes(n))), bk && `мечетей в данных: ${bk.mosques.length}`);
if (process.env.QZ_BOOK_OUT) {
  const b64 = await page.evaluate(async () => { const b = await QZ.makeBookPdf(); const u = new Uint8Array(await b.arrayBuffer()); let s = ""; for (let i = 0; i < u.length; i += 65536) s += String.fromCharCode(...u.subarray(i, i + 65536)); return btoa(s); });
  fs.writeFileSync(process.env.QZ_BOOK_OUT, Buffer.from(b64, "base64")); console.log("     сохранено:", process.env.QZ_BOOK_OUT);
}

// один город, английский и русский интерфейс
await page.click('[data-lang="en"]');
const small = await page.evaluate(async () => { Object.assign(QZ.S, {cities: ["vienna"], startCity: null, endCity: null, autoEnd: true, days: 3}); const b = await QZ.makeBookPdf(); return b && b.size; });
check("EN, один город — кітапша собирается", small > 50000, String(small));
await page.click('[data-lang="ru"]');
const ru = await page.evaluate(async () => { Object.assign(QZ.S, {cities: ["budapest", "prague", "vienna"], days: 7}); const b = await QZ.makeBookPdf(); return b && b.size; });
check("RU, три города — кітапша собирается", ru > 50000, String(ru));

// 6. тексты карточки на языках
await page.evaluate(() => { Object.assign(QZ.S, {view: "result"}); QZ.render(); });
await page.click('[data-lang="en"]'); await page.waitForTimeout(150);
const cyr = /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/;
const enCard = await page.$eval("#shareCard", (e) => e.innerText);
check("EN: карточка без кириллицы", !cyr.test(enCard), enCard.split("\n").filter((l) => cyr.test(l)).join(" | "));

console.log("ERRORS:", errors.length ? errors : "none");
console.log(fails ? `ПРОВАЛЕНО: ${fails}` : "ВСЁ ОК");
await browser.close();
process.exit(fails || errors.length ? 1 : 0);

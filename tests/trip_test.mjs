// Вкладка «В поездке»: перевод цены в тенге, 112, посольства Казахстана, потеря паспорта.
// Запуск из папки проекта: node tests/trip_test.mjs   (сеть закрыта → резервный курс FX)
import pw from "playwright";
const {chromium} = pw;
const FILE = process.env.QZ_FILE || "file://" + process.cwd() + "/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 390, height: 844}});
await ctx.route(/^https?:\/\//, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
await page.goto(FILE); await page.waitForTimeout(300);
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
let fails = 0;
const check = (name, ok, extra) => { if (!ok) fails++; console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };
const out = () => page.$eval("#cvOut", (e) => e.innerText.replace(/\s+/g, " ").trim());
const n = (v) => v.toLocaleString("ru-RU").replace(/\s+/g, " "); // тысячи через обычный пробел, как в out()
const fx = await page.evaluate(() => ({KZT: FX.EUR_KZT, CHF: FX.CHF_EUR, USD: FX.EUR_USD}));

await page.click('[data-lang="ru"]');
await page.click('[data-view="trip"]'); await page.waitForTimeout(200);
await page.fill("#cvAmount", "25");
const eur = await out();
check("25 € → тенге по курсу", eur.startsWith(n(25 * fx.KZT) + " ₸"), eur);
await page.click('[data-cv-cur="CHF"]'); await page.fill("#cvAmount", "10");
const chf = await out();
check("10 CHF → тенге (CHF дороже евро)", chf.startsWith(n(Math.round(10 * fx.CHF * fx.KZT)) + " ₸"), chf);
await page.click('[data-cv-cur="KZT"]'); await page.fill("#cvAmount", String(fx.KZT * 100));
const kzt = await out();
check("тенге → евро", kzt.startsWith("100 €"), kzt);
await page.fill("#cvAmount", "12,5"); await page.click('[data-cv-cur="EUR"]');
const comma = await out();
check("запятая в сумме (12,5 €)", comma.startsWith(n(12.5 * fx.KZT) + " ₸"), comma);
await page.click('[data-cv-n="100"]');
check("быстрая кнопка 100", (await page.$eval("#cvAmount", (e) => e.value)) === "100" && (await out()).startsWith(n(100 * fx.KZT)));

const sos = await page.evaluate(() => ({
  call112: !!document.querySelector('#view-trip a[href="tel:112"]'),
  embs: document.querySelectorAll("#view-trip .emb").length,
  tels: [...document.querySelectorAll("#view-trip .emb-ph")].map((a) => a.getAttribute("href")),
  steps: document.querySelectorAll("#view-trip .v-steps li").length,
  wa: [...document.querySelectorAll("#view-trip a.btn-wa")].map((a) => a.href)
}));
check("кнопка 112", sos.call112);
check("9 посольств и консульств, все телефоны — ссылки tel: в международном формате", sos.embs === 9 && sos.tels.length >= 17 && sos.tels.every((h) => /^tel:\+\d{9,14}$/.test(h)), sos.tels.join(" "));
check("шаги при потере паспорта и WhatsApp", sos.steps === 5 && sos.wa.some((h) => h.startsWith("https://wa.me/77719895607")));

// страны маршрута — первыми
await page.evaluate(() => { Object.assign(QZ.S, {cities: ["paris", "rome"], days: 7}); QZ.renderTrip(); });
const first = await page.$$eval("#view-trip .emb-h b", (bs) => bs.slice(0, 2).map((b) => b.textContent));
check("посольства стран маршрута сверху (Италия, Франция)", first.some((x) => /Итали/.test(x)) && first.some((x) => /Франци/.test(x)), first.join(" | "));

// языки
const cyr = /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/;
await page.click('[data-lang="en"]'); await page.waitForTimeout(200);
const enLines = (await page.$eval("#view-trip", (e) => e.innerText)).split("\n").filter((l) => cyr.test(l));
check("EN: без кириллицы", enLines.length === 0, enLines.slice(0, 3).join(" | "));
await page.click('[data-lang="kk"]'); await page.waitForTimeout(200);
const RU = /(^|\s)(и|в|на|для|это|не|по|от|до|или|с|из)\s/i, KK = /[әғқңөұүһі]/i;
const kkSus = (await page.$eval("#view-trip", (e) => e.innerText)).split("\n").map((l) => l.trim()).filter((l) => /[а-яё]/i.test(l) && !KK.test(l) && RU.test(l));
check("KK: без русских строк", kkSus.length === 0, kkSus.slice(0, 3).join(" | "));

console.log("ERRORS:", errors.length ? errors : "none");
console.log(fails ? `ПРОВАЛЕНО: ${fails}` : "ВСЁ ОК");
await browser.close();
process.exit(fails || errors.length ? 1 : 0);

// Проверка языков: в EN не должно быть кириллицы (кроме переключателя языков),
// в KK — подозрительных русских строк; в RU — "undefined" или "{...}".
import pw from "playwright";
const {chromium} = pw;
const FILE = process.env.QZ_FILE || "file://" + process.cwd() + "/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
await ctx.route(/^https?:\/\//, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));

const visibleText = (sel) => page.evaluate((sel) => {
  const root = document.querySelector(sel).cloneNode(true);
  root.querySelectorAll(".langs, #view-phrases, script, style, .hidden").forEach((e) => e.parentNode && e.parentNode.removeChild(e));
  return root.innerText;
}, sel);

await page.goto(FILE); await page.waitForTimeout(300);
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
await page.click('[data-lang="kk"]');
await page.click('[data-tier="2"]'); await page.click('[data-style="mix"]');
for (const c of ["vienna", "rome", "paris", "milan", "venice", "florence", "como", "lugano", "budapest", "prague", "munich", "barcelona"]) await page.click(`[data-city="${c}"]`);
await page.click('[data-days="14"]'); await page.click("#go"); await page.waitForTimeout(400);
await page.$$eval("details", (ds) => ds.forEach((d) => { d.open = true; }));

// ---- KK: русские строки без казахских букв
const RU = /(^|\s)(и|в|на|для|это|не|по|от|до|или|с|из)\s/i, KK = /[әғқңөұүһі]/i;
for (const tab of ["local", "vegan", "halal"]) {
  for (const b of await page.$$(`[data-eat$=":${tab}"]`)) await b.click();
  const txt = await visibleText("#view-result");
  const sus = [...new Set(txt.split("\n").map((l) => l.trim()).filter((l) => /[а-яё]/i.test(l) && !KK.test(l) && RU.test(l)))];
  console.log(`KK result (eat tab ${tab}): suspicious Russian lines: ${sus.length}`);
  sus.slice(0, 12).forEach((l) => console.log("    ", l.slice(0, 130)));
}

// ---- KK: вкладка «Виза»
await page.click('[data-view="visa"]'); await page.waitForTimeout(300);
await page.$$eval("#view-visa details", (ds) => ds.forEach((d) => { d.open = true; }));
{
  const txt = await visibleText("#view-visa");
  const sus = [...new Set(txt.split("\n").map((l) => l.trim()).filter((l) => /[а-яё]/i.test(l) && !KK.test(l) && RU.test(l)))];
  console.log(`KK visa: suspicious Russian lines: ${sus.length}`);
  sus.slice(0, 12).forEach((l) => console.log("    ", l.slice(0, 130)));
}
await page.click('[data-view="plan"]'); await page.click("#go"); await page.waitForTimeout(300);

// ---- EN: кириллица в видимом тексте
await page.click('[data-lang="en"]'); await page.waitForTimeout(300);
await page.$$eval("details", (ds) => ds.forEach((d) => { d.open = true; }));
const cyr = /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/;
const scanEn = async (label, sel) => {
  const bad = [...new Set((await visibleText(sel)).split("\n").map((l) => l.trim()).filter((l) => cyr.test(l)))];
  console.log(`EN ${label}: lines with Cyrillic: ${bad.length}`);
  bad.slice(0, 12).forEach((l) => console.log("    ", l.slice(0, 130)));
};
await scanEn("result", "#view-result");
await page.click('[data-view="guide"]'); await page.waitForTimeout(300);
await scanEn("guide", "#view-guide");
await page.click("#guideCards .story-card [data-open-story]"); await page.waitForTimeout(300);
await scanEn("story sheet", "#modalSheet");
await page.keyboard.press("Escape");
await page.click('[data-view="check"]'); await page.waitForTimeout(200);
await scanEn("checklist", "#view-check");
await page.click('[data-view="visa"]'); await page.waitForTimeout(200);
await page.$$eval("#view-visa details", (ds) => ds.forEach((d) => { d.open = true; }));
await scanEn("visa", "#view-visa");
await page.click('[data-view="plan"]'); await page.waitForTimeout(200);
await scanEn("planner", "#view-plan");

// ---- RU: шаблоны и undefined
await page.click('[data-lang="ru"]'); await page.waitForTimeout(200);
await page.click("#go"); await page.waitForTimeout(300);
const ruTxt = await page.evaluate(() => document.body.innerText);
console.log("RU: has 'undefined':", ruTxt.includes("undefined"), "| has '{':", /\{[a-z]+\}/.test(ruTxt));
console.log("ERRORS:", errors.length ? errors : "none");
await browser.close();

import pw from "playwright";
const {chromium} = pw;
const FILE = process.env.QZ_FILE || "file://" + process.cwd() + "/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
await ctx.route(/^https?:\/\//, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
await page.goto(FILE); await page.waitForTimeout(300);
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);

// 1. данные: все 21 пар имеют поле p, у paris|venice null
const d = await page.evaluate(() => {
  const keys = Object.keys(TRAVEL);
  return {pairs: keys.length, withP: keys.filter((k) => "p" in TRAVEL[k]).length, nulls: keys.filter((k) => TRAVEL[k].p === null),
    bad: keys.filter((k) => Array.isArray(TRAVEL[k].p) && !(TRAVEL[k].p[0] > 0 && TRAVEL[k].p[1] >= TRAVEL[k].p[0]))};
});
console.log("DATA:", JSON.stringify(d));

// 2. сумма по маршруту сверена вручную
const r = await page.evaluate(() => {
  const x = QZ.optimizeRoute(["vienna", "venice", "milan", "rome"], "vienna", null);
  return {order: x.order.join(">"), legs: x.legs.map((l) => l.from + "|" + l.to + " " + JSON.stringify(l.p)), fare: x.fare, unknown: x.fareUnknown};
});
console.log("ROUTE:", JSON.stringify(r));
const expected = [35 + 21 + 25, 100 + 45 + 80];
console.log("expected fare", JSON.stringify(expected), "match:", JSON.stringify(r.fare) === JSON.stringify(expected));

// 3. маршрут с неизвестной ценой: Париж + Венеция
const u = await page.evaluate(() => { const x = QZ.optimizeRoute(["paris", "venice"], "paris", null); return {fare: x.fare, unknown: x.fareUnknown}; });
console.log("UNKNOWN LEG:", JSON.stringify(u));

// 4. UI: итог = база + дорога
await page.click('[data-lang="ru"]'); await page.click('[data-tier="2"]'); await page.click('[data-style="mix"]');
for (const c of ["vienna", "rome", "milan", "venice"]) await page.click(`[data-city="${c}"]`);
await page.click('[data-start="vienna"]'); await page.click('[data-days="10"]'); await page.click("#go"); await page.waitForTimeout(400);
const ui = await page.evaluate(() => {
  const route = S.route, per = S.per, c = calc(route, per);
  return {fare: route.fare, travel: c.travel, base: c.tot.map((v, i) => Math.round(v - c.travel[i])), tot: c.tot.map(Math.round), shown: document.querySelector("#total .big").textContent};
});
console.log("UI:", JSON.stringify(ui));
console.log("ROUTE CARD:", (await page.textContent("#routeCard")).replace(/\s+/g, " ").slice(0, 700));
console.log("SPLIT:", (await page.textContent("#split")).replace(/\s+/g, " ").slice(0, 400));
await page.screenshot({path: "fare-route.png"});
await page.evaluate(() => document.querySelector("#routeCard").scrollIntoView());
await page.screenshot({path: "fare-route2.png"});

// 5. три языка без пустых мест
for (const l of ["kk", "en", "ru"]) {
  await page.click(`[data-lang="${l}"]`); await page.waitForTimeout(200);
  const t = await page.evaluate(() => document.querySelector("#routeCard").innerText + "\n" + document.querySelector("#total").innerText + document.querySelector("#split").innerText);
  console.log(l, "undefined:", t.includes("undefined"), "| braces:", /\{[a-zA-Z]+\}/.test(t), "| cyr in EN:", l === "en" ? /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(t) : "n/a");
}
console.log("ERRORS:", errors.length ? errors : "none");
await browser.close();

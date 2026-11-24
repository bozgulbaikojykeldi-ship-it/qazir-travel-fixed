// Амстердам: выбирается в планировщике, маршрут считается, ссылка читается обратно, посольство есть.
// Запуск из папки проекта: node tests/amsterdam_test.mjs   (на Windows задайте QZ_FILE=file:///C:/…/index.html)
import pw from "playwright";
const {chromium} = pw;
const FILE = process.env.QZ_FILE || "file://" + process.cwd() + "/index.html";
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({viewport: {width: 390, height: 844}});
await ctx.route(/^https?:\/\//, (r) => r.abort());
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
await page.goto(FILE); await page.waitForTimeout(300);
await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);

let fails = 0;
const check = (name, ok, extra) => { if (!ok) fails++; console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };

check("Амстердам есть в списке городов", await page.locator('[data-city="amsterdam"]').count() === 1);
await page.click('[data-city="amsterdam"]'); await page.click('[data-city="vienna"]');
await page.click('[data-tier="1"]'); await page.click('[data-style="mix"]');
await page.click("#go"); await page.waitForTimeout(200);
const order = await page.evaluate(() => QZ.S.route.order);
check("маршрут с Амстердамом считается", order.includes("amsterdam") && order.length === 2, order.join(" → "));
const code = await page.evaluate(() => QZ.tripCode());
check("в ссылке есть код Амстердама", code.includes("am"), code);
const back = await page.evaluate((c) => QZ.parseTripCode(c), code);
check("ссылка читается обратно", back && back.cities.includes("amsterdam"));
check("ошибок скрипта нет", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `ЕСТЬ ОШИБКИ: ${fails}` : "ВСЁ ОК");
process.exit(fails ? 1 : 0);

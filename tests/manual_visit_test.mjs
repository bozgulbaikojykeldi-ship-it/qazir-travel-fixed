// Свой порядок городов (◀ ▶), «уже были» у мест и скрытие прошедших дней.
// Запуск из папки проекта: node tests/manual_visit_test.mjs   (сеть закрыта; на Windows задайте QZ_FILE=file:///C:/…/index.html)
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
const order = () => page.evaluate(() => QZ.S.cities.slice());
const routeOrder = () => page.evaluate(() => QZ.S.route && QZ.S.route.order.slice());

// 1. выбираем три города (порядок кликов = S.cities)
for (const id of ["vienna", "rome", "paris"]) await page.click(`[data-city="${id}"]`);
check("города выбраны в порядке кликов", JSON.stringify(await order()) === JSON.stringify(["vienna", "rome", "paris"]));
await page.click('[data-tier="1"]'); await page.click('[data-style="mix"]'); // без бюджета и стиля кнопка «Маршрут» не открывается

// 2. по умолчанию — авто: маршрут может переставить города
await page.click('[data-route-mode="auto"]');
check("по умолчанию режим авто, блок ◀ ▶ скрыт", await page.evaluate(() => QZ.S.manual === false && document.querySelector("#manualRoute").classList.contains("hidden")));

// 3. переходим в «свой порядок» и двигаем Париж влево (к Риму)
await page.click('[data-route-mode="manual"]');
await page.click('[data-move="paris:-1"]');
check("◀ сдвигает город влево", JSON.stringify(await order()) === JSON.stringify(["vienna", "paris", "rome"]), (await order()).join(" → "));
check("у первого города ◀ отключена", await page.locator('[data-move="vienna:-1"]').isDisabled());
check("у последнего города ▶ отключена", await page.locator('[data-move="rome:1"]').isDisabled());

// 4. маршрут в результате идёт ровно в выбранном порядке
await page.click("#go"); await page.waitForTimeout(200);
check("маршрут = свой порядок", JSON.stringify(await routeOrder()) === JSON.stringify(["vienna", "paris", "rome"]), (await routeOrder() || []).join(" → "));

// 5. ссылка несёт флаг «свой порядок» и читается обратно
const code = await page.evaluate(() => QZ.tripCode());
check("в коде есть флаг -o", /-o$/.test(code) || code.includes("-o-"), code);
const back = await page.evaluate((c) => QZ.parseTripCode(c), code);
check("код читается обратно: manual, порядок сохранён", back && back.manual === true && JSON.stringify(back.cities) === JSON.stringify(["vienna", "paris", "rome"]));

// 6. «уже были»: отмечаем первое место, оно пропадает из дня
await page.click("#back"); await page.waitForTimeout(100);
await page.click("#go"); await page.waitForTimeout(200);
const before = await page.locator("#plan .spot-item").count();
await page.locator("[data-visit]").first().click(); await page.waitForTimeout(100);
const after = await page.locator("#plan .spot-item").count();
check("отмеченное место скрыто", after === before - 1, `${before} → ${after}`);
const visited = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("qz_visited") || "{}")));
check("отметка сохранена в телефоне", visited.length === 1, visited.join(","));
await page.locator("[data-visited-toggle]").click(); await page.waitForTimeout(100);
check("«показать посещённые» возвращает место", (await page.locator("#plan .spot-item").count()) === before);
await page.locator("[data-visited-toggle]").click(); await page.waitForTimeout(100);

// 7. прошедшие дни: делаем «сегодня» = третий день плана и проверяем скрытие
const dayCount = () => page.locator("#plan .card").count();
const total = await dayCount();
await page.evaluate(() => {
  const first = QZ.S.plan.days[0].date, cut = new Date(first.getTime() + 2 * 864e5);
  window.isPastDay = (d) => d < cut;
});
await page.click("#back"); await page.waitForTimeout(100);
await page.click("#go"); await page.waitForTimeout(200);
const shownPast = await dayCount();
check("прошедшие дни скрыты", shownPast === total - 2, `${total} → ${shownPast}`);
await page.locator("[data-past-toggle]").click(); await page.waitForTimeout(100);
check("«показать прошедшие» возвращает дни", (await dayCount()) === total);

check("ошибок скрипта нет", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `ЕСТЬ ОШИБКИ: ${fails}` : "ВСЁ ОК");
process.exit(fails ? 1 : 0);

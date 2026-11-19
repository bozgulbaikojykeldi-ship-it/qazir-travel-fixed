// Даты поездки: Пасха, выходные дни мест, праздники, события, перестановка дней.
// Запуск из папки проекта: node tests/dates_test.mjs
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
await page.click('[data-lang="ru"]');
let fails = 0;
const check = (name, ok, extra) => { if (!ok) fails++; console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`); };
const ev = (fn, arg) => page.evaluate(fn, arg);

// Пасха (григорианская): 2025-04-20, 2026-04-05, 2027-03-28, 2030-04-21
const easter = await ev(() => [2025, 2026, 2027, 2030].map((y) => { const d = QZ.easterDate(y); return `${y}-${d.getMonth() + 1}-${d.getDate()}`; }).join(" "));
check("Пасха", easter === "2025-4-20 2026-4-5 2027-3-28 2030-4-21", easter);

// Выходные дни мест
const c = await ev(() => {
  const D = (s) => new Date(s + "T00:00:00"), lv = (k, s) => { const r = QZ.closureOn(k, D(s)); return r ? r.level : "open"; };
  return {
    louvreTue: lv("Louvre", "2026-12-22"), louvreWed: lv("Louvre", "2026-12-23"), louvreXmas: lv("Louvre", "2026-12-25"),
    orsayMon: lv("Musée d'Orsay", "2026-12-21"), cenacoloXmas: lv("Santa Maria delle Grazie", "2026-12-25"), cenacoloThu: lv("Santa Maria delle Grazie", "2026-12-24"),
    vaticanSun: lv("Vatican Museums", "2026-12-20"), vaticanLastSun: lv("Vatican Museums", "2026-12-27"), vaticanEasterMon: lv("Vatican Museums", "2027-03-29"),
    givernyJan: lv("Giverny", "2027-01-15"), givernyMay: lv("Giverny", "2027-05-15"), salvatoreDec: lv("Monte San Salvatore", "2026-12-10"),
    khmMon: lv("Kunsthistorisches Museum", "2026-11-23"), khmMonJul: lv("Kunsthistorisches Museum", "2027-07-05"), marcoSun: lv("St Mark's Basilica", "2026-12-20"),
    textOrsay: QZ.closureOn("Musée d'Orsay", D("2026-12-21")).text
  };
});
check("Лувр: вторник закрыт, среда открыт, 25.12 закрыт", c.louvreTue === "closed" && c.louvreWed === "open" && c.louvreXmas === "closed");
check("Орсе в понедельник закрыт", c.orsayMon === "closed" && c.textOrsay === "закрыто по понедельникам", c.textOrsay);
check("«Тайная вечеря»: 25.12 закрыто, 24.12 открыто", c.cenacoloXmas === "closed" && c.cenacoloThu === "open");
check("Ватикан: воскресенье закрыт, последнее воскресенье открыт, пасхальный понедельник закрыт", c.vaticanSun === "closed" && c.vaticanLastSun === "open" && c.vaticanEasterMon === "closed", JSON.stringify([c.vaticanSun, c.vaticanLastSun, c.vaticanEasterMon]));
check("Сезон: Живерни в январе закрыт, в мае открыт; Сан-Сальваторе в декабре закрыт", c.givernyJan === "closed" && c.givernyMay === "open" && c.salvatoreDec === "closed");
check("Неточные данные — «проверьте», летом правило не действует", c.khmMon === "check" && c.khmMonJul === "open");
check("Частичное ограничение (Сан-Марко в воскресенье)", c.marcoSun === "partial");

// Праздники и события
const h = await ev(() => {
  const D = (s) => new Date(s + "T00:00:00"), name = (id, s) => { const x = QZ.holidayOn(id, D(s)); return x ? x.ru : null; };
  const notes = (id, s) => QZ.dayNotes(id, D(s)).map((n) => n.text).join(" | ");
  return {
    xmasMilan: name("milan", "2026-12-25"), ambrogio: name("milan", "2026-12-07"), ambrogioRome: name("rome", "2026-12-07"),
    oct4_2026: name("rome", "2026-10-04"), oct4_2025: name("rome", "2025-10-04"), whitParis: name("paris", "2027-05-17"), corpusVienna: name("vienna", "2027-05-27"),
    feeYes: notes("venice", "2026-05-02"), feeNo: notes("venice", "2026-05-04"), fee2027: notes("venice", "2027-05-04"), carnival: notes("venice", "2027-02-05"),
    viennaSun: notes("vienna", "2026-12-20"), viennaMon: notes("vienna", "2026-12-21")
  };
});
check("Рождество в Милане и праздник Милана 7 декабря (только в Милане)", h.xmasMilan === "Рождество" && /Амвросия/.test(h.ambrogio || "") && h.ambrogioRome === null, JSON.stringify([h.xmasMilan, h.ambrogio, h.ambrogioRome]));
check("4 октября — праздник в Италии с 2026 года", /Франциска/.test(h.oct4_2026 || "") && h.oct4_2025 === null);
check("Подвижные праздники: Духов день в Париже 17.05.2027, Тело Христово в Вене 27.05.2027", h.whitParis === "Духов день" && h.corpusVienna === "Праздник Тела Христова", JSON.stringify([h.whitParis, h.corpusVienna]));
check("Платный вход в Венецию: 02.05.2026 да, 04.05.2026 нет, 2027 — «проверьте календарь»", /День платного входа/.test(h.feeYes) && !/платн/.test(h.feeNo) && /Календарь на этот год/.test(h.fee2027), h.feeNo);
check("Карнавал в Венеции 05.02.2027", /Карнавал/.test(h.carnival));
check("Вена: воскресенье — магазины закрыты; ярмарки в декабре", /Воскресенье/.test(h.viennaSun) && /ярмарки/.test(h.viennaSun) && !/Воскресенье/.test(h.viennaMon));

// Перестановка дней: Париж с понедельника 21.12.2026, 3 дня
const pc = await ev(() => {
  QZ.S.style = "classic";
  const p = QZ.planCity("paris", 3, new Date("2026-12-21T00:00:00"));
  const bad = []; p.days.forEach((d) => (d.spots || []).forEach((s) => { const c = QZ.closureOn(s.w, d.date); if (c && c.level === "closed") bad.push(s.w + "@" + d.date.getDay()); }));
  return {bad, moved: p.moved.map((m) => m.key), days: p.days.map((d) => d.date.getDay() + ":" + (d.spots || []).map((s) => s.w).join("/"))};
});
check("Париж 21–23.12: ни одного места в его выходной", pc.bad.length === 0, JSON.stringify(pc.days));

// Весь год: поездка по 7 городам на 14 дней с каждого дня 2027 года — ни одного места в его выходной
const year = await ev(() => {
  const cities = ["vienna", "rome", "paris", "milan", "venice", "como", "lugano"], route = QZ.optimizeRoute(cities.slice(), "vienna", null), per = QZ.allocateDays(route.order, 14);
  let left = 0;
  for (let i = 0; i < 365; i++) QZ.planTrip(route, per, new Date(2027, 0, 1 + i)).days.forEach(({day}) => (day.spots || (day.trip ? [day.trip] : [])).forEach((s) => { const c = QZ.closureOn(s.w, day.date); if (c && c.level === "closed") left++; }));
  return left;
});
check("Весь 2027 год (365 стартов): закрытых мест в плане нет", year === 0, String(year));

// Будапешт и Прага: синагога и Еврейский музей закрыты по субботам — план их туда не ставит; праздники Венгрии и Чехии
const bp = await ev(() => {
  QZ.S.style = "classic";
  const bad = [];
  for (let i = 0; i < 28; i++) for (const id of ["budapest", "prague"]) QZ.planCity(id, 3, new Date(2027, 2, 1 + i)).days.forEach((d) => (d.spots || []).forEach((s) => { const c = QZ.closureOn(s.w, d.date); if (c && c.level === "closed") bad.push(id + ":" + s.w + "@" + d.date.toDateString()); }));
  const D = (s) => new Date(s + "T00:00:00"), h = (id, s) => { const x = QZ.holidayOn(id, D(s)); return x ? x.ru : null; };
  return {bad, aug20: h("budapest", "2027-08-20"), gfPrague: h("prague", "2027-03-26"), nov17: h("prague", "2026-11-17"), sat: QZ.closureOn("Josefov", D("2026-11-21")) && QZ.closureOn("Josefov", D("2026-11-21")).level};
});
check("Будапешт и Прага: закрытые по субботам места не стоят на субботу (март 2027)", bp.bad.length === 0 && bp.sat === "closed", bp.bad.slice(0, 3).join(", "));
check("Праздники Венгрии и Чехии (20 августа, Страстная пятница, 17 ноября)", /Иштвана/.test(bp.aug20 || "") && bp.gfPrague === "Страстная пятница" && /свободу/.test(bp.nov17 || ""), JSON.stringify([bp.aug20, bp.gfPrague, bp.nov17]));

// Весь маршрут 19–28.12.2026 и карточка «Ваши даты»
await page.click('[data-tier="2"]'); await page.click('[data-style="mix"]');
for (const id of ["paris", "venice", "milan", "rome"]) await page.click(`[data-city="${id}"]`);
await page.click('[data-days="10"]');
await page.fill("#start", "2026-12-19"); await page.dispatchEvent("#start", "change");
await page.click("#go"); await page.waitForTimeout(500);
const r = await ev(() => {
  const bad = []; QZ.S.plan.days.forEach(({day}) => (day.spots || (day.trip ? [day.trip] : [])).forEach((s) => { const c = QZ.closureOn(s.w, day.date); if (c && c.level === "closed") bad.push(s.w); }));
  const card = document.querySelector("#datesCard").innerText, flags = document.querySelectorAll("#plan .day-flag").length;
  return {bad, card, flags};
});
check("Маршрут 19–28.12: закрытые места не стоят на закрытые дни", r.bad.length === 0, r.bad.join(", "));
check("Карточка «Ваши даты»: Рождество и перенос", /Рождество/.test(r.card) && /поставили на/.test(r.card), r.card.replace(/\n+/g, " | ").slice(0, 400));
check("Праздники видны в плане по дням", r.flags > 0, String(r.flags));

// Английский: без кириллицы в карточке дат
await page.click('[data-lang="en"]'); await page.waitForTimeout(300);
const en = await page.$eval("#datesCard", (e) => e.innerText);
check("EN: карточка дат без кириллицы", !/[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(en), en.slice(0, 200));

console.log("ERRORS:", errors.length ? errors : "none");
console.log(fails ? `ПРОВАЛЕНО: ${fails}` : "ВСЁ ОК");
await browser.close();
process.exit(fails || errors.length ? 1 : 0);

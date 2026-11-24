// Маршрут: сравнение QZ.optimizeRoute с полным перебором перестановок
import pw from "playwright";
const {chromium} = pw;
const FILE = process.env.QZ_FILE || "file://" + process.cwd() + "/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext(); await ctx.route(/^https?:\/\//, (r) => r.abort());
const page = await ctx.newPage();
await page.goto(FILE); await page.waitForTimeout(300);
const res = await page.evaluate(() => {
  const sc = [
    ["Vienna start + 4", ["vienna", "rome", "paris", "milan", "venice"], "vienna", null],
    ["Milan start, auto end", ["milan", "como", "lugano", "venice", "rome"], "milan", null],
    ["7 cities, Paris start", ["paris", "vienna", "rome", "milan", "venice", "como", "lugano"], "paris", null],
    ["9 cities, Budapest start", ["budapest", "vienna", "prague", "rome", "paris", "milan", "venice", "como", "lugano"], "budapest", null],
    ["7 cities, Vienna→Paris fixed", ["vienna", "rome", "paris", "milan", "venice", "como", "lugano"], "vienna", "paris"],
    ["Rome start + Florence", ["rome", "florence", "venice", "milan", "como"], "rome", null],
    ["10 cities, Vienna start", ["vienna", "budapest", "prague", "rome", "florence", "paris", "milan", "venice", "como", "lugano"], "vienna", null]
  ];
  const perms = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.filter((_, j) => j !== i)).map((p) => [x, ...p]));
  const retH = (id) => RETURN_FLIGHTS.cities[id].returnHours;
  return sc.map(([name, cities, start, end]) => {
    const r = QZ.optimizeRoute(cities.slice(), start, end);
    let best = Infinity;
    for (const p of perms(cities.filter((c) => c !== start))) { const o = [start, ...p], e = o[o.length - 1]; if (end && e !== end) continue; best = Math.min(best, QZ.pathHours(o) + (end ? 0 : retH(e))); }
    const got = r.hours + (end ? 0 : retH(r.end));
    return `${name}: ${r.order.join(" → ")} | ${r.hours} h | saved ${r.saved} h | exact match: ${Math.abs(got - best) < 1e-9}`;
  });
});
res.forEach((l) => console.log(l));
await browser.close();

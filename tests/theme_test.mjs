// Тема: следует за телефоном, переключается кнопкой, выбор сохраняется и переживает перезагрузку.
import pw from "playwright";
const {chromium} = pw;
const FILE = process.env.QZ_FILE || "file://" + process.cwd() + "/index.html";
const browser = await chromium.launch();
let fails = 0;
const check = (name, ok, info) => { console.log(`${ok ? "OK  " : "FAIL"} ${name}${info !== undefined ? " — " + JSON.stringify(info) : ""}`); if (!ok) fails++; };
const state = (p) => p.evaluate(() => ({theme: document.documentElement.getAttribute("data-theme"), meta: document.querySelector('meta[name="theme-color"]').content,
  saved: localStorage.getItem("qz_theme"), bg: getComputedStyle(document.body).backgroundColor, label: document.querySelector("#themeBtn").getAttribute("aria-label")}));
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, colorScheme: scheme});
  await ctx.route(/^https?:\/\//, (r) => r.abort());
  const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(FILE); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  const other = scheme === "light" ? "dark" : "light";
  let s = await state(p);
  check(`телефон ${scheme}: тема по телефону, ничего не сохранено`, s.theme === scheme && s.saved === null, s);
  await p.click("#themeBtn"); await p.waitForTimeout(200);
  s = await state(p);
  check(`кнопка → ${other}, выбор сохранён, цвет шапки сменился`, s.theme === other && s.saved === JSON.stringify(other) && s.meta === (other === "dark" ? "#071A30" : "#F4EFE7"), s);
  await p.reload(); await p.waitForTimeout(300);
  s = await state(p);
  check(`после перезагрузки остаётся ${other}`, s.theme === other, s);
  await p.click('[data-lang="en"]'); await p.waitForTimeout(100);
  s = await state(p);
  check("подсказка кнопки на английском", /Switch to (light|dark) mode/.test(s.label), s.label);
  check(`${scheme}: ошибок нет`, errors.length === 0, errors);
  await ctx.close();
}
await browser.close();
console.log(fails ? `ПРОВАЛЕНО: ${fails}` : "ВСЁ ОК");

// Probe branch only: load the Big Ten's public availability embed the way a
// fan's browser does and list every request it makes and what came back.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
const seen = [];
page.on("response", async (r) => {
  const u = r.url(), t = r.request().resourceType();
  if (/\.(js|css|woff2?|png|jpg|svg|ico)(\?|$)/.test(u) || /google|descope|transcend/.test(u)) return;
  let body = "";
  try { body = (await r.text()).slice(0, 1500); } catch (e) {}
  seen.push({ u, t, m: r.request().method(), s: r.status(), post: (r.request().postData() || "").slice(0, 300), body });
});
for (const type of ["archive", "report"]) {
  await page.goto("https://app.hdintelligence.com/?source=B10&sport=Football&conf=B10&type=" + type, { waitUntil: "networkidle", timeout: 60000 }).catch(e => console.log("goto", e.message));
  await page.waitForTimeout(6000);
  const text = await page.evaluate(() => document.body.innerText);
  console.log("==== " + type + " page text (first 3000)\n" + text.slice(0, 3000));
}
for (const x of seen) console.log("\n---- " + x.m + " " + x.s + " " + x.t + " " + x.u + (x.post ? "\n  post: " + x.post : "") + "\n  body: " + x.body.replace(/\s+/g, " "));
await browser.close();

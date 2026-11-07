import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(".pilot-drill/browser-engines");
const { webkit, request } =
  await import("../.pilot-drill/browser-tools/node_modules/playwright/index.mjs");
const profile = resolve(process.argv[2] || ".pilot-drill/browser-profiles/1794038677483");
if (relative(resolve(".pilot-drill"), profile).startsWith(".."))
  throw new Error("Test profiles only");
const client = await request.newContext();
const { fixture, state: initialWarehouse } = await (
  await client.get("http://127.0.0.1:4318/state")
).json();
if (fixture.buildMode !== "production") throw new Error("Production build required");
const base = "http://127.0.0.1:4317";
let context, page;
const steps = [];
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const canonical = (rows) => JSON.stringify([...rows].sort((a, b) => a.name.localeCompare(b.name)));
const digest = (rows) => createHash("sha256").update(canonical(rows)).digest("hex");
const open = async () => {
  context = await webkit.launchPersistentContext(profile, { headless: true });
  page = await context.newPage();
};
const queues = () =>
  page.evaluate(async () => {
    const names = ["werkit_part_picks", "werkit_offline_queue", "werkit_gps_db"];
    const result = [];
    for (const item of await indexedDB.databases()) {
      if (!names.includes(item.name)) continue;
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open(item.name);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const stores = {};
      for (const name of [...db.objectStoreNames].sort()) {
        stores[name] = await new Promise((resolve, reject) => {
          const r = db.transaction(name).objectStore(name).getAll();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
      }
      result.push({ name: item.name, version: item.version, stores });
      db.close();
    }
    return result;
  });
const login = async (index) => {
  if (page.url() !== `${base}/login`) await page.goto(`${base}/login`);
  await page.locator("#username").fill(fixture.accounts[index].usernameEmail);
  await page.locator("#password").fill(fixture.password);
  await page.getByRole("button", { name: "Zaloguj", exact: true }).click();
  await page.waitForURL("**/worker", { timeout: 20000 });
};
const logout = async () => {
  await page.getByRole("link", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: "Wyloguj z systemu" }).click();
  await page.waitForURL("**/login");
};
try {
  await open();
  await page.goto(`${base}/login`);
  const before = await queues();
  if (process.argv[3]) {
    const original = JSON.parse(readFileSync(process.argv[3], "utf8")).databases;
    assert(
      canonical(before) === canonical(original),
      "Original queues changed before recovery test"
    );
  }
  const pending = before.find((d) => d.name === "werkit_part_picks")?.stores.pending;
  assert(pending?.length === 1, "Expected the preserved uncertain part pick");
  const body = JSON.parse(pending[0].body);
  // Normal SW update, without unregistering workers or clearing any storage.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    await reg.update();
    const worker = reg.installing || reg.waiting;
    if (worker && worker.state !== "activated")
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("SW activation timeout")), 15000);
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            clearTimeout(timer);
            resolve();
          }
          if (worker.state === "redundant") {
            clearTimeout(timer);
            reject(new Error("SW install failed"));
          }
        });
      });
  });
  await page.reload();
  await login(0);
  const checkA = async () => {
    await page.getByPlaceholder("Np. numer seryjny", { exact: true }).waitFor();
    assert(
      (await page.getByPlaceholder("Np. numer seryjny", { exact: true }).inputValue()) ===
        body.notes,
      "Lost note"
    );
    assert(
      (await page.getByPlaceholder("np. 2", { exact: true }).inputValue()) === body.quantity,
      "Lost quantity"
    );
    assert(canonical(await queues()) === canonical(before), "Queues changed");
  };
  await checkA();
  steps.push("old profile login A and pending form: PASS");
  await context.close();
  await open();
  await page.goto(`${base}/worker`);
  await checkA();
  steps.push("full process restart: PASS");
  await logout();
  await login(1);
  await page.getByRole("button", { name: "Pobierz z magazynu", exact: true }).waitFor();
  assert(
    (await page.getByPlaceholder("Np. numer seryjny", { exact: true }).count()) === 0,
    "B saw A's form"
  );
  assert(canonical(await queues()) === canonical(before), "Switching account modified queues");
  await logout();
  await login(0);
  await checkA();
  steps.push("A-B-A account isolation: PASS");
  await context.close();
  await open();
  await page.goto(`${base}/worker`);
  await checkA();
  const finalWarehouse = (await (await client.get("http://127.0.0.1:4318/state")).json()).state;
  assert(
    JSON.stringify(initialWarehouse) === JSON.stringify(finalWarehouse),
    "Recovery submitted a stock movement"
  );
  const result = {
    buildMode: fixture.buildMode,
    browser: await page.evaluate(() => navigator.userAgent),
    steps,
    queuesBeforeSha256: digest(before),
    queuesAfterSha256: digest(await queues()),
    preservedOperationId: pending[0].operationId,
    initialWarehouse,
    finalWarehouse,
  };
  writeFileSync(".pilot-drill/webkit-old-profile-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(
    JSON.stringify({
      error: error.message,
      url: page?.url(),
      body: await page
        ?.locator("body")
        .innerText()
        .catch(() => "unavailable"),
    })
  );
  throw error;
} finally {
  await context?.close();
  await client.dispose();
}

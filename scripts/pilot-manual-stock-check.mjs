import assert from "node:assert/strict";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
const { chromium, request } =
  await import("../.pilot-drill/browser-tools/node_modules/playwright/index.mjs");
const api = await request.newContext();
const { fixture } = await (await api.get("http://127.0.0.1:4318/state")).json();
assert.equal(fixture.buildMode, "production");
const base = "http://127.0.0.1:4317";
const profile = resolve(`.pilot-drill/manual-stock-profile-${Date.now()}`);
let context, page;
const results = [];
const state = async () => (await api.get("http://127.0.0.1:4318/manual-stock-state")).json();
async function open() {
  context = await chromium.launchPersistentContext(profile, { channel: "chrome", headless: true });
  context.setDefaultTimeout(15000);
  page = await context.newPage();
}
async function login(index) {
  await page.goto(`${base}/login`);
  await page.locator("#username").fill(fixture.accounts[index].usernameEmail);
  await page.locator("#password").fill(fixture.password);
  await page.getByRole("button", { name: "Zaloguj", exact: true }).click();
  await page.waitForURL("**/admin");
}
async function logout() {
  await page.evaluate(async () => {
    const r = await fetch("/api/auth/logout", { method: "POST" });
    if (!r.ok) throw Error("logout failed");
  });
  await page.goto(`${base}/login`);
}
async function warehouse(kind) {
  await page.goto(`${base}/admin/${kind === "dur" ? "dur/warehouse" : "materials"}`);
  await page.getByRole("button", { name: "Nowe wydanie", exact: true }).waitFor();
}
try {
  await open();
  await login(2);
  for (const kind of ["dur", "materials"])
    for (const type of ["receipts", "issues"])
      for (const failure of ["after", "before"]) {
        await warehouse(kind);
        const url = `/api/${kind}/stock/${type}`;
        const before = await state();
        const table = kind === "dur" ? `stock_${type}` : `material_stock_${type}`;
        const inventory = kind === "dur" ? "spare_part_inventory" : "material_inventory";
        const skuKey = kind === "dur" ? "part_id" : "material_id";
        const skuId = kind === "dur" ? fixture.partId : fixture.materialId;
        const quantity = type === "receipts" ? "10" : "2";
        const note = `manual-${kind}-${type}-${failure}-${Date.now()}`;
        if (type === "receipts")
          await page.getByRole("button", { name: "Przyjęcia (PZ)", exact: true }).click();
        await page
          .getByRole("button", {
            name: type === "receipts" ? "Nowe przyjęcie" : "Nowe wydanie",
            exact: true,
          })
          .click();
        const form = page.locator(
          kind === "dur"
            ? type === "receipts"
              ? "#receipt-form"
              : "#issue-form"
            : "#material-stock-form"
        );
        await form.getByRole("combobox").first().click();
        await page
          .getByRole("option")
          .filter({ hasText: kind === "dur" ? "TEST browser part" : "TEST browser material" })
          .click();
        await form.locator('input[inputmode="decimal"]').first().fill(quantity);
        await form.locator("textarea").fill(note);
        await page.evaluate(
          ({ url, failure }) => {
            const original = window.fetch.bind(window);
            window.fetch = async (input, init) => {
              const path = new URL(
                typeof input === "string" ? input : (input.url ?? String(input)),
                location.href
              ).pathname;
              if (path !== url || init?.method !== "POST") return original(input, init);
              window.fetch = original;
              window.__manualKey = new Headers(init.headers).get("Idempotency-Key");
              if (failure === "after") {
                const r = await original(input, init);
                if (r.status !== 200) throw Error(`Commit failed ${r.status}`);
                await r.arrayBuffer();
              }
              throw new TypeError("Injected lost response");
            };
          },
          { url, failure }
        );
        await page.getByRole("button", { name: "Zapisz", exact: true }).click();
        await page.getByRole("button", { name: "OK", exact: true }).waitFor();
        const key = await page.evaluate(() => window.__manualKey);
        assert.ok(key);
        const committed = await state();
        assert.equal(committed[table].length, before[table].length + (failure === "after" ? 1 : 0));
        await context.close();
        await open();
        await warehouse(kind);
        const panel = () => page.getByTestId("pending-stock-movement").filter({ hasText: note });
        await panel().waitFor();
        await logout();
        await login(3);
        await warehouse(kind);
        assert.equal(await panel().count(), 0);
        const denied = await page.evaluate(
          async ({ url, owner, key, kind, skuId, quantity }) =>
            (
              await fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Idempotency-Key": key,
                  "X-Werkit-Offline-Owner": owner,
                },
                body: JSON.stringify({
                  [kind === "dur" ? "partId" : "materialId"]: skuId,
                  quantity,
                }),
              })
            ).status,
          {
            url,
            owner: `${fixture.companyId}:${fixture.accounts[2].id}`,
            key,
            kind,
            skuId,
            quantity,
          }
        );
        assert.equal(denied, 409);
        await logout();
        await login(2);
        await warehouse(kind);
        await panel().waitFor();
        const sent = page.waitForRequest((r) => r.method() === "POST" && r.url() === base + url);
        await panel().getByRole("button", { name: "Ponów ten sam zapis", exact: true }).click();
        assert.equal((await sent).headers()["idempotency-key"], key);
        await page.getByText("Zapisano ruch magazynowy.", { exact: true }).waitFor();
        const final = await state();
        assert.equal(final[table].length, before[table].length + 1);
        assert.equal(
          final.stock_movement_operations.length,
          before.stock_movement_operations.length + 1
        );
        const stock = (s) => Number(s[inventory].find((r) => r[skuKey] === skuId)?.quantity ?? 0);
        assert.equal(
          stock(final),
          stock(before) + (type === "receipts" ? 1 : -1) * Number(quantity)
        );
        if (failure === "after") assert.deepEqual(final, committed);
        assert.equal(final[table].filter((r) => r.notes === note).length, 1);
        results.push({
          kind,
          type,
          failure,
          status: "PASS",
          beforeStock: stock(before),
          afterStock: stock(final),
          key,
          accountMismatch: denied,
        });
        await page.getByRole("button", { name: "OK", exact: true }).click();
        await panel().waitFor({ state: "hidden" });
      }
  const result = {
    status: "PASS",
    buildMode: fixture.buildMode,
    browser: await page.evaluate(() => navigator.userAgent),
    results,
  };
  writeFileSync(".pilot-drill/manual-stock-browser-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e.message);
  console.error(
    await page
      ?.locator("body")
      .innerText()
      .catch(() => "unavailable")
  );
  throw e;
} finally {
  await context?.close();
  await api.dispose();
}

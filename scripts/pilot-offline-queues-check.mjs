import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(".pilot-drill/browser-engines");
const { webkit, chromium, request } =
  await import("../.pilot-drill/browser-tools/node_modules/playwright/index.mjs");
const engine = process.argv[2] || "webkit";
const usb = engine === "usb" ? await import("./pilot-usb-browser.mjs") : null;
const browserType = usb?.usbBrowserType ?? (engine === "webkit" ? webkit : chromium);
const client = await request.newContext();
const { fixture } = await (await client.get("http://127.0.0.1:4318/state")).json();
if (fixture.buildMode !== "production") throw new Error("Production build required");
const state = async () => (await client.get("http://127.0.0.1:4318/queue-state")).json();
const profile = resolve(`.pilot-drill/queue-profiles/${engine}-${Date.now()}`);
const base = "http://127.0.0.1:4317";
const ownerA = `${fixture.companyId}:${fixture.accounts[0].id}`;
const ownerB = `${fixture.companyId}:${fixture.accounts[1].id}`;
const notePrefix = `queue-${engine}-${Date.now()}`;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
let context, page;
const open = async (offline = false) => {
  context = await browserType.launchPersistentContext(profile, {
    headless: true,
    offline,
    ...(engine === "chrome" ? { channel: "chrome" } : {}),
  });
  await context.addInitScript(
    ({ ownerA, ownerB, notePrefix }) => {
      // Synthetic sensor readings enter the actual application watcher and queue.
      const watchers = new Map();
      let nextId = 1;
      Object.defineProperty(navigator, "geolocation", {
        value: {
          watchPosition(success) {
            const id = nextId++;
            watchers.set(id, success);
            return id;
          },
          clearWatch(id) {
            watchers.delete(id);
          },
          getCurrentPosition() {},
        },
      });
      window.__pilotGps = (lat) => {
        for (const success of watchers.values())
          success({
            coords: {
              latitude: lat,
              longitude: 21,
              accuracy: 5,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: 0,
            },
            timestamp: Date.now(),
          });
        return watchers.size;
      };
      const original = window.fetch.bind(window);
      window.__pilotRequests = [];
      const send = async (input, init) => {
        const r = await original(input, init);
        window.__pilotRequests.push({
          url: String(input),
          status: r.status,
          body: await r.clone().text(),
        });
        return r;
      };
      window.fetch = async (input, init) => {
        if (typeof input === "string" && input.includes("?isolation-check=1"))
          return original(input, init);
        const path = new URL(
          typeof input === "string" ? input : (input.url ?? String(input)),
          location.href
        ).pathname;
        if (init?.method !== "POST" || !["/api/worker/gps", "/api/worker/offline"].includes(path))
          return original(input, init);
        const owner = new Headers(init.headers).get("X-Werkit-Offline-Owner");
        const mode = localStorage.getItem("pilot-queue-mode") || "blocked";
        if (owner === ownerB && mode === "B") return send(input, init);
        if (owner === ownerA && mode === "allow") return send(input, init);
        if (
          owner === ownerA &&
          mode === "lose" &&
          !localStorage.getItem(`pilot-lost:${notePrefix}:${path}`)
        ) {
          const response = await original(input, init);
          if (response.status !== 200) throw new Error(`Expected commit: ${response.status}`);
          await response.arrayBuffer();
          localStorage.setItem(`pilot-lost:${notePrefix}:${path}`, "1");
        }
        throw new TypeError("Injected queue network failure");
      };
    },
    { ownerA, ownerB, notePrefix }
  );
  page = await context.newPage();
};
const mode = (value) =>
  page.evaluate((value) => localStorage.setItem("pilot-queue-mode", value), value);
const queues = () =>
  page.evaluate(async () => {
    const result = {};
    for (const [name, store] of [
      ["werkit_offline_queue", "actions"],
      ["werkit_gps_db", "gps_queue_v2"],
    ]) {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      result[store] = await new Promise((resolve, reject) => {
        const r = db.transaction(store).objectStore(store).getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
    }
    return result;
  });
const wait = async (fn, label) => {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timeout: ${label}`);
};
const login = async (index) => {
  if (page.url() !== `${base}/login`) await page.goto(`${base}/login`);
  await page.locator("#username").fill(fixture.accounts[index].usernameEmail);
  await page.locator("#password").fill(fixture.password);
  if (usb) {
    await page.locator("#password").blur();
    await page.waitForFunction(
      () =>
        !visualViewport ||
        (visualViewport.offsetTop === 0 && visualViewport.height >= innerHeight - 1)
    );
  }
  await page.getByRole("button", { name: "Zaloguj", exact: true }).click();
  await page.waitForURL("**/worker");
  await page.getByRole("button", { name: /dodaj notatkę/i }).waitFor();
};
const logout = async () => {
  await page.getByRole("link", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: "Wyloguj z systemu" }).click();
  await page.waitForURL("**/login");
};
const note = async (suffix, queued = true) => {
  await page.getByRole("button", { name: /dodaj notatkę/i }).click();
  await page.locator("#worker-note-form textarea").fill(`${notePrefix}-${suffix}`);
  if (usb) {
    await page.locator("#worker-note-form textarea").blur();
    await page.waitForFunction(
      () =>
        !visualViewport ||
        (visualViewport.offsetTop === 0 && visualViewport.height >= innerHeight - 1)
    );
  }
  await page.locator('button[form="worker-note-form"]').click();
  if (queued) {
    await page.getByRole("button", { name: "OK", exact: true }).click();
  }
  await page.locator("#worker-note-form").waitFor({ state: "hidden" });
};
const gps = async (lat) => {
  await wait(() => page.evaluate((lat) => window.__pilotGps(lat) > 0, lat), "GPS watcher");
};
const restart = async () => {
  await context.close();
  await open();
  await page.goto(`${base}/worker`);
  await page.getByRole("button", { name: /dodaj notatkę/i }).waitFor();
};
try {
  await open();
  await mode("blocked");
  await login(0);
  await gps(52.1);
  await gps(52.11);
  await note("A1");
  await note("A2");
  await wait(async () => {
    const q = await queues();
    return q.actions.length === 2 && q.gps_queue_v2.length === 2;
  }, "nonempty queues");
  const original = await queues();
  assert(
    original.actions.every(
      (x) => x.owner === ownerA && x.payload.sessionId === fixture.accounts[0].sessionId
    ),
    "Wrong action owner/session"
  );
  assert(
    original.gps_queue_v2.every(
      (x) => x.owner === ownerA && x.sessionId === fixture.accounts[0].sessionId
    ),
    "Wrong GPS owner/session"
  );
  await restart();
  assert(JSON.stringify(await queues()) === JSON.stringify(original), "Restart altered queues");
  if ((engine === "chrome" || usb) && process.argv.includes("--full-offline")) {
    assert(fixture.networkGateway, "Network gateway required for full offline restart");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await wait(
      () =>
        page.evaluate(async (owner) => {
          const c = await caches.open(`werkit-account-v1-${owner}`);
          return Boolean(
            navigator.serviceWorker.controller && (await c.match(`${location.origin}/worker`))
          );
        }, ownerA),
      "offline snapshot and active service worker"
    );
    await client.post("http://127.0.0.1:4318/network/off");
    await context.close();
    await open();
    await page.goto(`${base}/worker`);
    await page.getByRole("button", { name: /dodaj notatkę/i }).waitFor();
    assert(
      JSON.stringify(await queues()) === JSON.stringify(original),
      "Fully offline restart altered queues"
    );
    await client.post("http://127.0.0.1:4318/network/on");
  }
  await logout();
  await mode("B");
  await login(1);
  // B may send its own work, but cannot claim A's retained records.
  await gps(52.2);
  await note("B", false);
  await wait(async () => (await state()).notes.some((n) => n.note === `${notePrefix}-B`), "B sync");
  await wait(async () => {
    const q = await queues();
    return (
      !q.actions.some((x) => x.owner === ownerB) && !q.gps_queue_v2.some((x) => x.owner === ownerB)
    );
  }, "B acknowledgements");
  assert(JSON.stringify(await queues()) === JSON.stringify(original), "B consumed A queues");
  const denied = await page.evaluate(
    async ({ action, ownerA }) => {
      // Bypass only the test network gate for this explicit server isolation check.
      const r = await fetch("/api/worker/offline?isolation-check=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Werkit-Offline-Owner": ownerA },
        body: JSON.stringify({
          operationId: action.id,
          type: action.type,
          payload: action.payload,
        }),
      });
      return r.status;
    },
    { action: original.actions[0], ownerA }
  );
  assert(denied === 409 || denied === 403, `Unexpected isolation response: ${denied}`);
  await logout();
  await mode("blocked");
  await login(0);
  assert(JSON.stringify(await queues()) === JSON.stringify(original), "A-B-A altered queues");
  await mode("lose");
  await page.reload();
  await wait(async () => {
    const s = await state();
    return (
      original.gps_queue_v2.every((p) => s.gps.some((row) => row.client_point_id === p.pointId)) &&
      original.actions.some((a) => s.operations.some((row) => row.id === a.id))
    );
  }, "commits before lost responses");
  assert(
    JSON.stringify(await queues()) === JSON.stringify(original),
    "Lost responses removed queued records"
  );
  await mode("blocked");
  await restart();
  assert(
    JSON.stringify(await queues()) === JSON.stringify(original),
    "Lost-response restart altered queues"
  );
  await mode("allow");
  await page.reload();
  await wait(async () => {
    const q = await queues();
    return !q.actions.length && !q.gps_queue_v2.length;
  }, "final queue drain");
  const final = await state();
  for (const p of original.gps_queue_v2)
    assert(
      final.gps.filter(
        (row) =>
          row.client_point_id === p.pointId &&
          row.work_session_id === p.sessionId &&
          row.user_id === fixture.accounts[0].id
      ).length === 1,
      "GPS not delivered exactly once to original session"
    );
  for (const action of original.actions)
    assert(
      final.operations.filter(
        (row) => row.id === action.id && row.user_id === fixture.accounts[0].id
      ).length === 1,
      "Operation receipt mismatch"
    );
  for (const suffix of ["A1", "A2", "B"])
    assert(
      final.notes.filter((row) => row.note === `${notePrefix}-${suffix}`).length === 1,
      "Duplicate/missing note"
    );
  const result = {
    engine,
    ...(usb ? { device: usb.usbDevice } : {}),
    buildMode: fixture.buildMode,
    browser: await page.evaluate(() => navigator.userAgent),
    status: "PASS",
    fullOfflineRestart: Boolean(
      (engine === "chrome" || usb) && process.argv.includes("--full-offline")
    ),
    original,
    denied,
    final,
    scenarios: [
      "nonempty queues survive full restart",
      "A-B-A and B independent sync",
      "lost replies after server commit survive restart",
      "GPS original session and exactly-once notes",
      "queues empty only after acknowledgements",
    ],
  };
  writeFileSync(`.pilot-drill/queues-${engine}-result.json`, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      engine,
      status: result.status,
      gps: original.gps_queue_v2.length,
      actions: original.actions.length,
    })
  );
} catch (error) {
  console.error(
    JSON.stringify({
      error: error.message,
      url: page?.url(),
      requests: await page?.evaluate(() => window.__pilotRequests).catch(() => null),
      queues: await queues().catch(() => null),
      body: await page
        ?.locator("body")
        .innerText()
        .catch(() => "unavailable"),
    })
  );
  throw error;
} finally {
  if (fixture.networkGateway) await client.post("http://127.0.0.1:4318/network/on").catch(() => {});
  await context?.close();
  await client.dispose();
  await usb?.cleanupUsb();
}

async (page) => {
  // Run with Playwright browser_run_code_unsafe(filename) after pilot-browser-server.mjs.
  const base = "http://127.0.0.1:4317";
  const info = async () => (await (await page.request.get("http://127.0.0.1:4318/state")).json());
  const { fixture } = await info();
  const browserType = page.pilotBrowserType ?? page.context().browser().browserType();
  const profile = `${fixture.profileRoot}/${Date.now()}`;
  let context, p;
  const results = [];
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const open = async () => {
    context = await browserType.launchPersistentContext(profile, { ...(browserType.name() === "chromium" ? { channel: "chrome" } : {}), headless: true });
    p = await context.newPage();
  };
  const login = async (index) => {
    if (p.url() !== `${base}/login`) await p.goto(`${base}/login`);
    await p.locator("#username").fill(fixture.accounts[index].usernameEmail);
    await p.locator("#password").fill(fixture.password);
    await p.getByRole("button", { name: "Zaloguj", exact: true }).click();
    await p.waitForURL("**/worker");
    await p.getByRole("button", { name: "Pobierz z magazynu", exact: true }).waitFor();
  };
  const logout = async () => {
    await p.getByRole("link", { name: "Profil", exact: true }).click();
    await p.getByRole("button", { name: "Wyloguj z systemu" }).click();
    await p.waitForURL("**/login");
  };
  const form = async (note) => {
    await p.getByRole("button", { name: "Pobierz z magazynu", exact: true }).click();
    await p.getByRole("combobox").click();
    await p.getByRole("option").filter({ hasText: "TEST browser part" }).click();
    await p.getByPlaceholder("np. 2", { exact: true }).fill("2");
    await p.getByPlaceholder("Np. numer seryjny", { exact: true }).fill(note);
  };
  try {
    await open(); await login(0);
    const initial = (await info()).state;
    const path = `/api/worker/work-orders/${fixture.accounts[0].orderId}/spare-parts`;
    // Inject at the page fetch boundary: SW-owned requests are not reliably
    // interceptable through Playwright routing in WebKit.
    const injectFailure = async (mode) => p.evaluate(({ path, mode }) => {
      const original = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = new URL(typeof input === "string" ? input : input.url ?? String(input), location.href);
        if (url.pathname !== path || init?.method !== "POST") return original(input, init);
        window.fetch = original;
        window.__pilotPartPickKey = new Headers(init.headers).get("Idempotency-Key");
        if (mode === "after-response") {
          const response = await original(input, init);
          if (response.status !== 200) throw new Error("Expected server commit before lost response");
          await response.arrayBuffer();
        }
        throw new TypeError("Injected network failure");
      };
    }, { path, mode });
    let originalKey;
    const note = `lost-response-${Date.now()}`;
    await form(note);
    await injectFailure("after-response");
    await p.getByRole("button", { name: "Pobierz z magazynu", exact: true }).click();
    await p.getByRole("button", { name: "OK", exact: true }).waitFor();
    originalKey = await p.evaluate(() => window.__pilotPartPickKey);
    assert(Boolean(originalKey), "Failure injection did not intercept request");
    const committed = (await info()).state;
    assert(committed.issues === initial.issues + 1 && committed.lines === initial.lines + 1 && committed.receipts === initial.receipts + 1 && Number(committed.stock) === Number(initial.stock) - 2, "Expected one committed issue");
    await context.close(); await open();
    await p.goto(`${base}/worker`);
    await p.getByPlaceholder("Np. numer seryjny", { exact: true }).waitFor();
    assert(await p.getByPlaceholder("Np. numer seryjny", { exact: true }).inputValue() === note, "Restart lost note");
    assert(await p.getByPlaceholder("np. 2", { exact: true }).inputValue() === "2", "Restart lost quantity");
    await logout(); await login(1);
    assert(await p.getByPlaceholder("Np. numer seryjny", { exact: true }).count() === 0, "B recovered A's form");
    await logout(); await login(0);
    await p.getByPlaceholder("Np. numer seryjny", { exact: true }).waitFor();
    const sent = p.waitForRequest(r => r.method() === "POST" && r.url().endsWith(`/${fixture.accounts[0].orderId}/spare-parts`));
    await p.getByRole("button", { name: "Pobierz z magazynu", exact: true }).click();
    assert((await sent).headers()["idempotency-key"] === originalKey, "Replay changed key");
    await p.getByText("Część pobrana z magazynu.", { exact: true }).waitFor();
    const replayed = (await info()).state;
    assert(JSON.stringify(replayed) === JSON.stringify(committed), "Replay changed warehouse");
    results.push({ scenario: "lost response + full browser restart + A-B-A", status: "PASS", before: initial, afterServerCommit: committed, afterReplay: replayed });
    await p.getByRole("button", { name: "OK", exact: true }).click();
    await p.getByRole("combobox").waitFor({ state: "hidden" });
    await form(`never-sent-${Date.now()}`);
    await injectFailure("before-request");
    await p.getByRole("button", { name: "Pobierz z magazynu", exact: true }).click();
    await p.getByRole("button", { name: "OK", exact: true }).waitFor();
    originalKey = await p.evaluate(() => window.__pilotPartPickKey);
    assert(Boolean(originalKey), "Failure injection did not intercept request");
    assert(JSON.stringify((await info()).state) === JSON.stringify(committed), "Aborted request reached DB");
    await context.close(); await open(); await p.goto(`${base}/worker`);
    await p.getByPlaceholder("Np. numer seryjny", { exact: true }).waitFor();
    const retry = p.waitForRequest(r => r.method() === "POST" && r.url().endsWith(`/${fixture.accounts[0].orderId}/spare-parts`));
    await p.getByRole("button", { name: "Pobierz z magazynu", exact: true }).click();
    assert((await retry).headers()["idempotency-key"] === originalKey, "Unsent retry changed key");
    await p.getByText("Część pobrana z magazynu.", { exact: true }).waitFor();
    const final = (await info()).state;
    assert(final.issues === committed.issues + 1 && final.lines === committed.lines + 1 && final.receipts === committed.receipts + 1 && Number(final.stock) === Number(committed.stock) - 2, "Unsent retry not applied exactly once");
    results.push({ scenario: "request aborted before server + full restart + retry", status: "PASS", before: committed, after: final });
    return { browser: await p.evaluate(() => navigator.userAgent), results };
  } catch (error) {
    error.message += "\nBrowser state: " + JSON.stringify({ url: p?.url(), body: await p?.locator("body").innerText().catch(() => "unavailable"), storage: await p?.evaluate(async () => ({ databases: await indexedDB.databases(), owner: document.querySelector('meta[name="werkit-offline-owner"]')?.content })).catch(() => null) });
    throw error;
  } finally { await context?.close(); }
}

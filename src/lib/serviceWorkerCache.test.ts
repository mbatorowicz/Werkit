import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

// Execute the shipped service worker, including its event handlers (not a copy).
function harness(
  stores = new Map<string, Map<string, Response>>(),
  failCacheWrite: boolean | (() => boolean) = false
) {
  const key = (request: Request | string) => (typeof request === "string" ? request : request.url);
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        match: async (request: Request | string) => store.get(key(request))?.clone(),
        put: async (request: Request | string, response: Response) => {
          if (typeof failCacheWrite === "function" ? failCacheWrite() : failCacheWrite)
            throw new Error("Cache storage write failed");
          store.set(key(request), response.clone());
        },
      };
    },
  };
  type Event = {
    request?: Request;
    respondWith?: (p: Promise<Response>) => void;
    waitUntil?: (p: Promise<void>) => void;
  };
  const listeners = new Map<string, (e: Event) => void>();
  const fetch = vi.fn<typeof globalThis.fetch>();
  const claim = vi.fn();
  const context = createContext({
    self: {
      location: { origin: "https://werkit.test" },
      addEventListener: (name: string, fn: (e: Event) => void) => listeners.set(name, fn),
      clients: { claim, matchAll: async () => [] },
      skipWaiting: vi.fn(),
    },
    caches,
    fetch,
    Response,
    Request,
    Headers,
    URL,
  });
  context.importScripts = () => runInContext(readFileSync("public/sw-account.js", "utf8"), context);
  runInContext(readFileSync("public/sw.js", "utf8"), context);
  return {
    stores,
    fetch,
    claim,
    activate: () =>
      new Promise<void>((resolve, reject) =>
        listeners.get("activate")!({ waitUntil: (p) => p.then(resolve, reject) })
      ),
    request: (path: string, mode?: RequestMode, method = "GET") =>
      new Promise<Response>((resolve, reject) => {
        const request = new Request(`https://werkit.test${path}`, { method });
        if (mode) Object.defineProperty(request, "mode", { value: mode });
        listeners.get("fetch")!({
          request,
          respondWith: (p) => p.then(resolve, reject),
        });
      }),
  };
}

describe("PWA account cache isolation", () => {
  it("cannot revive A after B's snapshot write fails, including a worker restart", async () => {
    const stores = new Map<string, Map<string, Response>>();
    let fail = false;
    const h = harness(stores, () => fail);
    const live = (owner: string) =>
      new Response(owner, {
        headers: {
          "X-Werkit-Offline-Owner": owner,
          "X-Werkit-Offline-Until": String(Date.now() + 60000),
        },
      });
    h.fetch.mockResolvedValue(live("1:1"));
    expect((await h.request("/api/worker/session")).status).toBe(200);
    fail = true;
    // A failed refresh must not forget the owner whose old snapshot needs deletion.
    expect((await h.request("/api/worker/session")).status).toBe(200);
    h.fetch.mockResolvedValue(live("1:2"));
    expect(await (await h.request("/api/worker/session")).text()).toBe("1:2");
    expect(stores.has("werkit-account-v1-1:1")).toBe(false);
    const restarted = harness(stores);
    restarted.fetch.mockRejectedValue(new Error("offline"));
    expect((await restarted.request("/api/worker/session")).status).toBe(503);
  });

  it("keeps a live private response when its offline snapshot cannot be written", async () => {
    const h = harness(new Map(), true);
    h.fetch.mockResolvedValue(
      new Response("current account", {
        headers: {
          "X-Werkit-Offline-Owner": "1:1",
          "X-Werkit-Offline-Until": String(Date.now() + 60000),
        },
      })
    );
    const response = await h.request("/api/worker/session");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("current account");
    h.fetch.mockRejectedValue(new Error("offline"));
    expect((await h.request("/api/worker/session")).status).toBe(503);
  });

  it("serves a downloaded script even if storing it in Cache Storage fails", async () => {
    const h = harness(new Map(), true);
    h.fetch.mockResolvedValue(new Response("/* app */", { status: 200 }));
    const response = await h.request("/_next/static/chunks/app.js");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("/* app */");
  });

  it("shows a neutral offline page instead of cached authenticated HTML", async () => {
    const h = harness();
    h.fetch.mockRejectedValue(new Error("offline"));
    const response = await h.request("/worker", "navigate");
    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(await response.text()).toContain("Brak połączenia");
    expect([...h.stores.keys()].filter((k) => k.startsWith("werkit-account-"))).toHaveLength(0);
  });

  it("does not cache a login redirect returned for an asset", async () => {
    const h = harness();
    const redirected = new Response("login HTML");
    Object.defineProperty(redirected, "redirected", { value: true });
    h.fetch.mockResolvedValueOnce(redirected);
    await h.request("/_next/static/chunks/hash.js");
    h.fetch.mockRejectedValueOnce(new Error("offline"));
    expect((await h.request("/_next/static/chunks/hash.js")).status).toBe(503);
  });
  it("removes all legacy Werkit caches before claiming clients, preserving unrelated caches", async () => {
    const h = harness();
    h.stores.set("werkit-v5", new Map([["/worker", new Response("account A")]]));
    h.stores.set("another-app", new Map());
    h.claim.mockImplementation(() => expect(h.stores.has("werkit-v5")).toBe(false));
    await h.activate();
    expect([...h.stores.keys()]).toEqual(["another-app"]);
    expect(h.claim).toHaveBeenCalledOnce();
  });

  it.each([
    "/api/worker/session",
    "/api/worker/work-orders",
    "/api/worker/settings",
    "/worker",
    "/admin",
    "/worker?_rsc=abc",
    "/api/photos/private.jpg",
  ])("never replays account A at %s to account B offline", async (path) => {
    const h = harness();
    h.fetch.mockResolvedValueOnce(new Response("private A"));
    expect(await (await h.request(path)).text()).toBe("private A");
    h.fetch.mockResolvedValueOnce(new Response("logged out"));
    await h.request("/login");
    h.fetch.mockResolvedValueOnce(new Response("private B"));
    await h.request(path);
    h.fetch.mockRejectedValueOnce(new Error("offline"));
    const response = await h.request(path);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
    expect([...h.stores.keys()].filter((k) => k.startsWith("werkit-account-"))).toHaveLength(0);
    expect(h.fetch).toHaveBeenLastCalledWith(expect.any(Request), { cache: "no-store" });
  });

  it.each([401, 403, 500])(
    "returns status %i without falling back to previously successful data",
    async (status) => {
      const h = harness();
      h.fetch.mockResolvedValueOnce(new Response("private A"));
      await h.request("/api/worker/session");
      h.fetch.mockResolvedValueOnce(new Response("denied", { status }));
      expect((await h.request("/api/worker/session")).status).toBe(status);
      h.fetch.mockRejectedValueOnce(new Error("offline"));
      expect((await h.request("/api/worker/session")).status).toBe(503);
    }
  );

  it("keeps public build assets usable offline", async () => {
    const h = harness();
    h.fetch.mockResolvedValueOnce(new Response("public JS"));
    await h.request("/_next/static/chunks/hash.js");
    h.fetch.mockRejectedValue(new Error("offline"));
    expect(await (await h.request("/_next/static/chunks/hash.js")).text()).toBe("public JS");
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });
});

function scoped(body: string, owner = "1:1", until = Date.now() + 60000) {
  return new Response(body, {
    headers: { "X-Werkit-Offline-Owner": owner, "X-Werkit-Offline-Until": String(until) },
  });
}
describe("account-scoped offline restart", () => {
  it("restores the same account after the service worker process restarts", async () => {
    const h = harness();
    h.fetch.mockResolvedValueOnce(scoped("worker A"));
    await h.request("/worker", "navigate");
    const reboot = harness(h.stores);
    reboot.fetch.mockRejectedValue(new Error("offline"));
    const response = await reboot.request("/worker", "navigate");
    expect(await response.text()).toBe("worker A");
    expect(response.headers.get("X-Werkit-Sw-Cache")).toBe("1");
  });
  it("blocks offline logout across restart without exposing the old snapshot", async () => {
    const h = harness();
    h.fetch.mockResolvedValueOnce(scoped("worker A"));
    await h.request("/worker", "navigate");
    h.fetch.mockRejectedValue(new Error("offline"));
    await expect(h.request("/api/auth/logout", undefined, "POST")).rejects.toThrow();
    const reboot = harness(h.stores);
    reboot.fetch.mockRejectedValue(new Error("offline"));
    expect((await reboot.request("/worker", "navigate")).status).toBe(503);
  });
  it("switches A to B, never falls back to A, and permits A after a new login", async () => {
    const h = harness();
    h.fetch.mockResolvedValueOnce(scoped("A"));
    await h.request("/worker", "navigate");
    h.fetch.mockResolvedValueOnce(new Response("login ok"));
    await h.request("/api/auth/login", undefined, "POST");
    h.fetch.mockRejectedValueOnce(new Error("offline"));
    expect((await h.request("/worker", "navigate")).status).toBe(503);
    h.fetch.mockResolvedValueOnce(scoped("B", "2:2"));
    await h.request("/worker", "navigate");
    h.fetch.mockRejectedValueOnce(new Error("offline"));
    expect(await (await h.request("/worker", "navigate")).text()).toBe("B");
    h.fetch.mockResolvedValueOnce(new Response("login ok"));
    await h.request("/api/auth/login", undefined, "POST");
    h.fetch.mockResolvedValueOnce(scoped("A refreshed"));
    expect(await (await h.request("/worker", "navigate")).text()).toBe("A refreshed");
  });
  it("does not resurrect an in-flight response after logout", async () => {
    const h = harness();
    let complete!: (value: Response) => void;
    h.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
    const pending = h.request("/worker", "navigate");
    await vi.waitFor(() => expect(complete).toBeDefined());
    h.fetch.mockResolvedValueOnce(new Response("logout ok"));
    await h.request("/api/auth/logout", undefined, "POST");
    complete(scoped("late A"));
    await pending;
    h.fetch.mockRejectedValue(new Error("offline"));
    expect((await h.request("/worker", "navigate")).status).toBe(503);
  });
  it("does not restore an expired snapshot", async () => {
    const h = harness();
    h.fetch.mockResolvedValueOnce(scoped("expired", "1:1", Date.now() - 1));
    await h.request("/worker", "navigate");
    h.fetch.mockRejectedValue(new Error("offline"));
    expect((await h.request("/worker", "navigate")).status).toBe(503);
  });
});

it("routes an offline installed PWA launch from / to its account dashboard", async () => {
  const h = harness();
  h.fetch.mockRejectedValue(new Error("offline"));
  const response = await h.request("/", "navigate");
  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe("https://werkit.test/worker");
});
it("downloads referenced JS and CSS before saving a restartable HTML snapshot", async () => {
  const h = harness();
  h.fetch.mockResolvedValueOnce(scoped('<script src="/_next/static/app.js"></script>'));
  h.fetch.mockResolvedValueOnce(new Response("JS"));
  await h.request("/worker", "navigate");
  const reboot = harness(h.stores);
  reboot.fetch.mockRejectedValue(new Error("offline"));
  expect((await reboot.request("/worker", "navigate")).status).toBe(200);
  expect(await (await reboot.request("/_next/static/app.js")).text()).toBe("JS");
});
it("does not save HTML when a required asset cannot be downloaded", async () => {
  const h = harness();
  h.fetch.mockResolvedValueOnce(scoped('<script src="/_next/static/missing.js"></script>'));
  h.fetch.mockRejectedValue(new Error("offline"));
  await h.request("/worker", "navigate");
  expect((await h.request("/worker", "navigate")).status).toBe(503);
});
it("completes an offline logout online before allowing another protected page", async () => {
  const h = harness();
  h.fetch.mockRejectedValueOnce(new Error("offline"));
  await expect(h.request("/api/auth/logout", undefined, "POST")).rejects.toThrow();
  const reboot = harness(h.stores);
  reboot.fetch.mockResolvedValue(new Response("logout completed"));
  const response = await reboot.request("/worker", "navigate");
  expect(response.status).toBe(302);
  expect(response.headers.get("Location")).toBe("https://werkit.test/login");
  expect(String(reboot.fetch.mock.calls[0][0])).toBe("https://werkit.test/api/auth/logout");
  expect(reboot.fetch.mock.calls[0][1]?.method).toBe("POST");
});

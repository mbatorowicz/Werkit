import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

// Execute the shipped service worker, including its event handlers (not a copy).
function harness() {
  const stores = new Map<string, Map<string, Response>>();
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
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://werkit.test" },
      addEventListener: (name: string, fn: (e: Event) => void) => listeners.set(name, fn),
      clients: { claim },
      skipWaiting: vi.fn(),
    },
    caches,
    fetch,
    Response,
    URL,
  });
  return {
    stores,
    fetch,
    claim,
    activate: () =>
      new Promise<void>((resolve, reject) =>
        listeners.get("activate")!({ waitUntil: (p) => p.then(resolve, reject) })
      ),
    request: (path: string, mode?: RequestMode) =>
      new Promise<Response>((resolve, reject) => {
        const request = new Request(`https://werkit.test${path}`);
        if (mode) Object.defineProperty(request, "mode", { value: mode });
        listeners.get("fetch")!({
          request,
          respondWith: (p) => p.then(resolve, reject),
        });
      }),
  };
}

describe("PWA account cache isolation", () => {
  it("shows a neutral offline page instead of cached authenticated HTML", async () => {
    const h = harness();
    h.fetch.mockRejectedValue(new Error("offline"));
    const response = await h.request("/worker", "navigate");
    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(await response.text()).toContain("Brak połączenia");
    expect(h.stores.size).toBe(0);
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
    expect(h.stores.size).toBe(0);
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

/* Account-scoped offline snapshots. Never use a private response without a
 * server-provided owner and expiry. Mutations remain in IndexedDB. */
const PRIVATE_META = "werkit-offline-meta-v1";
const PRIVATE_PREFIX = "werkit-account-v1-";
const META_URL = new URL("/__offline_account", self.location.origin).href;
let accountState;
let accountEpoch = 0;
let authPending = 0;
let stateLock = Promise.resolve();
let authenticationLock = Promise.resolve();
function authLocked(task) {
  const result = authenticationLock.then(task);
  authenticationLock = result.catch(() => {});
  return result;
}
function locked(task) {
  const result = stateLock.then(task);
  stateLock = result.catch(() => {});
  return result;
}
async function readAccount() {
  if (accountState === undefined) {
    accountState = await loadAccountState();
  }
  return accountState;
}
async function writeAccount(value) {
  await accountStateTransaction("readwrite", value);
  accountState = value;
}
async function invalidateAccount(blocked = true) {
  accountEpoch++;
  await locked(async () => {
    await writeAccount({ owner: null, until: 0, blocked });
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith(PRIVATE_PREFIX)).map((key) => caches.delete(key))
    );
  });
}
function privatePath(request, url) {
  return (
    (url.pathname === "/worker" && request.mode === "navigate") ||
    [
      "/api/worker/session",
      "/api/worker/work-orders",
      "/api/worker/settings",
      "/api/worker/gps",
    ].includes(url.pathname)
  );
}
async function authTransition(request, path, sourceClientId) {
  authPending++;
  let completed = false;
  try {
    await invalidateAccount(true);
    const response = await authLocked(async () => {
      const response = await fetch(request, { cache: "no-store" });
      if (path === "/api/auth/login" && response.ok) {
        await locked(() => writeAccount({ owner: null, until: 0, blocked: false }));
      }
      return response;
    });
    completed = response.ok;
    return response;
  } finally {
    authPending--;
    const clients = await self.clients.matchAll();
    // The initiating page handles its own login/logout navigation. Redirecting
    // it again can cancel the response/navigation it is currently awaiting.
    for (const client of clients) {
      if (client.id !== sourceClientId || !completed)
        client.postMessage({ type: "OFFLINE_ACCOUNT_CHANGED" });
    }
  }
}
async function privateNetworkFirst(request) {
  const epoch = accountEpoch;
  // Resolve persisted state before network; a SW process restart keeps the same gate.
  await locked(readAccount);
  if (accountState.blocked) {
    try {
      await clearBlockedSession();
      return Response.redirect(new URL("/login", self.location.origin).href, 302);
    } catch {
      return offlineResponse(request);
    }
  }
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (epoch !== accountEpoch || authPending) return offlineResponse(request);
    if (response.status === 401 || response.status === 403 || response.redirected) {
      await invalidateAccount(true);
      return response;
    }
    const owner = response.headers.get("X-Werkit-Offline-Owner");
    const until = Number(response.headers.get("X-Werkit-Offline-Until"));
    if (response.ok && /^\d+:\d+$/.test(owner || "") && until > Date.now()) {
      if (new URL(request.url).pathname === "/worker") {
        const html = await response.clone().text();
        const assets = [...html.matchAll(/(?:src|href)="([^"\s]*\/_next\/static\/[^"\s]+)"/g)].map(
          (match) => match[1]
        );
        for (const asset of new Set(assets)) {
          const url = new URL(asset, self.location.origin);
          if (url.origin !== self.location.origin) continue;
          const result = await cacheFirst(new Request(url));
          if (!result.ok)
            return epoch === accountEpoch && !authPending ? response : offlineResponse(request);
        }
      }
      await locked(async () => {
        const state = await readAccount();
        if (epoch !== accountEpoch || authPending || state.blocked) return;
        if (state.owner && state.owner !== owner) {
          // An unobserved account change: discard the previous snapshot first.
          await caches.delete(PRIVATE_PREFIX + state.owner);
        }
        try {
          const cache = await caches.open(PRIVATE_PREFIX + owner);
          await cache.put(request, response.clone());
          await writeAccount({
            owner,
            until: Math.min(until, Date.now() + 43200000),
            blocked: false,
          });
        } catch {
          // A network response is still valid when snapshot storage fails.
          // The previous owner's cache has already been removed above; do not
          // fall back to it or authorize an unwritten snapshot in this process.
          accountState = { ...state, until: 0 };
        }
      });
    }
    return epoch === accountEpoch && !authPending ? response : offlineResponse(request);
  } catch {
    return locked(async () => {
      const state = await readAccount();
      if (
        epoch === accountEpoch &&
        !authPending &&
        !state.blocked &&
        state.owner &&
        state.until > Date.now()
      ) {
        const cached = await (await caches.open(PRIVATE_PREFIX + state.owner)).match(request);
        if (cached && Number(cached.headers.get("X-Werkit-Offline-Until")) > Date.now()) {
          const headers = new Headers(cached.headers);
          headers.set("X-Werkit-Sw-Cache", "1");
          return new Response(cached.body, { status: cached.status, headers });
        }
      }
      return offlineResponse(request);
    });
  }
}

async function clearBlockedSession() {
  return authLocked(async () => {
    const state = await locked(readAccount);
    if (!state.blocked) return;
    const response = await fetch(new URL("/api/auth/logout", self.location.origin), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error("logout_pending");
  });
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "PREPARE_OFFLINE_WORKER") {
    event.waitUntil(
      privateNetworkFirst(
        new Request(new URL("/worker", self.location.origin), {
          headers: { Accept: "text/html" },
          credentials: "include",
        })
      )
    );
  }
});

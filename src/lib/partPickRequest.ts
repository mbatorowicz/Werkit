import { fetchWithDeviceTelemetry } from "./fetchWithDeviceTelemetry";

/** Keep an uncertain request across rerenders/reloads of this tab. Never rotate its key on timeout. */
export async function sendPartPickRequest(
  label: string,
  url: string,
  body: string,
  category: "orders" | "admin"
): Promise<Response> {
  const storageKey = `werkit:part-pick:v1:${url}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const fingerprint = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  const saved = sessionStorage.getItem(storageKey);
  let operationId: string;
  if (saved) {
    const pending: unknown = JSON.parse(saved);
    if (
      !pending ||
      typeof pending !== "object" ||
      !("fingerprint" in pending) ||
      pending.fingerprint !== fingerprint ||
      !("operationId" in pending) ||
      typeof pending.operationId !== "string"
    )
      throw new Error("part_pick_pending");
    operationId = pending.operationId;
  } else {
    operationId = crypto.randomUUID();
    // A storage failure aborts before sending; no untracked mutation.
    sessionStorage.setItem(storageKey, JSON.stringify({ operationId, fingerprint }));
  }
  const response = await fetchWithDeviceTelemetry(
    label,
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": operationId },
      body,
    },
    { category }
  );
  // Authentication, timeout, conflict and server failures may follow a lost success.
  // Only a validated success or definite domain rejection releases this intent.
  if (response.ok || response.status === 400) sessionStorage.removeItem(storageKey);
  return response;
}

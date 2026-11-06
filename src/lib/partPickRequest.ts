import { fetchWithDeviceTelemetry } from "./fetchWithDeviceTelemetry";
import { requireOfflineOwner } from "./offlineOwner";
import { acknowledgePartPick, preparePartPick, readPartPick } from "./partPickStore";

function checkLegacy(url: string) {
  // v1 has no trustworthy owner. Never assign it to whichever account is currently open.
  if (sessionStorage.getItem(`werkit:part-pick:v1:${url}`)) throw new Error("part_pick_legacy");
}
export async function readPendingPartPick(url: string) {
  const owner = requireOfflineOwner();
  const pending = await readPartPick(owner, url);
  if (requireOfflineOwner() !== owner) throw new Error("offline_account_mismatch");
  return pending;
}
/** Persist the exact request for the authenticated account before any network mutation. */
export async function sendPartPickRequest(
  label: string,
  url: string,
  body: string,
  category: "orders" | "admin"
): Promise<Response> {
  const owner = requireOfflineOwner();
  checkLegacy(url);
  const pending = await preparePartPick(owner, url, body);
  if (!pending) throw new Error("part_pick_storage_failed");
  if (requireOfflineOwner() !== owner) throw new Error("offline_account_mismatch");
  const response = await fetchWithDeviceTelemetry(
    label,
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": pending.operationId,
        "X-Werkit-Offline-Owner": owner,
      },
      body: pending.body,
    },
    { category }
  );
  // Never remove a different account's request or a newer intent on a late response.
  if (response.ok || response.status === 400)
    await acknowledgePartPick(owner, url, pending.operationId);
  return response;
}

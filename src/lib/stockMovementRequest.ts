import { requireOfflineOwner } from "./offlineOwner";
import { acknowledgePartPick, preparePartPick, type PendingPartPick } from "./partPickStore";
import { fetchWithDeviceTelemetry } from "./fetchWithDeviceTelemetry";
export const STOCK_PENDING_CHANGED = "werkit-stock-pending-changed";
export function isManualStockUrl(url: string) {
  return /^\/api\/(dur|materials)\/stock\/(receipts|issues)$/.test(url);
}
/** Retry the saved ID directly, even if another tab has already acknowledged it. */
export async function retryStockMovement(pending: PendingPartPick): Promise<Response> {
  if (!isManualStockUrl(pending.url)) throw new Error("invalid_operation_id");
  if (requireOfflineOwner() !== pending.owner) throw new Error("offline_account_mismatch");
  try {
    const response = await fetchWithDeviceTelemetry(
      "manual_stock",
      pending.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": pending.operationId,
          "X-Werkit-Offline-Owner": pending.owner,
        },
        body: pending.body,
      },
      { category: "admin" }
    );
    if (response.ok || response.status === 400)
      await acknowledgePartPick(pending.owner, pending.url, pending.operationId);
    return response;
  } finally {
    window.dispatchEvent(new Event(STOCK_PENDING_CHANGED));
  }
}
export async function sendStockMovement(url: string, body: string, owner: string | null) {
  if (!isManualStockUrl(url)) throw new Error("invalid_operation_id");
  if (!owner || requireOfflineOwner() !== owner) throw new Error("offline_account_mismatch");
  const pending = await preparePartPick(owner, url, body).catch((error: unknown) => {
    throw new Error(
      error instanceof Error && error.message === "part_pick_pending"
        ? "stock_movement_pending"
        : "part_pick_storage_failed"
    );
  });
  if (!pending) throw new Error("part_pick_storage_failed");
  window.dispatchEvent(new Event(STOCK_PENDING_CHANGED));
  return retryStockMovement(pending);
}

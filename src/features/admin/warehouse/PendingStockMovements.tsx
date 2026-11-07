"use client";
import { useCallback, useEffect, useState } from "react";
import { useDictionary } from "@/i18n";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { offlineOwner } from "@/lib/offlineOwner";
import { readPartPick, type PendingPartPick } from "@/lib/partPickStore";
import { retryStockMovement, STOCK_PENDING_CHANGED } from "@/lib/stockMovementRequest";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { isRecord } from "@/lib/narrowApiListRows";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";

type Props = {
  kind: "dur" | "materials";
  names: Map<number, { name: string }>;
  onSaved: () => void;
};
/** Review-only recovery: no automatic stock mutation and no discard of uncertain requests. */
export function PendingStockMovements({ kind, names, onSaved }: Props) {
  const dict = useDictionary();
  const wh = dict.common.warehouse;
  const { alert } = useAppDialog();
  const owner = offlineOwner();
  const [pending, setPending] = useState<PendingPartPick[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let sequence = 0;
    const refresh = async () => {
      const current = ++sequence;
      try {
        const entries = owner
          ? await Promise.all(
              ["receipts", "issues"].map((type) =>
                readPartPick(owner, `/api/${kind}/stock/${type}`)
              )
            )
          : [];
        if (!disposed && current === sequence && owner === offlineOwner()) {
          setPending(entries.filter((p): p is PendingPartPick => p !== null));
          setFailed(false);
        }
      } catch {
        if (!disposed && owner === offlineOwner()) setFailed(true);
      }
    };
    void refresh();
    window.addEventListener(STOCK_PENDING_CHANGED, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      disposed = true;
      window.removeEventListener(STOCK_PENDING_CHANGED, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [kind, owner]);
  const retry = useCallback(
    async (entry: PendingPartPick) => {
      setBusy(true);
      try {
        const response = await retryStockMovement(entry);
        const body = await parseJsonUnknown(response);
        if (!response.ok) throw new Error(readApiErrorString(body) ?? "save_error");
        if (entry.owner === offlineOwner()) {
          onSaved();
          await alert({ message: wh.movementSaveSuccess });
        }
      } catch (e) {
        await alert({
          message: appDialogApiMessage(
            dict.apiErrors,
            e instanceof Error ? e.message : undefined,
            dict.apiErrors.save_error
          ),
        });
      } finally {
        setBusy(false);
      }
    },
    [alert, dict.apiErrors, onSaved, wh.movementSaveSuccess]
  );
  return (
    <div aria-live="polite">
      {failed ? <p role="alert">{dict.apiErrors.part_pick_storage_failed}</p> : null}
      {pending
        .filter((p) => p.owner === owner)
        .map((entry) => {
          let body: Record<string, unknown> = {};
          try {
            const value: unknown = JSON.parse(entry.body);
            if (isRecord(value)) body = value;
          } catch {
            /* keep failed record */
          }
          const id = Number(body.partId ?? body.materialId);
          const fields = dict.dur.warehouse.receipts.fields;
          const issueFields = dict.dur.warehouse.issues.fields;
          const details = [
            [wh.colQuantity, body.quantity],
            [wh.colNotes, body.notes],
            [fields.unitPrice, body.unitPrice],
            [fields.invoiceNumber, body.invoiceNumber],
            [issueFields.workOrder, body.workOrderId],
            [issueFields.issuedTo, body.issuedTo],
          ];
          return (
            <section
              key={entry.operationId}
              className="mb-4 rounded-lg border border-emerald-300 p-4"
              data-testid="pending-stock-movement"
            >
              <h3 className="font-semibold">
                {wh.pendingMovementTitle}:{" "}
                {entry.url.endsWith("receipts") ? wh.tabReceipts : wh.tabIssues}
              </h3>
              <p>{wh.pendingMovementHint}</p>
              <p className="font-semibold">{names.get(id)?.name ?? `#${id}`}</p>
              <dl>
                {details
                  .filter(([, value]) => value !== null && value !== undefined && value !== "")
                  .map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="inline font-medium">{String(label)}: </dt>
                      <dd className="inline whitespace-pre-wrap">{String(value)}</dd>
                    </div>
                  ))}
              </dl>
              <button
                type="button"
                className={BTN_PRIMARY_COMPACT}
                disabled={busy}
                onClick={() => void retry(entry)}
              >
                {wh.retryMovement}
              </button>
            </section>
          );
        })}
    </div>
  );
}

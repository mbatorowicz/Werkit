"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDictionary } from "@/i18n";
import { workerApi } from "@/lib/appRoutes";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import {
  narrowBaseCategories,
  narrowBaseMachines,
  narrowDelegatableWorkers,
} from "@/lib/narrow";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function WorkerDelegateOrderModal({ open, onClose, onSuccess }: Props) {
  const dictionary = getDictionary();
  const dict = dictionary.worker.client;
  const ui = dictionary.admin.ui;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const { alert: appAlert } = useAppDialog();

  const [targets, setTargets] = useState<{ id: number; fullName: string; orgLabel: string | null }[]>(
    []
  );
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [machines, setMachines] = useState<{ id: number; name: string; categoryIds?: number[] }[]>(
    []
  );
  const [userId, setUserId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tRes, cRes, mRes] = await Promise.all([
        fetchWithDeviceTelemetry(
          "Worker: delegation targets",
          workerApi.delegationTargets,
          { cache: "no-store" },
          { category: "orders" }
        ).then(parseJsonArray),
        fetchWithDeviceTelemetry(
          "Worker: categories",
          "/api/categories?leavesOnly=1",
          { cache: "no-store" },
          { category: "orders" }
        ).then(parseJsonArray),
        fetchWithDeviceTelemetry(
          "Worker: machines",
          "/api/machines",
          { cache: "no-store" },
          { category: "orders" }
        ).then(parseJsonArray),
      ]);
      setTargets(narrowDelegatableWorkers(tRes));
      setCategories(narrowBaseCategories(cRes).map((c) => ({ id: c.id, name: c.name })));
      setMachines(narrowBaseMachines(mRes));
    } catch {
      /* sieć */
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      void loadData();
    });
  }, [open, loadData]);

  const filteredMachines = useMemo(() => {
    const catNum = parseInt(categoryId, 10);
    if (!categoryId || Number.isNaN(catNum)) return machines;
    return machines.filter((m) => m.categoryIds?.includes(catNum));
  }, [machines, categoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !categoryId || !resourceId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(workerApi.delegations, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(userId, 10),
          categoryId: parseInt(categoryId, 10),
          resourceId: parseInt(resourceId, 10),
          taskDescription: taskDescription.trim() || null,
          dueDate: dueDate || null,
        }),
      });
      if (!res.ok) {
        const body = await parseJsonUnknown(res);
        const err = readApiErrorString(body);
        await appAlert({
          message: appDialogApiMessage(apiErrors, err, apiErrors.save_error ?? "Error"),
        });
        return;
      }
      await appAlert({ message: dict.delegateOrderSuccess });
      onClose();
      onSuccess();
    } catch {
      await appAlert({
        message: appDialogApiMessage(apiErrors, undefined, apiErrors.fetch_error ?? "Error"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={dict.delegateOrderTitle}
      maxWidthClass="max-w-md"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId="worker-delegate-form"
          onCancel={onClose}
          isSubmitting={isSubmitting}
          submitLabel={dict.delegateOrderSubmit}
          cancelLabel={ui.modalCancel}
          submitDisabled={!userId || !categoryId || !resourceId || isLoading}
        />
      }
    >
      <form id="worker-delegate-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-zinc-500">{dict.loadingWorkerDashboard}</p>
        ) : (
          <>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{dict.delegateChooseWorker}</span>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className={fieldClass}
                required
              >
                <option value="">—</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                    {t.orgLabel ? ` (${t.orgLabel})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{dict.delegateChooseCategory}</span>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setResourceId("");
                }}
                className={fieldClass}
                required
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{dict.delegateChooseMachine}</span>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className={fieldClass}
                required
                disabled={!categoryId}
              >
                <option value="">—</option>
                {filteredMachines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{dict.delegateTaskDescription}</span>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{dict.delegateDueDate}</span>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={fieldClass}
              />
            </label>
          </>
        )}
      </form>
    </AdminModalShell>
  );
}

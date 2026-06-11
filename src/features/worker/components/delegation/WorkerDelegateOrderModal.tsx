"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDictionary } from "@/i18n";
import { workerApi } from "@/lib/appRoutes";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import {
  loadWorkerDelegationFormData,
  WorkerDelegateOrderFormFields,
  type DelegationCategory,
  type DelegationMachine,
  type DelegationTarget,
} from "@/features/worker/components/delegation/WorkerDelegateOrderFormFields";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function WorkerDelegateOrderModal({ open, onClose, onSuccess }: Props) {
  const dictionary = useDictionary();
  const dict = dictionary.worker.client;
  const ui = dictionary.admin.ui;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const { alert: appAlert } = useAppDialog();

  const [targets, setTargets] = useState<DelegationTarget[]>([]);
  const [categories, setCategories] = useState<DelegationCategory[]>([]);
  const [machines, setMachines] = useState<DelegationMachine[]>([]);
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
      const data = await loadWorkerDelegationFormData();
      setTargets(data.targets);
      setCategories(data.categories);
      setMachines(data.machines);
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
          <WorkerDelegateOrderFormFields
            dict={dict}
            targets={targets}
            categories={categories}
            filteredMachines={filteredMachines}
            userId={userId}
            setUserId={setUserId}
            categoryId={categoryId}
            onCategoryChange={(val) => {
              setCategoryId(val);
              setResourceId("");
            }}
            resourceId={resourceId}
            setResourceId={setResourceId}
            taskDescription={taskDescription}
            setTaskDescription={setTaskDescription}
            dueDate={dueDate}
            setDueDate={setDueDate}
          />
        )}
      </form>
    </AdminModalShell>
  );
}

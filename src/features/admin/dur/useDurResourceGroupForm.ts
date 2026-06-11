"use client";

import { useState, type FormEvent } from "react";
import { useDictionary } from "@/i18n";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { ResourceGroupOption } from "@/features/admin/dur/useResourceGroups";

interface UseDurResourceGroupFormArgs {
  fetchGroups: () => Promise<void>;
}

export function useDurResourceGroupForm({ fetchGroups }: UseDurResourceGroupFormArgs) {
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  const dictionary = useDictionary();
  const dict = dictionary.dur.resourceGroups;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setShowModal(true);
  };

  const openEdit = (g: ResourceGroupOption) => {
    setEditingId(g.id);
    setFormName(g.name);
    setFormDescription(g.description ?? "");
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      await appAlert({ message: dict.nameRequired });
      return;
    }
    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/resource-groups/${editingId}` : "/api/resource-groups";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        await appAlert({ message: apiErrors[err.error ?? ""] ?? dict.apiError });
        return;
      }
      setShowModal(false);
      await fetchGroups();
    } catch {
      await appAlert({ message: dict.apiError });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (g: ResourceGroupOption) => {
    if (!(await appConfirm({ message: dict.deleteConfirm, variant: "danger" }))) {
      return;
    }
    try {
      const res = await fetch(`/api/resource-groups/${g.id}`, { method: "DELETE" });
      if (!res.ok) {
        await appAlert({ message: dict.apiError });
        return;
      }
      await fetchGroups();
    } catch {
      await appAlert({ message: dict.apiError });
    }
  };

  return {
    showModal,
    setShowModal,
    editingId,
    formName,
    setFormName,
    formDescription,
    setFormDescription,
    isSubmitting,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  };
}

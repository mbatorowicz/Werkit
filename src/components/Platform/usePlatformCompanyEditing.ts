"use client";

import { useState } from "react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";

export function usePlatformCompanyEditing(args: {
  apiErrors: Record<string, string>;
  updateErrorLabel: string;
  updateSuccessLabel: string;
  showFeedback: (text: string, isError: boolean) => void;
  refreshOverview: () => Promise<void>;
}) {
  const { apiErrors, updateErrorLabel, updateSuccessLabel, showFeedback, refreshOverview } = args;
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editPending, setEditPending] = useState(false);

  function startEdit(row: CompanyUsageRow) {
    setEditingId(row.companyId);
    setEditName(row.companyName);
    setEditSlug(row.slug);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditSlug("");
  }

  async function saveEdit(organizationId: number) {
    setEditPending(true);
    try {
      const res = await fetch(`/api/platform/companies/${organizationId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim().toLowerCase(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        showFeedback(apiErrors[body.error ?? ""] ?? updateErrorLabel, true);
        return;
      }
      showFeedback(updateSuccessLabel, false);
      cancelEdit();
      await refreshOverview();
    } finally {
      setEditPending(false);
    }
  }

  return {
    editingId,
    editName,
    editSlug,
    editPending,
    setEditName,
    setEditSlug,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}

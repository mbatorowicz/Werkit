"use client";

import { useState } from "react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { AppDictionary } from "@/i18n/types";
import { useDictionary, formatDict } from "@/i18n";
import { PlatformCompanyForm } from "@/components/Platform/PlatformCompanyForm";
import { PlatformCompanyTable } from "@/components/Platform/PlatformCompanyTable";
import { usePlatformCompanyEditing } from "@/components/Platform/usePlatformCompanyEditing";

type Props = {
  initialOverview: CompanyUsageRow[];
  dict: AppDictionary["platform"];
};

export function PlatformDashboard({ initialOverview, dict }: Props) {
  const apiErrors = useDictionary().apiErrors as Record<string, string>;
  const [rows, setRows] = useState(initialOverview);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [messageIsError, setMessageIsError] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  /** Która organizacja ma rozwinięty panel ustawień funkcji. */
  const [settingsOpenId, setSettingsOpenId] = useState<number | null>(null);

  async function refreshOverview() {
    const res = await fetch("/api/platform/analytics", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setRows(data as CompanyUsageRow[]);
  }

  function showFeedback(text: string, isError: boolean) {
    setMessage(text);
    setMessageIsError(isError);
  }

  const {
    editingId,
    editName,
    editSlug,
    editPending,
    setEditName,
    setEditSlug,
    startEdit,
    cancelEdit,
    saveEdit,
  } = usePlatformCompanyEditing({
    apiErrors,
    updateErrorLabel: dict.updateError,
    updateSuccessLabel: dict.updateSuccess,
    showFeedback,
    refreshOverview,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setMessageIsError(false);
    try {
      const res = await fetch("/api/platform/companies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.trim() || undefined,
          adminFullName: adminName.trim() || undefined,
          adminEmail: adminEmail.trim() || undefined,
          adminPassword: adminPassword.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const code = typeof body.error === "string" ? body.error : "";
        showFeedback(apiErrors[code] ?? dict.createError, true);
        if (code === "slug_exists") await refreshOverview();
        return;
      }
      showFeedback(dict.createSuccess, false);
      setName("");
      setSlug("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      await refreshOverview();
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(organizationId: number, isActive: boolean) {
    const res = await fetch(`/api/platform/companies/${organizationId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) await refreshOverview();
  }

  function toggleSettings(companyId: number) {
    setSettingsOpenId((prev) => (prev === companyId ? null : companyId));
  }

  return (
    <div className="space-y-0">
      <header className="mb-8">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {formatDict(dict.totalCount, { count: rows.length })}
        </p>
      </header>

      <PlatformCompanyForm
        dict={dict}
        name={name}
        setName={setName}
        slug={slug}
        setSlug={setSlug}
        adminName={adminName}
        setAdminName={setAdminName}
        adminEmail={adminEmail}
        setAdminEmail={setAdminEmail}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
        pending={pending}
        message={message}
        messageIsError={messageIsError}
        onSubmit={handleCreate}
      />

      <PlatformCompanyTable
        rows={rows}
        dict={dict}
        editingId={editingId}
        editName={editName}
        editSlug={editSlug}
        editPending={editPending}
        settingsOpenId={settingsOpenId}
        onToggleActive={toggleActive}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSaveEdit={saveEdit}
        onSetEditName={setEditName}
        onSetEditSlug={setEditSlug}
        onRefresh={refreshOverview}
        onToggleSettings={toggleSettings}
      />
    </div>
  );
}

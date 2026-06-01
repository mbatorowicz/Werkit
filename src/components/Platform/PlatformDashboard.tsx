"use client";

import { useState } from "react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { AppDictionary } from "@/i18n/types";
import { getDictionary, formatDict } from "@/i18n";
import { PlatformCompanyForm } from "@/components/Platform/PlatformCompanyForm";
import { PlatformCompanyTable } from "@/components/Platform/PlatformCompanyTable";
import { FeatureFlagsSection } from "@/components/Platform/FeatureFlagsSection";

type Props = {
  initialOverview: CompanyUsageRow[];
  dict: AppDictionary["platform"];
};

export function PlatformDashboard({ initialOverview, dict }: Props) {
  const [rows, setRows] = useState(initialOverview);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [messageIsError, setMessageIsError] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editPending, setEditPending] = useState(false);

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
        const apiErrors = getDictionary().apiErrors as Record<string, string>;
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
        const apiErrors = getDictionary().apiErrors as Record<string, string>;
        showFeedback(apiErrors[body.error ?? ""] ?? dict.updateError, true);
        return;
      }
      showFeedback(dict.updateSuccess, false);
      cancelEdit();
      await refreshOverview();
    } finally {
      setEditPending(false);
    }
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

      {settingsOpenId != null && (
        <FeatureFlagsSection key={settingsOpenId} companyId={settingsOpenId} dict={dict.settings} />
      )}
    </div>
  );
}

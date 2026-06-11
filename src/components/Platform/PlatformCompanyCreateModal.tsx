"use client";

import { useState } from "react";
import type { AppDictionary } from "@/i18n/types";
import { useDictionary } from "@/i18n";
import { cn } from "@/lib/cn";
import { INPUT_BASE } from "@/lib/uiTokens";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";

const FORM_ID = "platform-create-company-form";

type Props = {
  open: boolean;
  dict: AppDictionary["platform"];
  onClose: () => void;
  /** Wywoływane po udanej rejestracji — rodzic odświeża listę i pokazuje komunikat. */
  onCreated: () => Promise<void>;
};

/** Modal rejestracji nowej organizacji (formularz + konto pierwszego admina). */
export function PlatformCompanyCreateModal({ open, dict, onClose, onCreated }: Props) {
  const apiErrors = useDictionary().apiErrors as Record<string, string>;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setSlug("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    setError(null);
  }

  function handleClose() {
    if (pending) return;
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
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
        setError(apiErrors[code] ?? dict.createError);
        return;
      }
      resetForm();
      onClose();
      await onCreated();
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminModalShell
      open={open}
      onClose={handleClose}
      title={dict.registerTitle}
      maxWidthClass="max-w-xl"
      titleSize="lg"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId={FORM_ID}
          onCancel={handleClose}
          submitLabel={dict.submitCreate}
          isSubmitting={pending}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="grid gap-5 p-6 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {dict.organizationName}
          </span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={dict.organizationNamePlaceholder}
            className={cn(INPUT_BASE, "mt-1.5")}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {dict.organizationSlug}
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={dict.organizationSlugPlaceholder}
            className={cn(INPUT_BASE, "mt-1.5 font-mono")}
          />
        </label>

        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800 md:col-span-2">
          <p className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {dict.adminSection}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{dict.adminName}</span>
              <input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className={cn(INPUT_BASE, "mt-1.5")}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{dict.adminEmail}</span>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className={cn(INPUT_BASE, "mt-1.5")}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="text-zinc-600 dark:text-zinc-400">{dict.adminPassword}</span>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className={cn(INPUT_BASE, "mt-1.5")}
              />
            </label>
          </div>
        </div>

        {error && (
          <p role="status" className="text-sm text-red-600 dark:text-red-400 md:col-span-2">
            {error}
          </p>
        )}
      </form>
    </AdminModalShell>
  );
}

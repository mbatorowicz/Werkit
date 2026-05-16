'use client';

import { Fragment, useState } from 'react';
import { Building2, Pencil } from 'lucide-react';
import type { CompanyUsageRow } from '@/services/PlatformAnalyticsService';
import type { AppDictionary } from '@/i18n/types';
import { getDictionary, formatDict } from '@/i18n';

type Props = {
  initialOverview: CompanyUsageRow[];
  dict: AppDictionary['platform'];
};

export function PlatformDashboard({ initialOverview, dict }: Props) {
  const [rows, setRows] = useState(initialOverview);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [messageIsError, setMessageIsError] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editPending, setEditPending] = useState(false);

  async function refreshOverview() {
    const res = await fetch('/api/platform/analytics', { credentials: 'include' });
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
      const res = await fetch('/api/platform/companies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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
        const code = typeof body.error === 'string' ? body.error : '';
        showFeedback(apiErrors[code] ?? dict.createError, true);
        if (code === 'slug_exists') await refreshOverview();
        return;
      }
      showFeedback(dict.createSuccess, false);
      setName('');
      setSlug('');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      await refreshOverview();
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(organizationId: number, isActive: boolean) {
    const res = await fetch(`/api/platform/companies/${organizationId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
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
    setEditName('');
    setEditSlug('');
  }

  async function saveEdit(organizationId: number) {
    setEditPending(true);
    try {
      const res = await fetch(`/api/platform/companies/${organizationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim().toLowerCase(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const apiErrors = getDictionary().apiErrors as Record<string, string>;
        showFeedback(apiErrors[body.error ?? ''] ?? dict.updateError, true);
        return;
      }
      showFeedback(dict.updateSuccess, false);
      cancelEdit();
      await refreshOverview();
    } finally {
      setEditPending(false);
    }
  }

  return (
    <div className="space-y-0">
      <header className="mb-8">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {formatDict(dict.totalCount, { count: rows.length })}
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/30">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Building2 className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{dict.registerTitle}</h2>
            </div>
          </div>
        </div>
        <form onSubmit={handleCreate} className="p-6 grid gap-5 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.organizationName}</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={dict.organizationNamePlaceholder}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.organizationSlug}</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="margaz"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>

          <div className="md:col-span-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-4">{dict.adminSection}</p>
            <PlatformAdminFields
              dict={dict}
              adminName={adminName}
              setAdminName={setAdminName}
              adminEmail={adminEmail}
              setAdminEmail={setAdminEmail}
              adminPassword={adminPassword}
              setAdminPassword={setAdminPassword}
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {dict.submitCreate}
            </button>
            {message && (
              <p
                className={`text-sm ${messageIsError ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
              >
                {message}
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{dict.registryTitle}</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{dict.usageTitle}</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">{dict.colOrganization}</th>
                <th className="px-4 py-3 font-medium">{dict.colIdentifier}</th>
                <th className="px-4 py-3 font-medium text-right">{dict.colUsers}</th>
                <th className="px-4 py-3 font-medium text-right">{dict.colWorkers}</th>
                <th className="px-4 py-3 font-medium text-right">{dict.colSessions30}</th>
                <th className="px-4 py-3 font-medium text-right">{dict.colPending}</th>
                <th className="px-4 py-3 font-medium text-right">{dict.colLogs7}</th>
                <th className="px-4 py-3 font-medium">{dict.colStatus}</th>
                <th className="px-4 py-3 font-medium">{dict.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
                    {dict.empty}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <Fragment key={r.companyId}>
                    <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                      <td className="px-4 py-3.5">
                        {editingId === r.companyId ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full min-w-[140px] rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-2 py-1 text-sm font-medium"
                          />
                        ) : (
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.companyName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {editingId === r.companyId ? (
                          <input
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            className="w-full min-w-[100px] rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-2 py-1 text-sm font-mono"
                          />
                        ) : (
                          <code className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            {r.slug}
                          </code>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{r.userCount}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{r.workerCount}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{r.sessionsLast30Days}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{r.pendingOrders}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{r.deviceLogsLast7Days}</td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleActive(r.companyId, r.isActive)}
                          title={dict.toggleActive}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            r.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {r.isActive ? dict.statusActive : dict.statusInactive}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        {editingId === r.companyId ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={editPending}
                              onClick={() => saveEdit(r.companyId)}
                              className="rounded-md bg-emerald-600 text-white px-2.5 py-1 text-xs font-medium disabled:opacity-60"
                            >
                              {dict.saveChanges}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-md border border-zinc-300 dark:border-zinc-600 px-2.5 py-1 text-xs"
                            >
                              {dict.cancelEdit}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden />
                            {dict.editOrganization}
                          </button>
                        )}
                      </td>
                    </tr>
                    {r.userCount === 0 && (
                      <tr className="bg-amber-50/50 dark:bg-amber-950/10">
                        <td colSpan={9} className="px-4 py-4">
                          <OrganizationAddAdminForm
                            organizationId={r.companyId}
                            dict={dict}
                            onDone={refreshOverview}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PlatformAdminFields({
  dict,
  adminName,
  setAdminName,
  adminEmail,
  setAdminEmail,
  adminPassword,
  setAdminPassword,
}: {
  dict: AppDictionary['platform'];
  adminName: string;
  setAdminName: (v: string) => void;
  adminEmail: string;
  setAdminEmail: (v: string) => void;
  adminPassword: string;
  setAdminPassword: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{dict.adminName}</span>
        <input
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{dict.adminEmail}</span>
        <input
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm"
        />
      </label>
      <label className="block text-sm md:col-span-2">
        <span className="text-zinc-600 dark:text-zinc-400">{dict.adminPassword}</span>
        <input
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm"
        />
      </label>
    </div>
  );
}

function OrganizationAddAdminForm({
  organizationId,
  dict,
  onDone,
}: {
  organizationId: number;
  dict: AppDictionary['platform'];
  onDone: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/platform/companies/${organizationId}/admin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, usernameEmail: email, password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const apiErrors = getDictionary().apiErrors as Record<string, string>;
        setIsError(true);
        setMsg(apiErrors[body.error ?? ''] ?? dict.createError);
        return;
      }
      setIsError(false);
      setMsg(dict.addAdminSuccess);
      await onDone();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-amber-200/80 dark:border-amber-900/40 bg-white dark:bg-zinc-900 p-4"
    >
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3">{dict.noAdminYet}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs block min-w-[140px]">
          <span className="text-zinc-500">{dict.adminName}</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs block min-w-[180px]">
          <span className="text-zinc-500">{dict.adminEmail}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs block min-w-[140px]">
          <span className="text-zinc-500">{dict.adminPassword}</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2 text-xs font-medium disabled:opacity-60"
        >
          {dict.addAdmin}
        </button>
        {msg && (
          <p className={`text-xs self-center ${isError ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>
        )}
      </div>
    </form>
  );
}

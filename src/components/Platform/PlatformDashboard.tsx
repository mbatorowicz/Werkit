'use client';

import { Fragment, useState } from 'react';
import type { CompanyUsageRow } from '@/services/PlatformAnalyticsService';
import type { AppDictionary } from '@/i18n/types';
import { getDictionary } from '@/i18n';

type Props = {
  initialOverview: CompanyUsageRow[];
  dict: AppDictionary['platform'];
};

export function PlatformDashboard({ initialOverview, dict }: Props) {
  const [rows, setRows] = useState(initialOverview);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  async function refreshOverview() {
    const res = await fetch('/api/platform/analytics', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setRows(data as CompanyUsageRow[]);
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
        setMessageIsError(true);
        setMessage(apiErrors[code] ?? dict.createError);
        if (code === 'slug_exists') await refreshOverview();
        return;
      }
      setMessage(dict.createSuccess);
      setMessageIsError(false);
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

  async function toggleActive(companyId: number, isActive: boolean) {
    const res = await fetch(`/api/platform/companies/${companyId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) await refreshOverview();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">{dict.createCompany}</h2>
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{dict.companyName}</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{dict.companySlug}</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
            />
          </label>
          <p className="md:col-span-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">{dict.adminSection}</p>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{dict.adminName}</span>
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{dict.adminEmail}</span>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-zinc-600 dark:text-zinc-400">{dict.adminPassword}</span>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
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

      <section>
        <h2 className="text-lg font-semibold mb-4">{dict.usageTitle}</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-left">
              <tr>
                <th className="px-4 py-3">{dict.colCompany}</th>
                <th className="px-4 py-3">{dict.colSlug}</th>
                <th className="px-4 py-3">{dict.colUsers}</th>
                <th className="px-4 py-3">{dict.colWorkers}</th>
                <th className="px-4 py-3">{dict.colSessions30}</th>
                <th className="px-4 py-3">{dict.colPending}</th>
                <th className="px-4 py-3">{dict.colLogs7}</th>
                <th className="px-4 py-3">{dict.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    {dict.empty}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <Fragment key={r.companyId}>
                    <tr className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-4 py-3 font-medium">{r.companyName}</td>
                      <td className="px-4 py-3 text-zinc-500">{r.slug}</td>
                      <td className="px-4 py-3">{r.userCount}</td>
                      <td className="px-4 py-3">{r.workerCount}</td>
                      <td className="px-4 py-3">{r.sessionsLast30Days}</td>
                      <td className="px-4 py-3">{r.pendingOrders}</td>
                      <td className="px-4 py-3">{r.deviceLogsLast7Days}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActive(r.companyId, r.isActive)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            r.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {r.isActive ? dict.statusActive : dict.statusInactive}
                        </button>
                      </td>
                    </tr>
                    {r.userCount === 0 && (
                      <tr className="border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50">
                        <td colSpan={8} className="px-4 py-3">
                          <CompanyAddAdminForm
                            companyId={r.companyId}
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

function CompanyAddAdminForm({
  companyId,
  dict,
  onDone,
}: {
  companyId: number;
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
      const res = await fetch(`/api/platform/companies/${companyId}/admin`, {
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
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <p className="w-full text-xs text-amber-700 dark:text-amber-400">{dict.noAdminYet}</p>
      <label className="text-xs block">
        <span className="text-zinc-500">{dict.adminName}</span>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 block rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs block">
        <span className="text-zinc-500">{dict.adminEmail}</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs block">
        <span className="text-zinc-500">{dict.adminPassword}</span>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-3 py-2 text-xs font-medium disabled:opacity-60"
      >
        {dict.addAdmin}
      </button>
      {msg && (
        <p className={`text-xs ${isError ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>
      )}
    </form>
  );
}

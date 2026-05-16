'use client';

import { useState } from 'react';
import type { CompanyUsageRow } from '@/services/PlatformAnalyticsService';
import type { AppDictionary } from '@/i18n/types';

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
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(dict.createError);
        return;
      }
      setMessage(dict.createSuccess);
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
            {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
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
                  <tr key={r.companyId} className="border-t border-zinc-200 dark:border-zinc-800">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

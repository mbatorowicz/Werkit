'use client';

import { Building2 } from 'lucide-react';
import type { AppDictionary } from '@/i18n/types';

type Props = {
  dict: AppDictionary['platform'];
  name: string;
  setName: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  adminName: string;
  setAdminName: (v: string) => void;
  adminEmail: string;
  setAdminEmail: (v: string) => void;
  adminPassword: string;
  setAdminPassword: (v: string) => void;
  pending: boolean;
  message: string | null;
  messageIsError: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function PlatformCompanyForm({
  dict,
  name,
  setName,
  slug,
  setSlug,
  adminName,
  setAdminName,
  adminEmail,
  setAdminEmail,
  adminPassword,
  setAdminPassword,
  pending,
  message,
  messageIsError,
  onSubmit,
}: Props) {
  return (
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
      <form onSubmit={onSubmit} className="p-6 grid gap-5 md:grid-cols-2">
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

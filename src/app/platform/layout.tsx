import { LogoutButton } from '@/components/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getDictionary } from '@/i18n';
import { APP_VERSION } from '@/lib/version';

export const dynamic = 'force-dynamic';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const dict = getDictionary().platform;

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <PlatformHeaderBar badge={dict.badge} title={dict.title} version={APP_VERSION} />
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}

function PlatformHeaderBar({
  badge,
  title,
  version,
}: {
  badge: string;
  title: string;
  version: string;
}) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium">
          {badge}
        </p>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-zinc-500">v{version}</p>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  );
}

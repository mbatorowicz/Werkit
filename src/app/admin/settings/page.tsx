import SettingsForm from "./SettingsForm";
import { Settings } from "lucide-react";
import { getDictionary } from "@/i18n";
import { requireServerCompanyId } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const companyId = await requireServerCompanyId();
  const { DictionaryService } = await import('@/services/DictionaryService');
  const settings = await DictionaryService.getSettings(companyId);
  const initialData = settings.length > 0 ? settings[0] : null;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2"><Settings className="w-6 h-6 text-emerald-500" /> {getDictionary().admin.sidebar.companySettings}</h1>
        <p className="text-zinc-500 mt-1">Globalne parametry wyświetlania dla aplikacji Logistycznej Werkit.</p>
      </div>

      <SettingsForm initialData={initialData} mode="company" />
    </div>
  )
}

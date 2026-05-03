import { db } from "@/db";
import { companySettings } from "@/db/schema";
import SettingsForm from "./SettingsForm";
import { Settings } from "lucide-react";
import { getDictionary } from "@/i18n";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await db.select().from(companySettings).limit(1);
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

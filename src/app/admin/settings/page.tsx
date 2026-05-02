import { db } from "@/db";
import { companySettings } from "@/db/schema";
import SettingsForm from "./SettingsForm";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await db.select().from(companySettings).limit(1);
  const initialData = settings.length > 0 ? settings[0] : null;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Ustawienia Firmy i Lokalizacji</h1>
        <p className="text-zinc-500 mt-1">Globalne parametry wyświetlania dla aplikacji Logistycznej Werkit.</p>
      </div>

      <SettingsForm initialData={initialData} />
    </div>
  )
}

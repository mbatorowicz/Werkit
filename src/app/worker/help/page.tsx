import { PhoneCall, AlertTriangle, Info, BookOpen, MapPin, Camera, Clock, Navigation, Play } from "lucide-react";
import { HelpAccordion } from "@/components/HelpAccordion";
import { getDictionary } from "@/i18n";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  const dict = getDictionary().worker.help;
  let phone = "112";

  try {
    const settingsData = await db.select().from(companySettings).where(eq(companySettings.id, 1)).limit(1);
    if (settingsData.length > 0 && settingsData[0].phone) {
      phone = settingsData[0].phone;
    }
  } catch (e) {
    console.error("Failed to load settings in HelpPage:", e);
  }

  return (
    <div className="py-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8 flex items-center gap-2">
        <BookOpen className="w-7 h-7 text-blue-500" />
        {dict.title}
      </h1>
      
      <div className="space-y-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">{dict.quickContact}</h2>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-4">
            {dict.contactDesc}
          </p>
          <div className="mb-4 text-center">
            <span className="text-2xl font-black text-zinc-800 dark:text-white tracking-wide">{phone}</span>
          </div>
          <a href={`tel:${phone}`} className="w-full bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 flex items-center justify-center gap-3 transition-colors font-medium">
            <PhoneCall className="w-5 h-5" />
            {dict.callDispatcher}
          </a>
        </div>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">{dict.userManual}</h2>
      
      <div className="space-y-3">
        <HelpAccordion title={dict.startWork} icon={<Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
          <p className="mb-2">
            {dict.startWorkDesc1}<strong>Sesja</strong>{dict.startWorkDesc2}
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>{dict.redColor}</strong> {dict.redColorDesc}</li>
            <li><strong>{dict.pinkColor}</strong> {dict.pinkColorDesc}</li>
            <li><strong>{dict.priorities}</strong> {dict.prioritiesDesc}</li>
          </ul>
          <p className="mt-3">
            {dict.startWorkInstruction}<strong>ROZPOCZNIJ ZADANIE</strong>{dict.startWorkInstruction2}
          </p>
        </HelpAccordion>

        <HelpAccordion title={dict.notesAndPhotos} icon={<Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
          <p className="mb-2">
            {dict.notesAndPhotosDesc}
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>{dict.addNote}</strong> {dict.addNoteDesc}
            </li>
            <li>
              <strong>{dict.takePhoto}</strong> {dict.takePhotoDesc}
            </li>
          </ul>
          <p className="mt-3 text-amber-600 dark:text-amber-500 font-medium">
            {dict.photoWarning}
          </p>
        </HelpAccordion>

        <HelpAccordion title={dict.gpsTracking} icon={<Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
          <p className="mb-2">
            {dict.gpsTrackingDesc}
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>{dict.gpsWait}</strong> {dict.gpsWaitDesc}</li>
            <li><strong>{dict.gpsActive}</strong> {dict.gpsActiveDesc}</li>
          </ul>
          <p className="mt-3">
            {dict.gpsPrivacy}<strong>{dict.gpsPrivacy2}</strong>{dict.gpsPrivacy3}
          </p>
        </HelpAccordion>

        <HelpAccordion title={dict.customOrders} icon={<Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}>
          <p>
            {dict.customOrdersDesc1}<strong>{dict.customOrdersDesc2}</strong>. 
          </p>
          <p className="mt-2">
            {dict.customOrdersDesc3}
          </p>
        </HelpAccordion>
      </div>

      <div className="mt-8 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {dict.emergency}
        </h2>
        <p className="text-xs text-orange-800 dark:text-orange-300">
          {dict.emergencyDesc}
        </p>
      </div>
    </div>
  );
}

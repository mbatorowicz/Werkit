"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsMap from "@/components/Map/SettingsMap";
import { getDictionary } from "@/i18n";

export default function SettingsForm({ initialData, mode = 'all' }: { initialData: any, mode?: 'all' | 'company' | 'orders' }) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.companyName || "Werkit ERP");
  const [address, setAddress] = useState(initialData?.companyAddress || "");
  const [zipCode, setZipCode] = useState(initialData?.zipCode || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [email, setEmail] = useState(initialData?.email || "");

  const [lat, setLat] = useState<number>(parseFloat(initialData?.baseLatitude || "52.401"));
  const [lng, setLng] = useState<number>(parseFloat(initialData?.baseLongitude || "22.015"));
  const [cancelWindowMinutes, setCancelWindowMinutes] = useState<number>(initialData?.cancelWindowMinutes ?? 5);
  const [requirePhotoToFinish, setRequirePhotoToFinish] = useState<boolean>(initialData?.requirePhotoToFinish ?? false);
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState<number>(initialData?.geofenceRadiusMeters ?? 500);
  const [timeOverrunReminder, setTimeOverrunReminder] = useState<boolean>(initialData?.timeOverrunReminder ?? true);
  const [upcomingOrderReminderMinutes, setUpcomingOrderReminderMinutes] = useState<number>(initialData?.upcomingOrderReminderMinutes ?? 120);

  const [isSearching, setIsSearching] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"IDLE"|"SAVING"|"SAVED">("IDLE");

  const searchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = `${address} ${city}`.trim();
    if (!query) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
      } else {
        alert("Nie wyliczono GPS na podstawie adresu i miasta.");
      }
    } catch(e) {
      alert("Błąd podczas wyszukiwania GPS z map open-source.");
    }
    setIsSearching(false);
  };

  const handleSave = async () => {
    setSaveStatus("SAVING");
    try {
       const res = await fetch('/api/settings', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           companyName: name, 
           companyAddress: address, 
           zipCode, 
           city, 
           phone, 
           email, 
           baseLatitude: lat.toString(), 
           baseLongitude: lng.toString(),
           cancelWindowMinutes,
           requirePhotoToFinish,
           geofenceRadiusMeters,
           timeOverrunReminder,
           upcomingOrderReminderMinutes
         })
       });
       if(res.ok) {
          setSaveStatus("SAVED");
          router.refresh(); // Tells Next.js to reload DB variables on SSR Layouts and Dashboard
          setTimeout(() => setSaveStatus("IDLE"), 2000);
       } else {
          setSaveStatus("IDLE");
          alert("Błąd zapisu.");
       }
    } catch(err) {
       setSaveStatus("IDLE");
    }
  };

  const dict = getDictionary().admin.settings;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950/50">
        <h2 className="font-semibold text-zinc-900 dark:text-white">
          {mode === 'orders' ? dict.orderSettings : dict.companyData}
        </h2>
      </div>
      
      <div className="p-6 md:p-8 space-y-8">
        {(mode === 'all' || mode === 'company') && (
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-4">
               <div>
                 <h3 className="font-medium text-zinc-900 dark:text-zinc-200 mb-1">{dict.generalInfo}</h3>
                 <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{dict.generalDesc}</p>
               </div>
               
               <div className="space-y-2">
                 <label className="text-sm font-medium text-zinc-400">{dict.legalNameLabel}</label>
                 <input type="text" placeholder={dict.legalNamePlaceholder} value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
               </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">{dict.addressLabel}</label>
                    <input type="text" placeholder={dict.addressPlaceholder} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">{dict.zipCodeLabel}</label>
                      <input type="text" placeholder={dict.zipCodePlaceholder} value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">{dict.cityLabel}</label>
                      <input type="text" placeholder={dict.cityPlaceholder} value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">{dict.phoneLabel}</label>
                    <input type="text" placeholder={dict.phonePlaceholder} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">{dict.emailLabel}</label>
                    <input type="text" placeholder={dict.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                  </div>
               </div>
            </div>
          </div>
        )}

        {(mode === 'all' || mode === 'orders') && (
           <div className={`space-y-6 max-w-3xl ${mode === 'all' ? 'pt-8 border-t border-zinc-200 dark:border-zinc-800' : ''}`}>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-200 mb-1">{dict.orderSettingsUX}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{dict.orderSettingsDesc}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">{dict.cancelWindowLabel}</label>
                   <input type="number" min="0" value={cancelWindowMinutes} onChange={(e) => setCancelWindowMinutes(parseInt(e.target.value))} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">{dict.geofenceLabel}</label>
                   <input type="number" step="100" min="0" value={geofenceRadiusMeters} onChange={(e) => setGeofenceRadiusMeters(parseInt(e.target.value))} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">{dict.reminderLabel}</label>
                   <input type="number" step="15" min="0" value={upcomingOrderReminderMinutes} onChange={(e) => setUpcomingOrderReminderMinutes(parseInt(e.target.value))} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                 </div>
              </div>

              <div className="space-y-4 pt-4">
                 <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                   <input type="checkbox" checked={requirePhotoToFinish} onChange={(e) => setRequirePhotoToFinish(e.target.checked)} className="w-5 h-5 text-emerald-500" />
                   <div className="flex flex-col">
                     <span className="text-sm font-medium text-zinc-900 dark:text-white">{dict.requirePhoto}</span>
                     <span className="text-xs text-zinc-500">{dict.requirePhotoDesc}</span>
                   </div>
                 </label>

                 <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                   <input type="checkbox" checked={timeOverrunReminder} onChange={(e) => setTimeOverrunReminder(e.target.checked)} className="w-5 h-5 text-emerald-500" />
                   <div className="flex flex-col">
                     <span className="text-sm font-medium text-zinc-900 dark:text-white">{dict.timeOverrun}</span>
                     <span className="text-xs text-zinc-500">{dict.timeOverrunDesc}</span>
                   </div>
                 </label>
              </div>
           </div>
        )}

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-700 flex justify-end items-center gap-4">
            {saveStatus === "SAVED" && <span className="text-emerald-500 text-sm font-medium">{dict.savedSuccess}</span>}
            <button onClick={handleSave} disabled={saveStatus === "SAVING"} className="bg-amber-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-amber-500 transition shadow-sm active:scale-95">
               {saveStatus === "SAVING" ? dict.saving : dict.saveBtn}
            </button>
          </div>
      </div>
    </div>
  )
}





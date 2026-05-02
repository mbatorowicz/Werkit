"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsMap from "@/components/Map/SettingsMap";

export default function SettingsForm({ initialData }: { initialData: any }) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.companyName || "Werkit ERP");
  const [address, setAddress] = useState(initialData?.companyAddress || "");
  const [zipCode, setZipCode] = useState(initialData?.zipCode || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [email, setEmail] = useState(initialData?.email || "");

  const [lat, setLat] = useState<number>(parseFloat(initialData?.baseLatitude || "52.401"));
  const [lng, setLng] = useState<number>(parseFloat(initialData?.baseLongitude || "22.015"));
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
           baseLongitude: lng.toString() 
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

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-950/50">
        <h2 className="font-semibold text-white">Dane Ustrukturyzowane Firmy</h2>
      </div>
      
      <div className="p-6 md:p-8 space-y-8">
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-4">
               <div>
                 <h3 className="font-medium text-zinc-200 mb-1">Informacje Ogólne</h3>
                 <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Wypełnij w całości, by widlasty system odnosił się poprawnie (SSOT) do twojej Działalności Logistycznej na każdym ekranie.</p>
               </div>
               
               <div className="space-y-2">
                 <label className="text-sm font-medium text-zinc-400">Prawna nazwa firmy</label>
                 <input type="text" placeholder="Jan-Met Konstrukcje" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Ulica, numer i lokal</label>
                    <input type="text" placeholder="Przemysłowa 12" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Kod pocztowy</label>
                      <input type="text" placeholder="00-000" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Miasto</label>
                      <input type="text" placeholder="Węgrów" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Numer kontaktowy telefonu</label>
                    <input type="text" placeholder="+48 ..." value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Adres Email (Korespondencja)</label>
                    <input type="text" placeholder="biuro@firma.pl" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white outline-none" />
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-zinc-800/50">
            <div className="space-y-6">
                <div>
                   <h3 className="font-medium text-zinc-200 mb-1">Miejsce stacjonowania / Siedziba GPS</h3>
                   <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Określ z jakiego punktu nawigowane będą wszystkie działania logistyczne i pulpit. Jeśli wpisałeś adres fizyczny powyżej - wciśnij Autonamierz.</p>
                </div>

                <div className="space-y-2">
                  <button onClick={searchAddress} disabled={isSearching} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-900 dark:text-white font-medium px-5 py-2.5 rounded-lg transition whitespace-nowrap w-full md:w-auto shadow-sm">
                    {isSearching ? "Pobieram z Satelity OSM..." : "Autonamierz na podst. adresu"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-500">Geodługość (X)</label>
                        <input type="text" value={lng.toFixed(5)} disabled className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-zinc-500 dark:text-zinc-400 outline-none text-sm cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-500">Geoszerokość (Y)</label>
                        <input type="text" value={lat.toFixed(5)} disabled className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 text-zinc-500 dark:text-zinc-400 outline-none text-sm cursor-not-allowed" />
                    </div>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                   * Celownik z GPS po prawej stronie jest od teraz używa map jasnych. Ręczne przesuwanie natychmiast modyfikuje koordynaty.
                </div>
            </div>

            <div className="h-[350px] w-full bg-[#f2fbfa] dark:bg-zinc-900 rounded-lg border border-zinc-700/50 overflow-hidden relative shadow-inner">
               <SettingsMap lat={lat} lng={lng} onLocationChange={(newLat: number, newLng: number) => { setLat(newLat); setLng(newLng); }} />
               <div className="absolute top-3 left-3 bg-white/90 backdrop-blur shadow text-xs font-bold px-3 py-1.5 rounded-full text-zinc-800 pointer-events-none z-[1000]">
                 Celownik Bazy Głównej
               </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-700 flex justify-end items-center gap-4">
            {saveStatus === "SAVED" && <span className="text-emerald-500 text-sm font-medium">SSOT zaktualizowane pomyślnie! ✔</span>}
            <button onClick={handleSave} disabled={saveStatus === "SAVING"} className="bg-amber-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-amber-500 transition shadow-sm active:scale-95">
               {saveStatus === "SAVING" ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
      </div>
    </div>
  )
}



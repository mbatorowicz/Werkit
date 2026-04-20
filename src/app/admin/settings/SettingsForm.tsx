"use client";

import { useState } from "react";
import SettingsMap from "@/components/Map/SettingsMap";

export default function SettingsForm({ initialData }: { initialData: any }) {
  const [name, setName] = useState(initialData?.companyName || "Margaz Węgrów");
  const [address, setAddress] = useState(initialData?.companyAddress || "");
  const [lat, setLat] = useState<number>(parseFloat(initialData?.baseLatitude || "52.401"));
  const [lng, setLng] = useState<number>(parseFloat(initialData?.baseLongitude || "22.015"));
  const [isSearching, setIsSearching] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"IDLE"|"SAVING"|"SAVED">("IDLE");

  const searchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
      } else {
        alert("Nie znaleziono adresu. Upewnij się, że zawiera on poprawne miasto.");
      }
    } catch(e) {
      console.error(e);
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
         body: JSON.stringify({ companyName: name, companyAddress: address, baseLatitude: lat.toString(), baseLongitude: lng.toString() })
       });
       if(res.ok) {
          setSaveStatus("SAVED");
          setTimeout(() => setSaveStatus("IDLE"), 3000);
       } else {
          setSaveStatus("IDLE");
          alert("Błąd zapisu.");
       }
    } catch(err) {
       setSaveStatus("IDLE");
       alert("Błąd sieci podczas zapisu bazy danych.");
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
        <h2 className="font-semibold text-white">Dane Ustrukturyzowane</h2>
      </div>
      
      <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-2 max-w-xl">
            <label className="text-sm font-medium text-zinc-400">Prawna (lub skrócona) nazwa firmy</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-zinc-800/50">
            <div className="space-y-6">
                <div>
                   <h3 className="font-medium text-zinc-200 mb-1">Pozycjonowanie Bazy / Przestrzeń Robocza</h3>
                   <p className="text-sm text-zinc-500 mb-4">Ustaw miejsce, z którego floty i maszyny wyprowadzane są rano. Podaj adres, aby automatycznie odszukać, lub nakieruj precyzyjnie celownikiem klikając w podgląd mapy.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Adres Siedziby / Wyszukiwarka Miejsca</label>
                  <form onSubmit={searchAddress} className="flex gap-3">
                    <input type="text" placeholder="Węgrów, Piłsudskiego 1" value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                    <button disabled={isSearching} type="submit" className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-4 py-2.5 rounded-lg transition whitespace-nowrap">
                      {isSearching ? "Pobieram..." : "Rozszyfruj Adres"}
                    </button>
                  </form>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-500">Geodługość (X)</label>
                        <input type="text" value={lng.toFixed(5)} disabled className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-500 outline-none text-sm cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-500">Geoszerokość (Y)</label>
                        <input type="text" value={lat.toFixed(5)} disabled className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-zinc-500 outline-none text-sm cursor-not-allowed" />
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full bg-zinc-950 rounded-2xl border border-zinc-700/50 overflow-hidden relative shadow-inner">
               <SettingsMap lat={lat} lng={lng} onLocationChange={(newLat: number, newLng: number) => { setLat(newLat); setLng(newLng); }} />
               <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-xs px-2 py-1 rounded text-zinc-300 pointer-events-none z-[1000]">
                 ⚲ Celownik (Kliknij, aby ustawić Pin)
               </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-zinc-800 flex justify-end items-center gap-4">
            {saveStatus === "SAVED" && <span className="text-emerald-500 text-sm font-medium">Zapisano produkcyjnie! ✔</span>}
            <button onClick={handleSave} disabled={saveStatus === "SAVING"} className="bg-white text-zinc-950 font-bold px-8 py-3 rounded-xl hover:bg-zinc-200 transition shadow-sm active:scale-95">
               {saveStatus === "SAVING" ? "Wgrywanie konfiguracji..." : "Zapisz i nałóż Opcje"}
            </button>
          </div>
      </div>
    </div>
  )
}

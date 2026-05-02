"use client";

import { useState, useEffect } from "react";
import { Trash2, Wrench, Plus, X, Truck, Edit2, Layers } from "lucide-react";

type Category = { id: number, name: string };
type Machine = { id: number, name: string, categoryId: number, categoryName?: string };

export default function MachinesClient() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for Machine Modal
  const [isMMOpen, setIsMMOpen] = useState(false); // Machine Modal
  const [mEditId, setMEditId] = useState<number | null>(null);
  const [mForm, setMForm] = useState({ name: '', categoryId: '' });

  // States for Category Modal
  const [isCMOpen, setIsCMOpen] = useState(false); // Category Modal
  const [cEditId, setCEditId] = useState<number | null>(null);
  const [cForm, setCForm] = useState({ name: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mData, cData] = await Promise.all([
        fetch("/api/machines", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/categories", { cache: "no-store" }).then(r => r.json())
      ]);
      setMachines(Array.isArray(mData) ? mData : []);
      setCategories(Array.isArray(cData) ? cData : []);
      if (!Array.isArray(mData) || !Array.isArray(cData)) {
         console.error("API Error details:", {mData, cData});
         alert("Przechwycono błąd bazy danych w Vercel. Odśwież stronę po sekundzie.");
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData() }, []);

  // --- Kategorie ----
  const handleCSave = async (e: React.FormEvent) => {
     e.preventDefault();
     const url = cEditId ? `/api/categories/${cEditId}` : "/api/categories";
     const method = cEditId ? "PUT" : "POST";
     try {
       const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(cForm) });
       if(res.ok) { setIsCMOpen(false); fetchData(); }
       else { alert((await res.json()).error); }
     } catch(e) { alert("Błąd API."); }
  };
  const handleCDelete = async (id: number) => {
     if(!confirm("Usunięcie trwale usunie też możliwość przypisywania maszyn do tej grupy. Jesteś pewien?")) return;
     const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
     if(res.ok) fetchData();
     else alert((await res.json()).error);
  };

  // --- Maszyny ---
  const handleMSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = mEditId ? `/api/machines/${mEditId}` : "/api/machines";
    const method = mEditId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(mForm) });
      if(res.ok) { setIsMMOpen(false); fetchData(); }
      else { alert((await res.json()).error); }
    } catch(e) { alert("Błąd API."); }
  };
  const handleMDelete = async (id: number) => {
     if(!confirm("Maszyna zniknie z puli systemu. Jesteś pewien?")) return;
     const res = await fetch(`/api/machines/${id}`, { method: 'DELETE' });
     if(res.ok) fetchData();
     else alert((await res.json()).error);
  };

  return (
    <>
      {/* SEKCJA KATEGORII SŁOWNIKOWYCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 pt-2"><Layers className="w-5 h-5 text-amber-500"/> Słownik Typów (Kategorie Sprzętu)</h2>
          <p className="text-zinc-500 mt-1 text-sm">Zarządzaj słownikiem dostępnych klasyfikacji dla rejestrowanych pojazdów.</p>
        </div>
        <button onClick={() => {setCEditId(null); setCForm({name: ''}); setIsCMOpen(true);}} className="bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-700 transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> Dodaj Kategorię
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
         {categories.map(cat => (
           <div key={cat.id} className="bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 rounded-lg flex justify-between items-center group shadow-sm hover:border-zinc-700 transition-colors">
              <span className="text-zinc-200 font-medium truncate">{cat.name}</span>
              <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                 <button onClick={() => {setCEditId(cat.id); setCForm({name: cat.name}); setIsCMOpen(true);}} className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-amber-500 rounded-md transition"><Edit2 className="w-3.5 h-3.5"/></button>
                 <button onClick={() => handleCDelete(cat.id)} className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-red-500 rounded-md transition"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
           </div>
         ))}
         {!isLoading && categories.length === 0 && <div className="col-span-full p-4 border border-zinc-200 dark:border-zinc-700/50 rounded-lg bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-sm">Zdefiniuj z jakich rodzajów aut korzystasz (np. Ciężarówki / Koparki) dodając pierwszą kategorię słownikową.</div>}
      </div>


      {/* SEKCJA ZASOBÓW FIZYCZNYCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-t border-zinc-800/80 pt-10">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Park Maszynowy i Sprzęt</h1>
          <p className="text-zinc-500 mt-1">Ewidencjonuj pojazdy na podstawie ustawionych u góry kategorii.</p>
        </div>
        <button onClick={() => {setMEditId(null); setMForm({name: '', categoryId: ''}); setIsMMOpen(true);}} className="bg-amber-600 text-white px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-amber-500 transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Zarejestruj Nowy Pojazd
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
               <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-[#0a0a0b]/80">
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pojazd / Rejestracja</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Kategoria Słownikowa</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Zarządzanie</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
               {isLoading ? (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Konfiguracja baz...</td></tr>
               ) : machines.map(machine => (
                 <tr key={machine.id} className="hover:bg-zinc-800/20 transition-colors">
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-lg bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400">
                           <Truck className="w-5 h-5" />
                         </div>
                         <div>
                           <div className="font-semibold text-zinc-200">{machine.name}</div>
                           <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">ID REJ: #{machine.id}</div>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                     {machine.categoryName ? (
                       <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider">
                         {machine.categoryName}
                       </span>
                     ) : (
                       <span className="text-zinc-500 italic text-xs">Brak Kaskady/Kategorii</span>
                     )}
                   </td>
                   <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-1">
                        <button onClick={() => {setMEditId(machine.id); setMForm({name: machine.name, categoryId: machine.categoryId?.toString()}); setIsMMOpen(true);}} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition" title="Edytuj">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleMDelete(machine.id)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Skasuj całkowicie">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </td>
                 </tr>
               ))}
               {!isLoading && machines.length === 0 && (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Brak załadowanych pojazdów fizycznych do floty.</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {/* MODAL KATEGORII */}
      {isCMOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCMOpen(false)}></div>
           <div className="bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-sm rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-[#0a0a0b]/80">
                 <h2 className="text-base font-semibold text-white">{cEditId ? 'Edycja Nagłówka' : 'Nowa Kategoria Bazy'}</h2>
                 <button onClick={() => setIsCMOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>
              </div>
              <form onSubmit={handleCSave} className="p-6">
                 <input required type="text" placeholder="Np. Sprzęt Ciężki / Naczepy" value={cForm.name} onChange={e => setCForm({name: e.target.value})} className="w-full mb-4 bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                 <button type="submit" className="w-full bg-zinc-100 text-zinc-50 dark:text-zinc-950 font-semibold py-2.5 rounded-lg hover:bg-zinc-300 transition">Zapisz Słownik</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL MASZYNY */}
      {isMMOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMMOpen(false)}></div>
           <div className="bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-[#0a0a0b]/80">
                 <h2 className="text-lg font-semibold text-white">{mEditId ? "Karta Edycji Pojazdu" : "Rejestracja Nowego Sprzętu"}</h2>
                 <button onClick={() => setIsMMOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleMSave} className="p-6 space-y-6">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">Identyfikator (Marka, Model lub Nr. Rej.)</label>
                   <input required type="text" placeholder="Np. Wywrotka SCANIA WGR 8092" value={mForm.name} onChange={e => setMForm({...mForm, name: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-amber-500/80">Kategoria Słownikowa (Globalna)</label>
                   <select required value={mForm.categoryId} onChange={e => setMForm({...mForm, categoryId: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="" disabled>-- Wybierz kategorię docelową --</option>
                     {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   {categories.length === 0 && <p className="text-xs text-red-400">UWAGA: Wpierw stwórz Kategorię zamykając to okno, aby móc tu przypisać auto!</p>}
                 </div>
                 <div className="pt-4 border-t border-zinc-800">
                    <button disabled={categories.length === 0} type="submit" className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg hover:bg-amber-500 transition active:scale-[0.98] shadow-sm disabled:opacity-50">
                       Zapisz zmiany we Flocie
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  )
}

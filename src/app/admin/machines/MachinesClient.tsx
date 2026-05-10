"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Trash2, Wrench, Plus, X, Truck, Edit2, Layers } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";

type Category = { id: number, name: string, icon?: string, reqCustomer: boolean, reqMaterial: boolean, reqQuantity: boolean, reqTaskDescription: boolean, isGlobal: boolean, color?: string };
type Machine = { id: number, name: string, categoryIds: number[], imageUrl?: string | null };

export default function MachinesClient() {
  const { canMutate } = useAdminAbility();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for Machine Modal
  const [isMMOpen, setIsMMOpen] = useState(false); // Machine Modal
  const [mEditId, setMEditId] = useState<number | null>(null);
  const [mForm, setMForm] = useState({ name: '', categoryIds: [] as number[], imageUrl: null as string | null });

  // States for Category Modal
  const [isCMOpen, setIsCMOpen] = useState(false); // Category Modal
  const [cEditId, setCEditId] = useState<number | null>(null);
  const [cForm, setCForm] = useState({ name: '', icon: 'blue', reqCustomer: false, reqMaterial: false, reqQuantity: false, reqTaskDescription: true, isGlobal: false, color: '#3f3f46' });
  const dictionary = getDictionary();
  const dict = dictionary.admin.machines;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const fetchData = useCallback(async () => {
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
         alert(dict.dbError);
      }
    } catch {
      /* sieć */
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dict.dbError z i18n; pełny `dict` zmieniałby referencję co render
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
    });
  }, [fetchData]);

  // --- Kategorie ----
  const handleCSave = async (e: React.FormEvent) => {
     e.preventDefault();
     const url = cEditId ? `/api/categories/${cEditId}` : "/api/categories";
     const method = cEditId ? "PUT" : "POST";
     try {
       const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(cForm) });
       if(res.ok) { setIsCMOpen(false); fetchData(); }
       else { const err = (await res.json()).error; alert(apiErrors[err] || err); }
     } catch {
       alert(dict.apiError);
     }
  };
  const handleCDelete = async (id: number) => {
     if(!confirm(dict.confirmCatDelete)) return;
     const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
     if(res.ok) fetchData();
     else { const err = (await res.json()).error; alert(apiErrors[err] || err); }
  };

  // --- Maszyny ---
  const handleMSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = mEditId ? `/api/machines/${mEditId}` : "/api/machines";
    const method = mEditId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(mForm) });
      if(res.ok) { setIsMMOpen(false); fetchData(); }
      else { const err = (await res.json()).error; alert(apiErrors[err] || err); }
     } catch {
       alert(dict.apiError);
     }
  };
  const handleMDelete = async (id: number) => {
     if(!confirm(dict.confirmMachDelete)) return;
     const res = await fetch(`/api/machines/${id}`, { method: 'DELETE' });
     if(res.ok) fetchData();
     else { const err = (await res.json()).error; alert(apiErrors[err] || err); }
  };

  return (
    <>
      {/* SEKCJA KATEGORII SŁOWNIKOWYCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 pt-2"><Layers className="w-5 h-5 text-amber-500"/> {dict.dictTitle}</h2>
          <p className="text-zinc-500 mt-1 text-sm">{dict.dictSubtitle}</p>
        </div>
        {canMutate && (
        <button onClick={() => {setCEditId(null); setCForm({name: '', icon: 'blue', reqCustomer: false, reqMaterial: false, reqQuantity: false, reqTaskDescription: true, isGlobal: false, color: '#3f3f46'}); setIsCMOpen(true);}} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> {dict.addCategory}
        </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
         {categories.map(cat => {
           return (
             <div key={cat.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 rounded-lg flex justify-between items-center group shadow-sm hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-3 truncate">
                  <div className={`w-5 h-5 rounded-md shadow-sm shrink-0`} style={{ backgroundColor: cat.color || '#3f3f46' }} />
                  <span className="text-zinc-900 dark:text-zinc-200 font-medium truncate">{cat.name}</span>
                </div>
                {canMutate && (
                <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                   <button onClick={() => {setCEditId(cat.id); setCForm({name: cat.name, icon: cat.icon || 'blue', reqCustomer: cat.reqCustomer, reqMaterial: cat.reqMaterial, reqQuantity: cat.reqQuantity, reqTaskDescription: cat.reqTaskDescription, isGlobal: cat.isGlobal, color: cat.color || '#3f3f46'}); setIsCMOpen(true);}} className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-amber-500 rounded-md transition"><Edit2 className="w-3.5 h-3.5"/></button>
                   <button onClick={() => handleCDelete(cat.id)} className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-red-500 rounded-md transition"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
                )}
             </div>
           );
         })}
         {!isLoading && categories.length === 0 && <div className="col-span-full p-4 border border-zinc-200 dark:border-zinc-700/50 rounded-lg bg-white dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-sm">{dict.noCategories}</div>}
      </div>


      {/* SEKCJA ZASOBÓW FIZYCZNYCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-t border-zinc-800/80 pt-10">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2"><Wrench className="w-6 h-6 text-emerald-500" /> {dict.fleetTitle}</h1>
          <p className="text-zinc-500 mt-1">{dict.fleetSubtitle}</p>
        </div>
        {canMutate && (
        <button onClick={() => {setMEditId(null); setMForm({name: '', categoryIds: [], imageUrl: null}); setIsMMOpen(true);}} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {dict.registerVehicle}
        </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
               <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.vehicleReg}</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.dictCategory}</th>
                 {canMutate && (
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">{dict.management}</th>
                 )}
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
                 {isLoading ? (
                 <tr><td colSpan={canMutate ? 3 : 2} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">{dict.fetching}</td></tr>
               ) : machines.map(machine => {
                 const mCats = categories.filter(c => machine.categoryIds?.includes(c.id));
                 return (
                 <tr key={machine.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className={`w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden`}>
                           {machine.imageUrl ? (
                             <Image src={machine.imageUrl} alt={machine.name} width={48} height={48} unoptimized className="w-full h-full object-cover" />
                           ) : (
                             <Truck className="w-5 h-5 text-zinc-400" />
                           )}
                         </div>
                         <div>
                           <div className="font-semibold text-zinc-900 dark:text-zinc-200">{machine.name}</div>
                           <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">{dict.idReg} #{machine.id}</div>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1">
                       {mCats.length > 0 ? mCats.map(c => (
                         <span key={c.id} className="border px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider" style={{ backgroundColor: `${c.color || '#71717a'}1a`, color: c.color || '#71717a', borderColor: `${c.color || '#71717a'}33` }}>
                           {c.name}
                         </span>
                       )) : (
                         <span className="text-zinc-500 italic text-xs">{dict.noCategoryBadge}</span>
                       )}
                     </div>
                   </td>
                   {canMutate && (
                   <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-1">
                        <button onClick={() => {setMEditId(machine.id); setMForm({name: machine.name, categoryIds: machine.categoryIds || [], imageUrl: machine.imageUrl || null}); setIsMMOpen(true);}} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition" title={dict.editTitle}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleMDelete(machine.id)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title={dict.deleteTitle}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </td>
                   )}
                 </tr>
               )})}
               {!isLoading && machines.length === 0 && (
                 <tr><td colSpan={canMutate ? 3 : 2} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">{dict.noMachines}</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {/* MODAL KATEGORII */}
      {isCMOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCMOpen(false)}></div>
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-sm rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{cEditId ? dict.modalCatEditTitle : dict.modalCatCreateTitle}</h2>
                 <button onClick={() => setIsCMOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-4 h-4"/></button>
              </div>
              <form onSubmit={handleCSave} className="p-6 space-y-4">
                 <input required type="text" placeholder={dict.catPlaceholder} value={cForm.name} onChange={e => setCForm({...cForm, name: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                 <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{dict.catColorLabel}</label>
                   <div className="flex items-center gap-3">
                     <input type="color" value={cForm.color} onChange={e => setCForm({...cForm, color: e.target.value})} className="w-10 h-10 rounded border-0 p-0 cursor-pointer" />
                     <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{dict.catColorHint}</span>
                   </div>
                 </div>
                 
                 <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Parametry Zlecenia dla tej Klasy</h3>
                    <div className="flex items-center justify-between">
                       <label className="text-sm text-zinc-700 dark:text-zinc-300">Wymaga podania klienta</label>
                       <input type="checkbox" checked={cForm.reqCustomer} onChange={e => setCForm({...cForm, reqCustomer: e.target.checked})} className="w-4 h-4 rounded text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between">
                       <label className="text-sm text-zinc-700 dark:text-zinc-300">Wymaga podania materiału/kruszywa</label>
                       <input type="checkbox" checked={cForm.reqMaterial} onChange={e => setCForm({...cForm, reqMaterial: e.target.checked})} className="w-4 h-4 rounded text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between">
                       <label className="text-sm text-zinc-700 dark:text-zinc-300">Wymaga podania ilości w tonach</label>
                       <input type="checkbox" checked={cForm.reqQuantity} onChange={e => setCForm({...cForm, reqQuantity: e.target.checked})} className="w-4 h-4 rounded text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between">
                       <label className="text-sm text-zinc-700 dark:text-zinc-300">Wymaga opisu zadania</label>
                       <input type="checkbox" checked={cForm.reqTaskDescription} onChange={e => setCForm({...cForm, reqTaskDescription: e.target.checked})} className="w-4 h-4 rounded text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                       <div className="flex flex-col">
                         <label className="text-sm text-zinc-700 dark:text-zinc-300 font-bold">Dotyczy wszystkich maszyn (Globalny)</label>
                         <span className="text-[10px] text-zinc-500">Np. dla Warsztatu - pokaże wszystkie maszyny na liście.</span>
                       </div>
                       <input type="checkbox" checked={cForm.isGlobal} onChange={e => setCForm({...cForm, isGlobal: e.target.checked})} className="w-4 h-4 rounded text-amber-500" />
                    </div>
                 </div>

                 <button type="submit" className="w-full bg-zinc-100 text-zinc-50 dark:text-zinc-950 font-semibold py-2.5 rounded-lg hover:bg-zinc-300 transition mt-4">{dict.saveDict}</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL MASZYNY */}
      {isMMOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMMOpen(false)}></div>
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{mEditId ? dict.modalMachEditTitle : dict.modalMachCreateTitle}</h2>
                 <button onClick={() => setIsMMOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleMSave} className="p-6 space-y-6">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">{dict.machIdLabel}</label>
                   <input required type="text" placeholder={dict.machIdPlaceholder} value={mForm.name} onChange={e => setMForm({...mForm, name: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-amber-500/80">{dict.machCatLabel} (Wybierz jedną lub więcej)</label>
                   <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                     {categories.map(c => (
                       <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                         <input type="checkbox" checked={mForm.categoryIds.includes(c.id)} onChange={(e) => {
                           if (e.target.checked) setMForm({...mForm, categoryIds: [...mForm.categoryIds, c.id]});
                           else setMForm({...mForm, categoryIds: mForm.categoryIds.filter(id => id !== c.id)});
                         }} className="rounded text-amber-500 w-4 h-4" />
                         <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{c.name}</span>
                       </label>
                     ))}
                   </div>
                   {categories.length === 0 && <p className="text-xs text-red-400">{dict.machCatWarning}</p>}
                 </div>
                 <div className="pt-4 border-t border-zinc-800">
                    <button disabled={categories.length === 0} type="submit" className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg hover:bg-amber-500 transition active:scale-[0.98] shadow-sm disabled:opacity-50">
                       {dict.saveFleet}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  )
}








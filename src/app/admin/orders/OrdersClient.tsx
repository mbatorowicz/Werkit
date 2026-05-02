"use client";

import { useState, useEffect } from "react";
import { Map, Plus, X } from "lucide-react";

export default function OrdersClient() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    userId: '',
    resourceId: '',
    sessionType: 'TRANSPORT',
    materialId: '',
    customerId: '',
    taskDescription: ''
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/workers").then(r => r.json()),
      fetch("/api/machines").then(r => r.json()),
      fetch("/api/materials").then(r => r.json()),
      fetch("/api/customers").then(r => r.json())
    ]).then(([wor, mac, mat, cus]) => {
      setWorkers(Array.isArray(wor) ? wor : []);
      setMachines(Array.isArray(mac) ? mac : []);
      setMaterials(Array.isArray(mat) ? mat : []);
      setCustomers(Array.isArray(cus) ? cus : []);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/work-orders", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if(res.ok) {
        alert("Zlecenie wysłane pomyślnie do pracownika!");
        setIsModalOpen(false);
        setForm({
          userId: '',
          resourceId: '',
          sessionType: 'TRANSPORT',
          materialId: '',
          customerId: '',
          taskDescription: ''
        });
      } else {
        const data = await res.json();
        alert(data.error || "Wystąpił błąd.");
      }
    } catch(err) {
      alert("Błąd komunikacji z serwerem");
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2"><Map className="w-6 h-6 text-amber-500" /> Dyspozytornia Zleceń</h1>
          <p className="text-zinc-500 mt-1">Wydawaj gotowe zlecenia dla konkretnych pracowników w terenie.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-amber-600 text-white px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-amber-500 transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nowe Zlecenie
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col p-10 items-center justify-center text-center shadow-sm">
        <Map className="w-12 h-12 text-zinc-700 mb-4" />
        <h3 className="text-zinc-300 font-medium">Zarządzanie z wyprzedzeniem</h3>
        <p className="text-zinc-500 text-sm mt-2 max-w-md">Zlecenia utworzone w tym miejscu wyświetlą się na samej górze ekranu wybranego pracownika. Nie musi on sam wypełniać danych – wystarczy, że kliknie "Rozpocznij".</p>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-xl rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-[#0a0a0b]/80 sticky top-0">
                 <h2 className="text-lg font-semibold text-white">Wystaw Zlecenie dla Pracownika</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-5">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-amber-500">Wybierz pracownika</label>
                   <select required value={form.userId} onChange={e => setForm({...form, userId: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="" disabled>Wybierz kogoś z listy...</option>
                     {workers.map(w => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                   </select>
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">Typ Pracy</label>
                   <select required value={form.sessionType} onChange={e => setForm({...form, sessionType: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="TRANSPORT">Transport Kruszyw</option>
                     <option value="MACHINE_OP">Praca Sprzętem (Koparki/Ładowarki)</option>
                     <option value="WORKSHOP">Warsztat / Naprawy</option>
                   </select>
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">Przydzielony Sprzęt / Maszyna</label>
                   <select required value={form.resourceId} onChange={e => setForm({...form, resourceId: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="" disabled>Wybierz pojazd/maszynę...</option>
                     {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                   </select>
                 </div>

                 {form.sessionType === 'TRANSPORT' && (
                   <>
                     <div className="space-y-2">
                       <label className="text-sm font-medium text-zinc-400">Towar (Kruszywo)</label>
                       <select required value={form.materialId} onChange={e => setForm({...form, materialId: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                         <option value="" disabled>Wybierz materiał...</option>
                         {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                     </div>
                     <div className="space-y-2">
                       <label className="text-sm font-medium text-zinc-400">Klient Docelowy</label>
                       <select required value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                         <option value="" disabled>Wybierz klienta...</option>
                         {customers.map(c => <option key={c.id} value={c.id}>{c.lastName} {c.firstName}</option>)}
                       </select>
                     </div>
                   </>
                 )}

                 {form.sessionType !== 'TRANSPORT' && (
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-zinc-400">Zadanie / Opis zlecenia</label>
                     <textarea required placeholder="Krótki opis zadania dla pracownika..." value={form.taskDescription} onChange={e => setForm({...form, taskDescription: e.target.value})} className="w-full h-24 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none resize-none"></textarea>
                   </div>
                 )}
                 
                 <div className="pt-4 border-t border-zinc-800">
                    <button disabled={isSubmitting} type="submit" className="w-full bg-amber-600 text-white font-bold py-4 rounded-lg hover:bg-amber-500 transition active:scale-[0.98] shadow-sm disabled:opacity-50">
                       {isSubmitting ? "Wysyłanie do kierowcy..." : "Wyślij Zlecenie"}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  )
}

"use client";

import { useState, useEffect } from "react";
import { Trash2, Wrench, Plus, X, Truck } from "lucide-react";

type Machine = {
  id: number;
  name: string;
  type: string;
};

export default function MachinesClient() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({ name: '', type: '' });

  const fetchMachines = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/machines");
      const data = await res.json();
      setMachines(data || []);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if(!confirm(`Czy na pewno wycofać z floty maszynę: ${name}?`)) return;
    try {
      const res = await fetch(`/api/machines/${id}`, { method: 'DELETE' });
      if(res.ok) {
        setMachines(machines.filter(m => m.id !== id));
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Wystąpił błąd przy usuwaniu.");
      }
    } catch(e) {
      alert("Błąd połączenia serwera.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, type: form.type.trim() }) // trim spaces for clean categories
      });
      const data = await res.json();
      if(res.ok) {
        setIsModalOpen(false);
        setForm({ name: '', type: '' });
        fetchMachines();
      } else {
        alert(data.error || "Błąd rejestracji pojazdu.");
      }
    } catch(e) {
      alert("Błąd sieci.");
    }
    setIsSubmitting(false);
  };

  // Znajdź wszystkie unikalne użyte do tej pory kategorie, by podpowiadać je adminowi!
  const uniqueCategories = Array.from(new Set(machines.map(m => m.type))).filter(Boolean);

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Park Maszynowy i Sprzęt</h1>
          <p className="text-zinc-500 mt-1">Ewidencjonuj pojazdy, sprzęty budowlane i stacjonarne powiązane ze zleceniami.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-amber-600 text-white px-5 py-2.5 text-sm font-semibold rounded-xl hover:bg-amber-500 transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Dodaj nowy sprzęt
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
               <tr className="border-b border-zinc-800/50 bg-[#0a0a0b]/80">
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pojazd / Rejestracja</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kategoria / Typ</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Zarządzanie</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
               {isLoading ? (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 text-sm">Synchronizacja tabel maszynowych...</td></tr>
               ) : machines.map(machine => (
                 <tr key={machine.id} className="hover:bg-zinc-800/20 transition-colors">
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
                           <Truck className="w-5 h-5" />
                         </div>
                         <div>
                           <div className="font-semibold text-zinc-200">{machine.name}</div>
                           <div className="text-[11px] text-zinc-500 uppercase tracking-widest mt-0.5">ID: {machine.id}</div>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                     <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider">
                       {machine.type}
                     </span>
                   </td>
                   <td className="px-6 py-4 text-right">
                     <button onClick={() => handleDelete(machine.id, machine.name)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Wyrejestruj / Skasuj">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </td>
                 </tr>
               ))}
               {!isLoading && machines.length === 0 && (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 text-sm">Garaż jest pusty. Wprowadź pierwszą maszynę flotową!</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-[#0a0a0b]/80">
                 <h2 className="text-lg font-semibold text-white">Rejestracja Nowego Sprzętu</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                 
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">Identyfikator (Marka, Model lub Nr. Rej.)</label>
                   <input required type="text" placeholder="Np. Wywrotka SCANIA WGR 8092" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-amber-500/80">Kategoria Systemowa</label>
                   <p className="text-xs text-zinc-500 mb-2">Możesz wpisać własną kategorię lub wybrać jedną z użytych już wcześniej z rozwijanej listy. System zrzeszy w nią kolejne pojazdy.</p>
                   
                   {/* Datalist pozwala na wpisywanie WŁASNYCH lub podpowiada stare! */}
                   <input 
                     required 
                     list="category-suggestions" 
                     placeholder="Wpisz np. Transport, Koparka, albo Warsztat" 
                     value={form.type} 
                     onChange={e => setForm({...form, type: e.target.value})} 
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" 
                   />
                   <datalist id="category-suggestions">
                     {uniqueCategories.map((c, i) => (
                       <option key={i} value={c} />
                     ))}
                   </datalist>
                 </div>

                 <div className="pt-2 border-t border-zinc-800 flex mt-4">
                    <button disabled={isSubmitting} type="submit" className="w-full bg-amber-600 text-white font-bold py-3 rounded-xl hover:bg-amber-500 transition active:scale-[0.98] shadow-sm disabled:opacity-50 mt-2">
                       {isSubmitting ? "Wprowadzanie do ewidencji..." : "Zapisz park maszynowy"}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  )
}

"use client";

import { useState, useEffect } from "react";
import { Trash2, Users, Plus, X, Edit2, MapPin } from "lucide-react";

type Customer = {
  id: number;
  firstName: string | null;
  lastName: string;
  defaultAddress: string | null;
};

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', defaultAddress: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/customers", { cache: "no-store" });
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData() }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const url = editId ? `/api/customers/${editId}` : "/api/customers";
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
      if(res.ok) { setIsModalOpen(false); fetchData(); }
      else { alert((await res.json()).error); }
    } catch(e) { alert("Błąd API."); }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
     if(!confirm("Czy na pewno chcesz usunąć tego klienta z bazy?")) return;
     const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
     if(res.ok) fetchData();
     else alert((await res.json()).error);
  };

  const openNewModal = () => {
    setEditId(null);
    setForm({ firstName: '', lastName: '', defaultAddress: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditId(customer.id);
    setForm({ 
      firstName: customer.firstName || '', 
      lastName: customer.lastName, 
      defaultAddress: customer.defaultAddress || '' 
    });
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2"><Users className="w-6 h-6 text-indigo-500" /> Klienci i Adresy</h1>
          <p className="text-zinc-500 mt-1">Stali klienci, firmy, budowy i zrzuty powiązane z transportami.</p>
        </div>
        <button onClick={openNewModal} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Dodaj Kontrahenta
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
               <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Dane Klienta / Nazwa Budowy</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Domyślny Adres</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Zarządzanie</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
               {isLoading ? (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Pobieranie bazy...</td></tr>
               ) : customers.map(customer => (
                 <tr key={customer.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                   <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-200">
                        {customer.firstName ? `${customer.firstName} ${customer.lastName}` : customer.lastName}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">ID: #{customer.id}</div>
                   </td>
                   <td className="px-6 py-4">
                     {customer.defaultAddress ? (
                       <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 text-sm">
                         <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                         {customer.defaultAddress}
                       </div>
                     ) : (
                       <span className="text-zinc-600 italic text-xs">Brak ustalonego adresu</span>
                     )}
                   </td>
                   <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-1">
                        <button onClick={() => openEditModal(customer)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition" title="Edytuj">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(customer.id)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Skasuj całkowicie">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </td>
                 </tr>
               ))}
               {!isLoading && customers.length === 0 && (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Brak zarejestrowanych klientów.</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white">{editId ? "Edycja Danych Klienta" : "Nowy Klient w Bazie"}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-zinc-400">Imię (Opcjonalne)</label>
                     <input type="text" placeholder="Jan / Spółka" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-zinc-400">Nazwisko / Nazwa Firmy*</label>
                     <input required type="text" placeholder="Kowalski / Budpol" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none" />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">Domyślny Adres Zrzutu / Dostawy</label>
                   <input type="text" placeholder="Węgrów, ul. Leśna 5" value={form.defaultAddress} onChange={e => setForm({...form, defaultAddress: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none" />
                 </div>
                 
                 <div className="pt-4 border-t border-zinc-800">
                    <button disabled={isSubmitting} type="submit" className="w-full bg-indigo-600 text-zinc-900 dark:text-white font-bold py-3 rounded-lg hover:bg-indigo-500 transition active:scale-[0.98] shadow-sm disabled:opacity-50">
                       {isSubmitting ? "Zapisywanie..." : (editId ? "Zapisz Zmiany" : "Dodaj do Systemu")}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  )
}








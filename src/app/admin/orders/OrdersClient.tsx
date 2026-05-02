"use client";

import { useState, useEffect } from "react";
import { Map, Plus, X } from "lucide-react";

export default function OrdersClient() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [wor, mac, mat, cus, ords] = await Promise.all([
        fetch("/api/workers", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/machines", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/materials", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/customers", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/admin/work-orders", { cache: "no-store" }).then(r => r.json())
      ]);
      setWorkers(Array.isArray(wor) ? wor : []);
      setMachines(Array.isArray(mac) ? mac : []);
      setMaterials(Array.isArray(mat) ? mat : []);
      setCustomers(Array.isArray(cus) ? cus : []);
      setOrders(Array.isArray(ords) ? ords : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        fetchData();
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
        <button onClick={() => setIsModalOpen(true)} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nowa dyspozycja
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0a0a0b]">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pracownik / Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Maszyna</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Zadanie / Typ</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Pobieranie zleceń...</td></tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Map className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                      <h3 className="text-zinc-900 dark:text-zinc-300 font-medium">Zarządzanie z wyprzedzeniem</h3>
                      <p className="text-zinc-500 text-sm mt-2 max-w-md">Brak wystawionych zleceń. Kliknij "Nowa dyspozycja", aby przydzielić zadanie pracownikowi.</p>
                    </div>
                  </td>
                </tr>
              ) : orders.map(order => (
                <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-200">{order.workerName}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString('pl-PL')} {new Date(order.createdAt).toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'})}</div>
                    {order.creatorName && (
                      <div className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">
                        Zlecił: <span className="font-medium text-zinc-500">{order.creatorName}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                    {order.resourceName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-900 dark:text-zinc-200">
                      {order.sessionType === 'TRANSPORT' ? 'Transport Kruszyw' : (order.sessionType === 'MACHINE_OP' ? 'Praca Sprzętem' : 'Warsztat')}
                    </div>
                    {order.sessionType === 'TRANSPORT' && (
                       <div className="text-xs text-zinc-500 mt-0.5">
                         {order.materialName} → {order.customerLastName} {order.customerFirstName}
                       </div>
                    )}
                    {order.sessionType !== 'TRANSPORT' && order.taskDescription && (
                       <div className="text-xs text-zinc-500 mt-0.5 max-w-xs truncate" title={order.taskDescription}>
                         {order.taskDescription}
                       </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${order.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20' : order.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20'}`}>
                      {order.status === 'PENDING' ? 'Oczekujące' : order.status === 'IN_PROGRESS' ? 'W trakcie' : 'Zakończone'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-xl rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80 sticky top-0">
                 <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Wystaw Zlecenie dla Pracownika</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-5">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-amber-500">Wybierz pracownika</label>
                   <select required value={form.userId} onChange={e => setForm({...form, userId: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="" disabled>Wybierz kogoś z listy...</option>
                     {workers.map(w => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                   </select>
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">Typ Pracy</label>
                   <select required value={form.sessionType} onChange={e => setForm({...form, sessionType: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="TRANSPORT">Transport Kruszyw</option>
                     <option value="MACHINE_OP">Praca Sprzętem (Koparki/Ładowarki)</option>
                     <option value="WORKSHOP">Warsztat / Naprawy</option>
                   </select>
                 </div>

                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">Przydzielony Sprzęt / Maszyna</label>
                   <select required value={form.resourceId} onChange={e => setForm({...form, resourceId: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="" disabled>Wybierz pojazd/maszynę...</option>
                     {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                   </select>
                 </div>

                 {form.sessionType === 'TRANSPORT' && (
                   <>
                     <div className="space-y-2">
                       <label className="text-sm font-medium text-zinc-400">Towar (Kruszywo)</label>
                       <select required value={form.materialId} onChange={e => setForm({...form, materialId: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                         <option value="" disabled>Wybierz materiał...</option>
                         {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                     </div>
                     <div className="space-y-2">
                       <label className="text-sm font-medium text-zinc-400">Klient Docelowy</label>
                       <select required value={form.customerId} onChange={e => setForm({...form, customerId: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                         <option value="" disabled>Wybierz klienta...</option>
                         {customers.map(c => <option key={c.id} value={c.id}>{c.lastName} {c.firstName}</option>)}
                       </select>
                     </div>
                   </>
                 )}

                 {form.sessionType !== 'TRANSPORT' && (
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-zinc-400">Zadanie / Opis zlecenia</label>
                     <textarea required placeholder="Krótki opis zadania dla pracownika..." value={form.taskDescription} onChange={e => setForm({...form, taskDescription: e.target.value})} className="w-full h-24 bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none resize-none"></textarea>
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







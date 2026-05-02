"use client";

import { useState, useEffect } from "react";
import { Trash2, Shield, Plus, X, Lock, Edit2, Loader2 } from "lucide-react";

type Worker = {
  id: number;
  fullName: string;
  usernameEmail: string;
  role: string;
  isActive: boolean;
};

export default function WorkersClient() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ fullName: '', usernameEmail: '', password: '', role: 'worker' });

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workers", { cache: "no-store" });
      const data = await res.json();
      setWorkers(data || []);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if(!confirm(`Czy na pewno chcesz bezpowrotnie skasować konto pracownika: ${name}?`)) return;
    try {
      const res = await fetch(`/api/workers/${id}`, { method: 'DELETE' });
      if(res.ok) {
        fetchWorkers();
      } else {
        alert("Wystąpił błąd przy usuwaniu.");
      }
    } catch(e) {
      alert("Błąd połączenia serwera.");
    }
  };

  const handeEditClick = (worker: Worker) => {
    setEditId(worker.id);
    setForm({ fullName: worker.fullName, usernameEmail: worker.usernameEmail, role: worker.role, password: '' });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditId(null);
    setForm({ fullName: '', usernameEmail: '', password: '', role: 'worker' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editId ? `/api/workers/${editId}` : "/api/workers";
      const method = editId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if(res.ok) {
        setIsModalOpen(false);
        fetchWorkers();
      } else {
        alert(data.error || "Błąd podczas zapisu.");
      }
    } catch(e) {
      alert("Błąd sieci. Serwer Vercla nie odpowiedział.");
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Karty Kadrowe Pracowników</h1>
          <p className="text-zinc-500 mt-1">Dodawaj oraz Modyfikuj wygenerowane konta do autoryzacji w aplikacji.</p>
        </div>
        <button onClick={openNewModal} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Dodaj pracownika
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
               <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Imię i Nazwisko / Rola</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Login Systemowy</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Zarządzanie</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
               {isLoading ? (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Pobieranie bazy kadr...</td></tr>
               ) : workers.map(worker => (
                 <tr key={worker.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 flex items-center justify-center text-emerald-700 dark:text-zinc-300 font-bold">
                           {worker.fullName.charAt(0)}
                         </div>
                         <div>
                           <div className="font-medium text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                             {worker.fullName} 
                             {worker.role === 'admin' && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                           </div>
                           <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{worker.role === 'admin' ? 'Administrator' : 'Fizyczny Pracownik'}</div>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                     <span className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded text-sm font-mono tracking-wide">{worker.usernameEmail}</span>
                   </td>
                   <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-1">
                        <button onClick={() => handeEditClick(worker)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition" title="Edytuj dane i hasło">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {worker.role !== 'admin' && (
                          <button onClick={() => handleDelete(worker.id, worker.fullName)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Usuń konto na stałe">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                     </div>
                   </td>
                 </tr>
               ))}
               {!isLoading && workers.length === 0 && (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Brak zatrudnionych osób w systemie.</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           
           {/* Modal */}
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{editId ? "Edycja Profilu" : "Tworzenie Konta Autoryzacyjnego"}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">Imię i Nazwisko</label>
                   <input required type="text" placeholder="Np. Jan Kowalski" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-amber-500/80">Typ Uprawnień</label>
                   <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="worker">Fizyczny Pracownik (Kierowca / Mechanik)</option>
                     <option value="admin">Administrator Biurowy (Pełen Dostęp)</option>
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Login (Unikalny)</label>
                      <input required type="text" placeholder="janek_k" value={form.usernameEmail} onChange={e => setForm({...form, usernameEmail: e.target.value.toLowerCase()})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">{editId ? "Nowy PIN (puste=bez zmian)" : "Hasło (PIN)"}</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input required={!editId} type="text" placeholder={editId ? "*** (ukryte)" : "1234"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 pl-10 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                      </div>
                    </div>
                 </div>

                 {editId ? (
                    <div className="bg-amber-500/10 p-4 border border-amber-500/20 rounded-lg mt-4 text-xs text-amber-500 leading-relaxed font-medium">
                     Tryb nadpisywania. Nie musisz podawać starego opisu PIN, wpisz twardo wymuszone nowe, a system je zatwierdzi z automatu.
                    </div>
                 ) : (
                    <div className="bg-zinc-100 dark:bg-zinc-950/50 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg mt-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                     Zgodnie z protokołem bezpieczeństwa, przekazujesz wygenerowany przed chwilą login i pin pracownikowi. Hasło zostanie zaszyfrowane metodą BCRYPT.
                    </div>
                 )}

                  <div className="pt-4">
                    <button disabled={isSubmitting} type="submit" className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold py-3 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition active:scale-[0.98] shadow-sm disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editId ? "Zapisz zmiany" : "Utwórz pracownika")}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  )
}









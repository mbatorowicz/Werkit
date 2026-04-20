"use client";

import { useState, useEffect } from "react";
import { Trash2, Shield, Plus, X, Lock } from "lucide-react";

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

  const [form, setForm] = useState({ fullName: '', usernameEmail: '', password: '', role: 'worker' });

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workers");
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
        setWorkers(workers.filter(w => w.id !== id));
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
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if(res.ok) {
        setIsModalOpen(false);
        setForm({ fullName: '', usernameEmail: '', password: '', role: 'worker' });
        fetchWorkers();
      } else {
        alert(data.error || "Błąd podczas rejestracji.");
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
          <h1 className="text-2xl font-semibold text-white tracking-tight">Karty Kadrowe Pracowników</h1>
          <p className="text-zinc-500 mt-1">Nadawaj konta do autoryzacji kierowcom i operatorom Werkit Mobile.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-white text-zinc-950 px-5 py-2.5 text-sm font-semibold rounded-xl hover:bg-zinc-200 transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Dodaj pracownika
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
               <tr className="border-b border-zinc-800/50 bg-[#0a0a0b]/80">
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Imię i Nazwisko / Rola</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Login dla Smartfona</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Akcja</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
               {isLoading ? (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 text-sm">Pobieranie bazy danych...</td></tr>
               ) : workers.map(worker => (
                 <tr key={worker.id} className="hover:bg-zinc-800/20 transition-colors">
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold">
                           {worker.fullName.charAt(0)}
                         </div>
                         <div>
                           <div className="font-medium text-zinc-200 flex items-center gap-2">
                             {worker.fullName} 
                             {worker.role === 'admin' && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                           </div>
                           <div className="text-xs text-zinc-500 mt-0.5">{worker.role === 'admin' ? 'Administrator' : 'Fizyczny Pracownik Floty'}</div>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                     <span className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-1 rounded text-sm font-mono tracking-wide">{worker.usernameEmail}</span>
                   </td>
                   <td className="px-6 py-4 text-right">
                     {worker.role !== 'admin' && (
                       <button onClick={() => handleDelete(worker.id, worker.fullName)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                   </td>
                 </tr>
               ))}
               {!isLoading && workers.length === 0 && (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 text-sm">Brak zatrudnionych osób w systemie.</td></tr>
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
           <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-[#0a0a0b]/80">
                 <h2 className="text-lg font-semibold text-white">Tworzenie Konta Autoryzacyjnego</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">Imię i Nazwisko</label>
                   <input required type="text" placeholder="Np. Jan Kowalski" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-amber-500/80">Typ Uprawnień</label>
                   <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="worker">Fizyczny Pracownik (Kierowca / Mechanik)</option>
                     <option value="admin">Administrator Biurowy (Pełen Dostęp)</option>
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Login</label>
                      <input required type="text" placeholder="janek_k" value={form.usernameEmail} onChange={e => setForm({...form, usernameEmail: e.target.value.toLowerCase()})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Hasło (PIN)</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input required type="text" placeholder="1234" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 pl-10 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                      </div>
                    </div>
                 </div>

                 <div className="bg-zinc-950/50 p-4 border border-zinc-800 rounded-xl mt-4 text-xs text-zinc-500 leading-relaxed">
                   Zgodnie z protokołem bezpieczeństwa, przekazujesz wygenerowany przed chwilą login i pin pracownikowi. Hasło zostanie po stronie serwera zaszyfrowane metodą BCRYPT-10.
                 </div>

                 <div className="pt-2">
                    <button disabled={isSubmitting} type="submit" className="w-full bg-white text-zinc-950 font-bold py-3 rounded-xl hover:bg-zinc-200 transition active:scale-[0.98] shadow-sm disabled:opacity-50">
                       {isSubmitting ? "Szyfrowanie i Zapis..." : "Dodaj Pracownika we Flocie"}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  )
}

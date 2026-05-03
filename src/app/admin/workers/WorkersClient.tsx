"use client";

import { useState, useEffect } from "react";
import { Trash2, Shield, Plus, X, Lock, Edit2, Loader2, Users } from "lucide-react";
import { getDictionary } from "@/i18n";

type Worker = {
  id: number;
  fullName: string;
  usernameEmail: string;
  role: string;
  isActive: boolean;
  canCreateOwnOrders: boolean;
};

export default function WorkersClient() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ fullName: '', usernameEmail: '', password: '', role: 'worker', canCreateOwnOrders: true });
  const dictionary = getDictionary();
  const dict = dictionary.admin.workers;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

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
    if(!confirm(`${dict.confirmDelete} ${name}?`)) return;
    try {
      const res = await fetch(`/api/workers/${id}`, { method: 'DELETE' });
      if(res.ok) {
        fetchWorkers();
      } else {
        const data = await res.json();
        alert(apiErrors[data.error] || data.error || dict.deleteError);
      }
    } catch(e) {
      alert(dict.networkError);
    }
  };

  const handeEditClick = (worker: Worker) => {
    setEditId(worker.id);
    setForm({ fullName: worker.fullName, usernameEmail: worker.usernameEmail, role: worker.role, password: '', canCreateOwnOrders: worker.canCreateOwnOrders ?? true });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditId(null);
    setForm({ fullName: '', usernameEmail: '', password: '', role: 'worker', canCreateOwnOrders: true });
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
        alert(apiErrors[data.error] || data.error || dict.saveError);
      }
    } catch(e) {
      alert(dict.networkError);
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 pt-2"><Users className="w-6 h-6 text-emerald-500"/> {dict.title}</h2>
        </div>
        <button onClick={openNewModal} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {dict.addWorker}
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
               <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.nameRole}</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.systemLogin}</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">{dict.management}</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
               {isLoading ? (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">{dict.fetching}</td></tr>
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
                           <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{worker.role === 'admin' ? dict.admin : dict.physicalWorker}</div>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                     <span className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded text-sm font-mono tracking-wide">{worker.usernameEmail}</span>
                   </td>
                   <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-1">
                        <button onClick={() => handeEditClick(worker)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition" title={dict.editTitle}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {worker.role !== 'admin' && (
                          <button onClick={() => handleDelete(worker.id, worker.fullName)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title={dict.deleteTitle}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                     </div>
                   </td>
                 </tr>
               ))}
               {!isLoading && workers.length === 0 && (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">{dict.noWorkers}</td></tr>
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
                 <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{editId ? dict.modalEditTitle : dict.modalCreateTitle}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">{dict.fullNameLabel}</label>
                   <input required type="text" placeholder={dict.fullNamePlaceholder} value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-amber-500/80">{dict.roleLabel}</label>
                   <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                     <option value="worker">{dict.roleWorker}</option>
                     <option value="admin">{dict.roleAdmin}</option>
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">{dict.loginLabel}</label>
                      <input required type="text" placeholder={dict.loginPlaceholder} value={form.usernameEmail} onChange={e => setForm({...form, usernameEmail: e.target.value.toLowerCase()})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">{editId ? dict.passwordLabelEdit : dict.passwordLabelNew}</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input required={!editId} type="text" placeholder={editId ? dict.passwordPlaceholderEdit : dict.passwordPlaceholderNew} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 pl-10 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                      </div>
                    </div>
                 </div>

                 {form.role !== 'admin' && (
                   <div className="flex items-center gap-3 pt-2">
                     <label className="relative flex items-center cursor-pointer">
                       <input type="checkbox" className="sr-only peer" checked={form.canCreateOwnOrders} onChange={e => setForm({...form, canCreateOwnOrders: e.target.checked})} />
                       <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                     </label>
                     <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{dict.canCreateOwnOrdersLabel}</span>
                   </div>
                 )}

                 {editId ? (
                    <div className="bg-amber-500/10 p-4 border border-amber-500/20 rounded-lg mt-4 text-xs text-amber-500 leading-relaxed font-medium">
                     {dict.editWarning}
                    </div>
                 ) : (
                    <div className="bg-zinc-100 dark:bg-zinc-950/50 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg mt-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                     {dict.createWarning}
                    </div>
                 )}

                  <div className="pt-4">
                    <button disabled={isSubmitting} type="submit" className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold py-3 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition active:scale-[0.98] shadow-sm disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editId ? dict.saveChanges : dict.createAccount)}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  )
}









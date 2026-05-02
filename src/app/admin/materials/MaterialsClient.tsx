"use client";

import { useState, useEffect } from "react";
import { Trash2, Box, Plus, X, Edit2 } from "lucide-react";
import { getDictionary } from "@/i18n";

type Material = {
  id: number;
  name: string;
  type: string;
};

export default function MaterialsClient() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', type: 'PIASEK' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dictionary = getDictionary();
  const dict = dictionary.admin.materials;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/materials", { cache: "no-store" });
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData() }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const url = editId ? `/api/materials/${editId}` : "/api/materials";
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
      if(res.ok) { setIsModalOpen(false); fetchData(); }
      else { const err = (await res.json()).error; alert(apiErrors[err] || err); }
    } catch(e) { alert(getDictionary().admin.machines.apiError); }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
     if(!confirm(dict.confirmDelete)) return;
     const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
     if(res.ok) fetchData();
     else { const err = (await res.json()).error; alert(apiErrors[err] || err); }
  };

  const openNewModal = () => {
    setEditId(null);
    setForm({ name: '', type: 'PIASEK' });
    setIsModalOpen(true);
  };

  const openEditModal = (material: Material) => {
    setEditId(material.id);
    setForm({ name: material.name, type: material.type });
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2"><Box className="w-6 h-6 text-emerald-500" /> {dict.title}</h1>
          <p className="text-zinc-500 mt-1">{dict.subtitle}</p>
        </div>
        <button onClick={openNewModal} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> {dict.addMaterial}
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
               <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.name}</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.type}</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">{getDictionary().admin.machines.management}</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
               {isLoading ? (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">{dict.fetching}</td></tr>
               ) : materials.map(material => (
                 <tr key={material.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                   <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-200">{material.name}</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">ID: #{material.id}</div>
                   </td>
                   <td className="px-6 py-4">
                      <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider">
                        {material.type}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-1">
                        <button onClick={() => openEditModal(material)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition" title={getDictionary().admin.machines.editTitle}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(material.id)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title={getDictionary().admin.machines.deleteTitle}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </td>
                 </tr>
               ))}
               {!isLoading && materials.length === 0 && (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">{dict.noMaterials}</td></tr>
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
                 <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{editId ? dict.modalEditTitle : dict.modalCreateTitle}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-5">
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">{dict.nameLabel}</label>
                   <input required type="text" placeholder={dict.namePlaceholder} value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition outline-none" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">{dict.typeLabel}</label>
                   <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition outline-none appearance-none">
                     <option value="PIASEK">{dict.typeSand}</option>
                     <option value="ZWIR">{dict.typeGravel}</option>
                     <option value="POSPOLKA">{dict.typeMix}</option>
                     <option value="TLUCZEN">{dict.typeRubble}</option>
                     <option value="ZIEMIA">{dict.typeSoil}</option>
                     <option value="INNE">{dict.typeOther}</option>
                   </select>
                 </div>
                 
                 <div className="pt-4 border-t border-zinc-800">
                    <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-500 transition active:scale-[0.98] shadow-sm disabled:opacity-50">
                       {isSubmitting ? getDictionary().admin.orders.saving : (editId ? dict.save : dict.create)}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </>
  )
}








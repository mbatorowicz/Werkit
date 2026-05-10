import { useState } from "react";
import { X } from "lucide-react";

import { OrderFormState, BaseWorker, BaseMachine, BaseMaterial, BaseCustomer, BaseCategory } from "@/types/admin";

export default function OrderFormModal({
  isOpen,
  onClose,
  onSave,
  editingOrderId,
  dict,
  apiErrors,
  workers,
  machines,
  materials,
  customers,
  categories,
  initialForm
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: OrderFormState) => Promise<void>;
  editingOrderId: number | null;
  dict: Record<string, string>;
  apiErrors: Record<string, string>;
  workers: BaseWorker[];
  machines: BaseMachine[];
  materials: BaseMaterial[];
  customers: BaseCustomer[];
  categories: BaseCategory[];
  initialForm: OrderFormState;
}) {
  const [form, setForm] = useState<OrderFormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedCategory = categories.find(c => String(c.id) === form.categoryId);

  const availableMachines = machines.filter(m => {
    if (!selectedCategory) return true;
    if (selectedCategory.isGlobal) return true;
    return m.categoryIds?.includes(selectedCategory.id);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(form);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-xl rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80 sticky top-0">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{editingOrderId ? `Edytuj zlecenie #${editingOrderId}` : dict.issueOrder}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-500">{dict.chooseWorker}</label>
            <select required value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
              <option value="" disabled>{dict.chooseFromList}</option>
              {workers.map((w) => <option key={w.id} value={w.id}>{w.fullName}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.jobType}</label>
            <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value, resourceId: '' })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
              <option value="" disabled>Wybierz typ zadania...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">{dict.chooseMachine}</label>
            <select required value={form.resourceId} onChange={e => setForm({ ...form, resourceId: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
              <option value="" disabled>{dict.chooseMachine}...</option>
              {availableMachines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {selectedCategory?.reqMaterial && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">{dict.chooseMaterial}</label>
              <select required value={form.materialId} onChange={e => setForm({ ...form, materialId: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                <option value="" disabled>{dict.chooseMaterial}...</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          {selectedCategory?.reqCustomer && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">{dict.chooseCustomer}</label>
              <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                <option value="" disabled>{dict.chooseCustomer}...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.lastName} {c.firstName}</option>)}
              </select>
            </div>
          )}
          {selectedCategory?.reqQuantity && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Ilość kruszywa (tony)</label>
              <input required type="number" step="0.01" placeholder="np. 20.5" value={form.quantityTons} onChange={e => setForm({ ...form, quantityTons: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
            </div>
          )}

          {(!selectedCategory || selectedCategory?.reqTaskDescription) && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">{dict.taskDesc}</label>
              <textarea required placeholder={dict.taskDescPlaceholder} value={form.taskDescription} onChange={e => setForm({ ...form, taskDescription: e.target.value })} className="w-full h-24 bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none resize-none"></textarea>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Przewidywany czas (godziny)</label>
              <input type="number" step="0.5" placeholder="np. 4.5" value={form.expectedDurationHours} onChange={e => setForm({ ...form, expectedDurationHours: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Termin wykonania (opcjonalnie)</label>
              <input type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Priorytet</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
              <option value="LOW">Niski</option>
              <option value="NORMAL">Normalny</option>
              <option value="HIGH">Ważny</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-200 dark:border-amber-500/20">
            <input type="checkbox" id="forceSave" checked={form.forceSave} onChange={e => setForm({ ...form, forceSave: e.target.checked })} className="w-4 h-4 text-amber-600 bg-white border-amber-300 rounded focus:ring-amber-500 focus:ring-2 dark:bg-zinc-800 dark:border-zinc-600 cursor-pointer" />
            <label htmlFor="forceSave" className="text-sm font-medium text-amber-800 dark:text-amber-400 cursor-pointer select-none">Zignoruj konflikty harmonogramu (Wymuś zapis)</label>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <button disabled={isSubmitting} type="submit" className="w-full bg-amber-600 text-white font-bold py-4 rounded-lg hover:bg-amber-500 transition active:scale-[0.98] shadow-sm disabled:opacity-50">
              {isSubmitting ? dict.saving : dict.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

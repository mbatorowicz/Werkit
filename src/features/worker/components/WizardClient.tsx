"use client";

import { WorkOrder } from "@/types/worker";
import type { WizardCategory, WizardCustomer, WizardMachine, WizardMaterial } from "@/types/wizard";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Truck, Tractor, Wrench, ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import { getDictionary } from "@/i18n";
import {
  sortWorkOrdersByPriorityThenCreated,
  workOrderCategoryHeadingClass,
  workOrderInteractiveSurfaceClass,
} from "@/features/worker/lib/workOrderPresentation";
import { WorkOrderPriorityRibbon } from "@/components/work-orders";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { getCurrentPositionOnce } from "@/lib/geolocationOnce";
import { DEFAULT_UI_LOCALE } from "@/i18n";

export default function WizardClient() {
  const router = useRouter();
  const dict = getDictionary().worker.client;
  const apiErrors = getDictionary().apiErrors as Record<string, string>;

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [categories, setCategories] = useState<WizardCategory[]>([]);
  const [machines, setMachines] = useState<WizardMachine[]>([]);
  const [materials, setMaterials] = useState<WizardMaterial[]>([]);
  const [customers, setCustomers] = useState<WizardCustomer[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  // Form State
  const [categoryId, setCategoryId] = useState<string>("");
  const [resourceId, setResourceId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [quantityTons, setQuantityTons] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/categories", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/machines", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/materials", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/customers", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/worker/work-orders", { cache: "no-store" }).then(r => r.json())
    ]).then(([cat, mac, mat, cus, ord]) => {
      setCategories(Array.isArray(cat) ? cat : []);
      setMachines(Array.isArray(mac) ? mac : []);
      setMaterials(Array.isArray(mat) ? mat : []);
      setCustomers(Array.isArray(cus) ? cus : []);
      setOrders(Array.isArray(ord) ? ord : []);
    }).catch(console.error);
  }, []);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/worker/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          resourceId,
          materialId: selectedCategory?.reqMaterial ? materialId : null,
          customerId: selectedCategory?.reqCustomer ? customerId : null,
          quantityTons: selectedCategory?.reqQuantity ? quantityTons : null,
          taskDescription: selectedCategory?.reqTaskDescription ? taskDescription : null
        })
      });

      if (res.ok) {
        router.push("/worker");
      } else {
        const data = await res.json();
        alert(apiErrors[data.error] || data.error || apiErrors.save_error);
        setIsLoading(false);
      }
    } catch {
      alert(dict.errNetwork);
      setIsLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    setIsLoading(true);
    try {
      const loc = await getCurrentPositionOnce();
      const res = await fetch(`/api/worker/work-orders/${orderId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loc ? { latitude: loc.lat, longitude: loc.lng } : {}),
      });
      if (res.ok) {
        router.push("/worker");
      } else {
        alert(dict.errAcceptOrder);
        setIsLoading(false);
      }
    } catch {
      alert(dict.errNetwork);
      setIsLoading(false);
    }
  };

  const selectedCategory = categories.find(c => c.id.toString() === categoryId);

  const availableMachines = machines.filter(m => {
    if (!selectedCategory) return true;
    if (selectedCategory.isGlobal) return true;
    return m.categoryIds?.includes(selectedCategory.id);
  });

  return (
    <div className="flex flex-col min-h-[80vh] py-6">
      {/* Pasek postępu */}
      <div className="flex items-center justify-between mb-8 px-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>
              {s}
            </div>
            {s < 4 && <div className={`w-10 md:w-16 h-1 mx-2 rounded-full ${step > s ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
          </div>
        ))}
      </div>

      <div className="flex-1 w-full">
        {/* KROK 1: Wybór kategorii */}
        {step === 1 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            {orders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-amber-500 mb-3">{dict.wizardPendingOrders}</h2>
                <div className="space-y-3">
                  {sortWorkOrdersByPriorityThenCreated(orders).map(order => (
                    <button
                      key={order.id}
                      onClick={() => handleAcceptOrder(order.id)}
                      className={`w-full border text-left p-4 rounded-lg transition-all ${workOrderInteractiveSurfaceClass(order.priority)}`}
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <div className={`font-bold text-lg ${workOrderCategoryHeadingClass(order.priority)}`}>
                          {order.categoryName || dict.noCategoryName}
                        </div>
                        <WorkOrderPriorityRibbon priority={order.priority} labels={dict} accentOnly />
                      </div>
                      <div className="mt-2">
                        <OrderLabelCard
                          tone="planned"
                          orderNo={`#${order.id}`}
                          mode={order.categoryName || dict.noCategoryName}
                          machine={order.resourceName || "—"}
                          material={order.materialName}
                          quantity={order.quantityTons ? `${order.quantityTons}t` : null}
                          customer={order.customerName}
                          description={order.taskDescription}
                          dateLabel={
                            order.dueDate
                              ? new Date(order.dueDate).toLocaleDateString(DEFAULT_UI_LOCALE)
                              : new Date(order.createdAt).toLocaleDateString(DEFAULT_UI_LOCALE)
                          }
                          timeLabel={
                            order.dueDate
                              ? new Date(order.dueDate).toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })
                              : new Date(order.createdAt).toLocaleTimeString(DEFAULT_UI_LOCALE, { hour: "2-digit", minute: "2-digit" })
                          }
                          className="bg-white/60 dark:bg-zinc-950/30"
                        />
                      </div>
                      <div className="mt-3 text-amber-500 font-semibold text-sm">{dict.startTask} &rarr;</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              {orders.length > 0 ? dict.wizardTitleOwn : dict.wizardTitle}
            </h2>
            <p className="text-zinc-500 text-sm mb-6">{dict.wizardSubtitle}</p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map(c => {
                const Icon = c.icon === 'Truck' ? Truck : c.icon === 'Tractor' ? Tractor : Wrench;
                return (
                  <button key={c.id} onClick={() => { setCategoryId(c.id.toString()); setStep(2); }}
                    className={`w-full p-5 rounded-lg border transition-all flex items-center gap-4 ${categoryId === c.id.toString() ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-700'}`}>
                    <div className="w-12 h-12 bg-[#f2fbfa] dark:bg-zinc-900 rounded-lg flex items-center justify-center shrink-0 text-emerald-500">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-left w-full">
                      <div className="font-bold text-lg">{c.name}</div>
                      <div className="text-xs opacity-70 mt-0.5">{dict.wizardClassType}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* KROK 2: Wybór maszyny */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{dict.wizardStep2Title}</h2>
            <p className="text-zinc-500 text-sm mb-4">{dict.wizardStep2Subtitle}</p>

            <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 mb-6 flex justify-between items-center">
              <div className="text-sm">
                <span className="text-zinc-500">{dict.wizardSelectedType} </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedCategory?.name}</span>
              </div>
              <button onClick={() => setStep(1)} className="text-xs text-zinc-500 underline">{dict.wizardChangeLink}</button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {availableMachines.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setResourceId(m.id.toString()); setStep(3); }}
                  className={`w-full p-4 rounded-lg border transition-all flex items-center gap-4 ${resourceId === m.id.toString() ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-700'}`}
                >
                  <div className="text-left w-full">
                    <div className="font-bold">{m.name}</div>
                    <div className="text-xs opacity-70 mt-1">ID: #{m.id}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50" />
                </button>
              ))}
              {availableMachines.length === 0 && (
                <div className="text-center p-6 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-800">
                  {dict.wizardNoMachines}
                </div>
              )}
            </div>
            <div className="mt-6">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" /> {dict.wizardBackToType}
              </button>
            </div>
          </div>
        )}

        {/* KROK 3: Szczegóły */}
        {step === 3 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{dict.wizardStep3Title}</h2>
            <p className="text-zinc-500 text-sm mb-4">{dict.wizardStep3Subtitle}</p>

            <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 mb-6 space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-zinc-500">{dict.wizardSelectedType} </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedCategory?.name}</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-700 pt-2">
                <div className="text-sm">
                  <span className="text-zinc-500">{dict.wizardSelectedMachine} </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{machines.find(m => m.id.toString() === resourceId)?.name}</span>
                </div>
                <button onClick={() => setStep(2)} className="text-xs text-zinc-500 underline">{dict.wizardChangeLink}</button>
              </div>
            </div>

            <div className="space-y-5">
              {selectedCategory?.reqMaterial && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">{dict.wizardMaterialLabel}</label>
                  <select value={materialId} onChange={e => setMaterialId(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none">
                    <option value="" disabled>{dict.wizardMaterialPlaceholder}</option>
                    {materials.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCategory?.reqCustomer && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">{dict.wizardCustomerLabel}</label>
                  <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none">
                    <option value="" disabled>{dict.wizardCustomerPlaceholder}</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.firstName ? `${c.firstName} ` : ''}{c.lastName}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCategory?.reqQuantity && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">{dict.wizardQuantityLabel}</label>
                  <input
                    type="number" step="0.01"
                    value={quantityTons}
                    onChange={e => setQuantityTons(e.target.value)}
                    placeholder="np. 20.5"
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              {(!selectedCategory || selectedCategory?.reqTaskDescription) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">{dict.wizardDescLabel}</label>
                  <textarea
                    value={taskDescription}
                    onChange={e => setTaskDescription(e.target.value)}
                    placeholder={dict.wizardDescPlaceholder}
                    className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" /> {dict.wizardBack}
              </button>
              <button
                disabled={(selectedCategory?.reqMaterial && !materialId) || (selectedCategory?.reqCustomer && !customerId) || (selectedCategory?.reqQuantity && !quantityTons) || ((!selectedCategory || selectedCategory?.reqTaskDescription) && !taskDescription)}
                onClick={() => setStep(4)}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
              >
                {dict.wizardNext} <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* KROK 4: Podsumowanie */}
        {step === 4 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 text-center">{dict.wizardStep4Title}</h2>
            <p className="text-zinc-500 text-sm mb-8 text-center">{dict.wizardStep4Subtitle}</p>

            <div className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 space-y-3 mb-10">
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">{dict.wizardSummaryType}</span>
                <span className="text-zinc-900 dark:text-white font-medium">{selectedCategory?.name}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
                <span className="text-zinc-500 text-sm">{dict.wizardSummaryMachine}</span>
                <span className="text-zinc-900 dark:text-white font-medium">{machines.find(m => m.id.toString() === resourceId)?.name}</span>
              </div>
              {selectedCategory?.reqMaterial && (
                <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
                  <span className="text-zinc-500 text-sm">{dict.wizardSummaryAggregate}</span>
                  <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[150px] text-right">
                    {materials.find(m => m.id.toString() === materialId)?.name}{quantityTons ? ` (${quantityTons}t)` : ''}
                  </span>
                </div>
              )}
              {selectedCategory?.reqCustomer && (
                <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
                  <span className="text-zinc-500 text-sm">{dict.wizardSummaryCustomer}</span>
                  <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[150px] text-right">
                    {customers.find(c => c.id.toString() === customerId)?.lastName}
                  </span>
                </div>
              )}
            </div>

            <button
              disabled={isLoading}
              onClick={handleStart}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-lg font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : dict.wizardStartWork}
            </button>

            <button onClick={() => setStep(3)} className="mt-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" /> {dict.wizardFixData}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

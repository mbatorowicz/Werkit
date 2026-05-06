"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Truck, Tractor, Wrench, ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";

export default function WizardClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [machines, setMachines] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Form State
  const [sessionType, setSessionType] = useState<"TRANSPORT" | "MACHINE_OP" | "WORKSHOP" | "">("");
  const [resourceId, setResourceId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  useEffect(() => {
    // Fetch references
    Promise.all([
      fetch("/api/machines", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/materials", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/customers", { cache: "no-store" }).then(r => r.json()),
      fetch("/api/worker/work-orders", { cache: "no-store" }).then(r => r.json())
    ]).then(([mac, mat, cus, ord]) => {
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
          sessionType,
          resourceId,
          materialId: sessionType === 'TRANSPORT' ? materialId : null,
          customerId: sessionType === 'TRANSPORT' ? customerId : null,
          taskDescription: sessionType !== 'TRANSPORT' ? taskDescription : null
        })
      });
      
      if (res.ok) {
        router.push("/worker");
      } else {
        const data = await res.json();
        alert(data.error || "Wystąpił błąd.");
        setIsLoading(false);
      }
    } catch (e) {
      alert("Błąd sieci.");
      setIsLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/worker/work-orders/${orderId}/accept`, { method: "POST" });
      if (res.ok) {
        router.push("/worker");
      } else {
        alert("Błąd akceptacji zlecenia.");
        setIsLoading(false);
      }
    } catch(e) {
      alert("Błąd sieci.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[80vh] py-6">
      {/* Pasek postępu */}
      <div className="flex items-center justify-between mb-8 px-2">
         {[1,2,3,4].map(s => (
            <div key={s} className="flex items-center">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>
                 {s}
               </div>
               {s < 4 && <div className={`w-10 md:w-16 h-1 mx-2 rounded-full ${step > s ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
            </div>
         ))}
      </div>

      <div className="flex-1 w-full">
        {step === 1 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            {orders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-amber-500 mb-3 flex items-center gap-2">
                  Oczekujące zlecenia
                </h2>
                <div className="space-y-3">
                  {orders.sort((a, b) => {
                     const pMap: Record<string, number> = { URGENT: 1, HIGH: 2, NORMAL: 3, LOW: 4 };
                     const pA = pMap[a.priority] || 3;
                     const pB = pMap[b.priority] || 3;
                     if (pA !== pB) return pA - pB;
                     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                  }).map(order => (
                    <button 
                      key={order.id}
                      onClick={() => handleAcceptOrder(order.id)}
                      className={`w-full ${order.priority === 'URGENT' ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20' : order.priority === 'HIGH' ? 'bg-orange-500/10 border-orange-500/50 hover:bg-orange-500/20' : 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20'} border text-left p-4 rounded-lg transition-all`}
                    >
                      <div className="flex justify-between items-start mb-1">
                         <div className={`font-bold text-lg ${order.priority === 'URGENT' ? 'text-red-400' : order.priority === 'HIGH' ? 'text-orange-400' : 'text-amber-400'}`}>{order.sessionType === 'TRANSPORT' ? 'Transport Kruszyw' : order.sessionType === 'MACHINE_OP' ? 'Praca Sprzętem' : 'Warsztat'}</div>
                         {order.priority === 'URGENT' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse">PILNE</span>}
                         {order.priority === 'HIGH' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">WAŻNE</span>}
                      </div>
                      <div className="text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="text-zinc-500">Maszyna:</span> {order.resourceName}
                      </div>
                      {order.sessionType === 'TRANSPORT' && (
                        <>
                          <div className="text-sm text-zinc-700 dark:text-zinc-300"><span className="text-zinc-500">Towar:</span> {order.materialName} {order.quantityTons ? `(${order.quantityTons}t)` : ''}</div>
                          <div className="text-sm text-zinc-700 dark:text-zinc-300"><span className="text-zinc-500">Klient:</span> {order.customerName}</div>
                        </>
                      )}
                      {order.taskDescription && (
                        <div className="text-sm text-zinc-700 dark:text-zinc-300 mt-2 italic">"{order.taskDescription}"</div>
                      )}
                      {order.expectedDurationHours && (
                        <div className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
                          <span className="text-zinc-500">Przewidywany czas:</span> {order.expectedDurationHours}h
                        </div>
                      )}
                      {order.creatorName && (
                        <div className="text-xs text-zinc-500 mt-2">
                          Zlecił(a): <span className="font-medium">{order.creatorName}</span>
                        </div>
                      )}
                      <div className="mt-3 text-amber-500 font-semibold text-sm">Rozpocznij to zlecenie &rarr;</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{orders.length > 0 ? "Inicjatywa własna" : "Co dzisiaj robimy?"}</h2>
            <p className="text-zinc-500 text-sm mb-6">Wybierz rodzaj zaplanowanej dla Ciebie pracy.</p>
            
            <div className="space-y-4">
              <button onClick={() => { setSessionType('TRANSPORT'); setStep(2); }} className={`w-full p-5 rounded-lg border transition-all flex items-center gap-4 ${sessionType === 'TRANSPORT' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-700'}`}>
                <div className="w-12 h-12 bg-[#f2fbfa] dark:bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                   <Truck className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-lg">Transport Kruszyw</div>
                  <div className="text-xs opacity-70 mt-0.5">Kursy wywrotką, patelnią, dostawy do klienta</div>
                </div>
              </button>

              <button onClick={() => { setSessionType('MACHINE_OP'); setStep(2); }} className={`w-full p-5 rounded-lg border transition-all flex items-center gap-4 ${sessionType === 'MACHINE_OP' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-700'}`}>
                <div className="w-12 h-12 bg-[#f2fbfa] dark:bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                   <Tractor className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-lg">Praca Sprzętem</div>
                  <div className="text-xs opacity-70 mt-0.5">Koparki, ładowarki, prace ziemne</div>
                </div>
              </button>

              <button onClick={() => { setSessionType('WORKSHOP'); setStep(2); }} className={`w-full p-5 rounded-lg border transition-all flex items-center gap-4 ${sessionType === 'WORKSHOP' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-700'}`}>
                <div className="w-12 h-12 bg-[#f2fbfa] dark:bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                   <Wrench className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-lg">Naprawy / Warsztat</div>
                  <div className="text-xs opacity-70 mt-0.5">Serwis, naprawy, prace na bazie</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Jakim sprzętem jedziesz?</h2>
            <p className="text-zinc-500 text-sm mb-6">Wybierz maszynę z floty firmowej.</p>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {machines.map(m => (
                <button 
                  key={m.id} 
                  onClick={() => { setResourceId(m.id.toString()); setStep(3); }}
                  className={`w-full p-4 rounded-lg border transition-all flex items-center gap-4 ${resourceId === m.id.toString() ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-700'}`}
                >
                  <div className="text-left w-full">
                    <div className="font-bold">{m.name}</div>
                    <div className="text-xs opacity-70 mt-1">ID: #{m.id} {m.categoryName && `• ${m.categoryName}`}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-50" />
                </button>
              ))}
              {machines.length === 0 && (
                <div className="text-center p-6 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-800">
                  Brak maszyn w bazie danych. Zgłoś problem dyspozytorowi.
                </div>
              )}
            </div>
            <div className="mt-6">
               <button onClick={() => setStep(1)} className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                 <ChevronLeft className="w-4 h-4" /> Wróć do wyboru typu
               </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            {sessionType === 'TRANSPORT' ? (
              <>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Szczegóły Transportu</h2>
                <p className="text-zinc-500 text-sm mb-6">Wybierz materiał i klienta docelowego.</p>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Jakie kruszywo ładujesz?</label>
                    <select 
                      value={materialId}
                      onChange={e => setMaterialId(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
                    >
                      <option value="" disabled>Wybierz z listy...</option>
                      {materials.map(mat => (
                        <option key={mat.id} value={mat.id}>{mat.name} ({mat.type})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Dla kogo jest ten kurs?</label>
                    <select 
                      value={customerId}
                      onChange={e => setCustomerId(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
                    >
                      <option value="" disabled>Wybierz klienta...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.firstName ? `${c.firstName} ` : ''}{c.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Zadanie / Cel Pracy</h2>
                <p className="text-zinc-500 text-sm mb-6">Napisz krótko co będziesz robił.</p>

                <textarea 
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="Np. Wymiana filtrów w koparce, Wykop pod fundamenty itp."
                  className="w-full h-40 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                />
              </>
            )}

            <div className="mt-8 flex items-center justify-between">
               <button onClick={() => setStep(2)} className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                 <ChevronLeft className="w-4 h-4" /> Wróć
               </button>
               <button 
                 disabled={sessionType === 'TRANSPORT' ? (!materialId || !customerId) : !taskDescription}
                 onClick={() => setStep(4)} 
                 className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
               >
                 Dalej <ChevronRight className="w-5 h-5" />
               </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
               <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 text-center">Wszystko gotowe</h2>
            <p className="text-zinc-500 text-sm mb-8 text-center">
              Podsumowanie nowej sesji. Sprawdź czy wszystko się zgadza.
            </p>

            <div className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 space-y-3 mb-10">
               <div className="flex justify-between">
                 <span className="text-zinc-500 text-sm">Typ Pracy:</span>
                 <span className="text-white font-medium">{sessionType === 'TRANSPORT' ? 'Transport' : sessionType === 'MACHINE_OP' ? 'Praca Maszyną' : 'Warsztat'}</span>
               </div>
               <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
                 <span className="text-zinc-500 text-sm">Maszyna:</span>
                 <span className="text-white font-medium">{machines.find(m => m.id.toString() === resourceId)?.name}</span>
               </div>
               {sessionType === 'TRANSPORT' && (
                 <>
                   <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
                     <span className="text-zinc-500 text-sm">Kruszywo:</span>
                     <span className="text-white font-medium truncate max-w-[150px] text-right">{materials.find(m => m.id.toString() === materialId)?.name}</span>
                   </div>
                   <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-3">
                     <span className="text-zinc-500 text-sm">Klient:</span>
                     <span className="text-white font-medium truncate max-w-[150px] text-right">{customers.find(m => m.id.toString() === customerId)?.lastName}</span>
                   </div>
                 </>
               )}
            </div>

            <button 
              disabled={isLoading}
              onClick={handleStart} 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-lg font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Start Pracy"}
            </button>
            
            <button onClick={() => setStep(3)} className="mt-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                 <ChevronLeft className="w-4 h-4" /> Popraw Dane
            </button>
          </div>
        )}
      </div>
    </div>
  );
}





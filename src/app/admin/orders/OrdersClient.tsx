"use client";

import { useState, useEffect } from "react";
import { Map, Plus, X, Search, RefreshCw, Settings, Loader2 } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { getDictionary } from "@/i18n";
import SessionDetailsModal from "./SessionDetailsModal";
import SettingsForm from "../settings/SettingsForm";

export default function OrdersClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [workers, setWorkers] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsData, setSettingsData] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dictionary = getDictionary();
  const dict = dictionary.admin.orders;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [form, setForm] = useState({
    userId: '',
    resourceId: '',
    sessionType: 'TRANSPORT',
    materialId: '',
    customerId: '',
    taskDescription: '',
    quantityTons: '',
    priority: 'NORMAL',
    expectedDurationHours: '',
    dueDate: '',
    forceSave: false
  });

  const fetchData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [wor, mac, mat, cus, ords, arch] = await Promise.all([
        fetch("/api/workers", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/machines", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/materials", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/customers", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/admin/work-orders", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/admin/archive", { cache: "no-store" }).then(r => r.json())
      ]);
      setWorkers(Array.isArray(wor) ? wor : []);
      setMachines(Array.isArray(mac) ? mac : []);
      setMaterials(Array.isArray(mat) ? mat : []);
      setCustomers(Array.isArray(cus) ? cus : []);
      setOrders(Array.isArray(ords) ? ords : []);
      setSessions(Array.isArray(arch) ? arch : []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  useEffect(() => {
    const openIdStr = searchParams.get('open');
    if (openIdStr && !isLoading && (orders.length > 0 || sessions.length > 0)) {
      const openId = parseInt(openIdStr);
      const order = orders.find(o => o.id === openId);
      if (order) {
        handleEditClick(order);
      } else {
        const session = sessions.find(s => s.workOrderId === openId || s.id === openId);
        if (session) {
          setSelectedItem(session);
        }
      }
      // Remove query param to prevent reopening on polling
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, orders, sessions, isLoading, router, pathname]);

  const formatToLocalDatetime = (dateString: string | null) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleEditClick = (item: any) => {
    setEditingOrderId(item.workOrderId || item.id);
    setForm({
      userId: item.userId?.toString() || '',
      resourceId: item.resourceId?.toString() || '',
      sessionType: item.sessionType || 'TRANSPORT',
      materialId: item.materialId?.toString() || '',
      customerId: item.customerId?.toString() || '',
      taskDescription: item.taskDescription || '',
      quantityTons: item.quantityTons?.toString() || '',
      priority: item.priority || 'NORMAL',
      expectedDurationHours: item.expectedDurationHours?.toString() || '',
      dueDate: formatToLocalDatetime(item.dueDate),
      forceSave: false
    });
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingOrderId ? `/api/admin/work-orders/${editingOrderId}` : "/api/admin/work-orders";
      const method = editingOrderId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert(dict.success);
        setIsModalOpen(false);
        setEditingOrderId(null);
        fetchData(true);
        setForm({
          userId: '',
          resourceId: '',
          sessionType: 'TRANSPORT',
          materialId: '',
          customerId: '',
          taskDescription: '',
          quantityTons: '',
          priority: 'NORMAL',
          expectedDurationHours: '',
          dueDate: '',
          forceSave: false
        });
      } else {
        const data = await res.json();
        alert(apiErrors[data.error] || data.error || dict.error);
      }
    } catch (err) {
      alert(dict.networkError);
    }
    setIsSubmitting(false);
  };

  const unifiedItems = [
    ...orders.map(o => ({
      ...o,
      _type: 'ORDER',
      _sortDate: new Date(o.createdAt).getTime(),
      _statusGroup: o.status === 'PENDING' ? 1 : 2
    })),
    ...sessions.map(s => ({
      ...s,
      _type: 'SESSION',
      _sortDate: new Date(s.startTime).getTime(),
      _statusGroup: s.status === 'IN_PROGRESS' ? 1 : 2
    }))
  ]
    .filter(item =>
      (item.workerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (item.resourceName?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a._statusGroup !== b._statusGroup) return a._statusGroup - b._statusGroup;
      return b._sortDate - a._sortDate;
    });

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2"><Map className="w-6 h-6 text-emerald-500" /> {dict.title}</h1>
          <p className="text-zinc-500 mt-1">{dict.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
             setIsSettingsOpen(true);
             try {
               const res = await fetch('/api/settings');
               if(res.ok) setSettingsData(await res.json());
             } catch(e) {}
          }} className="p-2.5 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition active:scale-95" title="Ustawienia systemu">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={() => fetchData(true)} className="p-2.5 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition active:scale-95" title="Odśwież ręcznie">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> {dict.newOrder}
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-y-auto">
             <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
               <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-zinc-500" /> Ustawienia Systemu</h2>
               <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full"><X className="w-5 h-5" /></button>
             </div>
             <div className="p-2">
               {settingsData ? <SettingsForm initialData={settingsData} mode="orders" /> : <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500"/></div>}
             </div>
          </div>
        </div>
      )}

      {/* Gantt removed and moved to dashboard */}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-4 bg-zinc-50 dark:bg-[#0a0a0b]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj zleceń i historii..."
              className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0a0a0b]">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.workerDate}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{getDictionary().admin.archive.machine}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Zadanie / Termin</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">{getDictionary().admin.archive.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">{dict.fetching}</td></tr>
              ) : unifiedItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Map className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                      <h3 className="text-zinc-900 dark:text-zinc-300 font-medium">Brak zleceń</h3>
                      <p className="text-zinc-500 text-sm mt-2 max-w-md">Nie znaleziono żadnych oczekujących, ani archiwalnych zleceń pasujących do wyszukiwania.</p>
                    </div>
                  </td>
                </tr>
              ) : unifiedItems.map(item => {
                const isWorking = item.status === 'IN_PROGRESS';
                let progress = 0;
                if (isWorking && item._sortDate) {
                  const start = new Date(item._sortDate).getTime();
                  const now = Date.now();
                  const elapsedMs = now - start;
                  const expectedMs = (item.expectedDurationHours || 8) * 60 * 60 * 1000;
                  progress = Math.min(100, Math.round((elapsedMs / expectedMs) * 100));
                }
                return (
                  <tr key={`${item._type}-${item.id}`} onClick={() => setSelectedItem(item)} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer relative group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 mr-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                          #{item.workOrderId || item.id}
                        </div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-200">{item.workerName}</div>
                        {item._type === 'ORDER' && item.priority === 'HIGH' && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mt-1">
                            <div className="w-2 h-2 rounded-sm bg-red-500 shadow-sm shrink-0" />
                            <span className="text-[10px] font-bold text-red-700 dark:text-red-400">WAŻNY</span>
                          </div>
                        )}
                        {item._type === 'ORDER' && (!item.priority || item.priority === 'NORMAL') && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 mt-1">
                            <div className="w-2 h-2 rounded-sm bg-orange-500 shadow-sm shrink-0" />
                            <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">NORMALNY</span>
                          </div>
                        )}
                        {item._type === 'ORDER' && item.priority === 'LOW' && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mt-1">
                            <div className="w-2 h-2 rounded-sm bg-emerald-500 shadow-sm shrink-0" />
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">NISKI</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {item._type === 'ORDER'
                          ? `${new Date(item.createdAt).toLocaleDateString('pl-PL')} ${new Date(item.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
                          : `${new Date(item.startTime).toLocaleDateString('pl-PL')} ${new Date(item.startTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
                        }
                        {item.endTime && ` - ${new Date(item.endTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                      {item.creatorName && (
                        <div className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">
                          {dict.orderedBy} <span className="font-medium text-zinc-500">{item.creatorName}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                      {item.resourceName || 'Brak'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-900 dark:text-zinc-200">
                        {item.sessionType === 'TRANSPORT' ? getDictionary().admin.archive.transport : (item.sessionType === 'MACHINE_OP' ? getDictionary().admin.archive.machineOp : getDictionary().admin.archive.workshop)}
                      </div>
                      {item.sessionType === 'TRANSPORT' && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {item.materialName} {item.quantityTons ? `(${item.quantityTons}t)` : ''} → {item.customerLastName} {item.customerFirstName}
                        </div>
                      )}
                      {item.sessionType !== 'TRANSPORT' && item.taskDescription && (
                        <div className="text-xs text-zinc-500 mt-0.5 max-w-xs truncate" title={item.taskDescription}>
                          {item.taskDescription}
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5 mt-2">
                        {/* Wiersz 1: Planowane (jeśli istnieją) */}
                        {(item.expectedDurationHours || item.dueDate) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.expectedDurationHours && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 inline-block px-1.5 py-0.5 rounded">
                                Szacowany czas: {item.expectedDurationHours}h
                              </div>
                            )}
                            {item.dueDate && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-500/10 inline-block px-1.5 py-0.5 rounded">
                                Termin: {new Date(item.dueDate).toLocaleDateString('pl-PL')} {new Date(item.dueDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Wiersz 2: Rzeczywiste (dla zakończonych) */}
                        {item.status === 'COMPLETED' && item.startTime && item.endTime && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded">
                              Start: {new Date(item.startTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 inline-block px-1.5 py-0.5 rounded">
                              Koniec: {new Date(item.endTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-500/20 inline-block px-1.5 py-0.5 rounded">
                              Czas łączny: {(() => {
                                const diff = new Date(item.endTime).getTime() - new Date(item.startTime).getTime();
                                const h = Math.floor(diff / (1000 * 60 * 60));
                                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                return `${h}h ${m}m`;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${item.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20' : item.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20'}`}>
                          {item.status === 'PENDING' ? dict.pending : item.status === 'IN_PROGRESS' ? getDictionary().admin.archive.inProgress : getDictionary().admin.archive.completed}
                        </span>
                        {isWorking && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                              <span>Postęp czasu</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 relative"
                                style={{ width: `${Math.max(5, progress)}%` }}>
                                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setEditingOrderId(null); }}></div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-xl rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80 sticky top-0">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{editingOrderId ? `Edytuj zlecenie #${editingOrderId}` : dict.issueOrder}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingOrderId(null); }} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-500">{dict.chooseWorker}</label>
                <select required value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                  <option value="" disabled>{dict.chooseFromList}</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{dict.jobType}</label>
                <select required value={form.sessionType} onChange={e => setForm({ ...form, sessionType: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                  <option value="TRANSPORT">{dict.transportType}</option>
                  <option value="MACHINE_OP">{dict.machineType}</option>
                  <option value="WORKSHOP">{dict.workshopType}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{dict.chooseMachine}</label>
                <select required value={form.resourceId} onChange={e => setForm({ ...form, resourceId: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                  <option value="" disabled>{dict.chooseMachine}...</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              {form.sessionType === 'TRANSPORT' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">{dict.chooseMaterial}</label>
                    <select required value={form.materialId} onChange={e => setForm({ ...form, materialId: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                      <option value="" disabled>{dict.chooseMaterial}...</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">{dict.chooseCustomer}</label>
                    <select required value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none">
                      <option value="" disabled>{dict.chooseCustomer}...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.lastName} {c.firstName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Ilość kruszywa (tony)</label>
                    <input type="number" step="0.01" placeholder="np. 20.5" value={form.quantityTons} onChange={e => setForm({ ...form, quantityTons: e.target.value })} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
                  </div>
                </>
              )}

              {form.sessionType !== 'TRANSPORT' && (
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
      )}

      {selectedItem && (
        <SessionDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} onEdit={handleEditClick} />
      )}
    </>
  );
}







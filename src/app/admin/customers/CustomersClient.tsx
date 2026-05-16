"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Package, Plus, Edit2, MapPin } from "lucide-react";
import { formatDict, getDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { narrowAdminCustomerRows, type AdminCustomerListRow } from "@/lib/narrowApiListRows";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import dynamic from "next/dynamic";

function CustomerMapPickerLoading() {
  return (
    <div className="w-full h-[250px] bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500">
      {getDictionary().admin.customers.mapLoading}
    </div>
  );
}

import { CustomerLocationsPanel } from "./CustomerLocationsPanel";

const CustomerMapPicker = dynamic(() => import("./CustomerMapPicker"), {
  ssr: false,
  loading: CustomerMapPickerLoading,
});

type Customer = AdminCustomerListRow;

export default function CustomersClient() {
  const { canMutate } = useAdminAbility();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', defaultAddress: '', latitude: '', longitude: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dictionary = getDictionary();
  const dict = dictionary.admin.customers;
  const machinesDict = dictionary.admin.machines;
  const ordersDict = dictionary.admin.orders;
  const pageTitle = dictionary.admin.sidebar.customers;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry("Admin customers: list", "/api/customers", { cache: "no-store" }, {
        category: "admin",
      });
      const data = await parseJsonArray(res);
      setCustomers(narrowAdminCustomerRows(data));
    } catch {
      /* sieć */
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
    });
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const url = editId ? `/api/customers/${editId}` : "/api/customers";
    const method = editId ? "PUT" : "POST";
    try {
      const res = await fetchWithDeviceTelemetry(
        editId ? `Admin customers: save PUT ${editId}` : "Admin customers: save POST",
        url,
        { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
        { category: "admin" },
      );
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const body = await parseJsonUnknown(res);
        const err = readApiErrorString(body);
        alert(apiErrors[err ?? ""] ?? err ?? machinesDict.apiError);
      }
    } catch {
      alert(machinesDict.apiError);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
     if(!confirm(dict.confirmDelete)) return;
     const res = await fetchWithDeviceTelemetry(
       `Admin customers: delete ${id}`,
       `/api/customers/${id}`,
       { method: "DELETE" },
       { category: "admin" },
     );
     if (res.ok) fetchData();
     else {
       const body = await parseJsonUnknown(res);
       const err = readApiErrorString(body);
       alert(apiErrors[err ?? ""] ?? err ?? machinesDict.apiError);
     }
  };

  const openNewModal = () => {
    setEditId(null);
    setForm({ firstName: '', lastName: '', defaultAddress: '', latitude: '', longitude: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditId(customer.id);
    setForm({ 
      firstName: customer.firstName || '', 
      lastName: customer.lastName, 
      defaultAddress: customer.defaultAddress || '',
      latitude: customer.latitude || '',
      longitude: customer.longitude || ''
    });
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2"><Package className="w-6 h-6 text-emerald-500" /> {pageTitle}</h1>
          <p className="text-zinc-500 mt-1">{dict.subtitle}</p>
        </div>
        {canMutate && (
        <button onClick={openNewModal} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> {dict.addCustomer}
        </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead>
               <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-[#0a0a0b]/80">
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.customerData}</th>
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.defaultAddress}</th>
                 {canMutate && (
                 <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">{machinesDict.management}</th>
                 )}
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-800/50">
               {isLoading ? (
                 <tr><td colSpan={canMutate ? 3 : 2} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">{dict.fetching}</td></tr>
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
                       <span className="text-zinc-600 italic text-xs">{dict.noAddress}</span>
                     )}
                   </td>
                   {canMutate && (
                   <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-1">
                        <button onClick={() => openEditModal(customer)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition" title={machinesDict.editTitle}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(customer.id)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title={machinesDict.deleteTitle}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </td>
                   )}
                 </tr>
               ))}
               {!isLoading && customers.length === 0 && (
                 <tr><td colSpan={canMutate ? 3 : 2} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">{dict.noCustomers}</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      <AdminModalShell
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editId ? dict.modalEditTitle : dict.modalCreateTitle}
        maxWidthClass={editId ? "max-w-3xl" : "max-w-lg"}
        titleSize="lg"
      >
              <form onSubmit={handleSave} className="p-6 space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-zinc-400">{dict.firstNameLabel}</label>
                     <input type="text" placeholder={dict.firstNamePlaceholder} value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-sm font-medium text-zinc-400">{dict.lastNameLabel}</label>
                     <input required type="text" placeholder={dict.lastNamePlaceholder} value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none" />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">{dict.addressLabel}</label>
                   <input type="text" placeholder={dict.addressPlaceholder} value={form.defaultAddress} onChange={e => setForm({...form, defaultAddress: e.target.value})} className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-400">{dict.gpsOnMapLabel}</label>
                   <CustomerMapPicker
                     lat={form.latitude}
                     lng={form.longitude}
                     address={form.defaultAddress}
                     onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
                   />
                   {(form.latitude && form.longitude) && (
                     <div className="text-[10px] text-emerald-500">
                       {formatDict(dict.pinSaved, {
                         lat: parseFloat(form.latitude).toFixed(5),
                         lng: parseFloat(form.longitude).toFixed(5),
                       })}
                     </div>
                   )}
                 </div>

                 {editId ? <CustomerLocationsPanel customerId={editId} /> : null}

                 <div className="pt-4 border-t border-zinc-800">
                    <button disabled={isSubmitting} type="submit" className="w-full bg-indigo-600 text-zinc-900 dark:text-white font-bold py-3 rounded-lg hover:bg-indigo-500 transition active:scale-[0.98] shadow-sm disabled:opacity-50">
                       {isSubmitting ? ordersDict.saving : editId ? dict.save : dict.create}
                    </button>
                 </div>
              </form>
      </AdminModalShell>
    </>
  )
}








"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Package, Plus, MapPin } from "lucide-react";
import { getDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { narrowAdminCustomerRows, type AdminCustomerListRow } from "@/lib/narrowApiListRows";
import { matchesCustomerSearch } from "@/lib/customerSearch";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { CustomerInlineCreateForm } from "@/components/customers/CustomerInlineCreateForm";
import { FormModalFooter } from "@/components/FormModalFooter";
import CustomersTable from "./CustomersTable";
import CustomerFormFields, { emptyCustomerForm, type CustomerFormState } from "./CustomerFormFields";

type Customer = AdminCustomerListRow;

export default function CustomersClient() {
  const { canMutate } = useAdminAbility();
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dictionary = getDictionary();
  const dict = dictionary.admin.customers;
  const machinesDict = dictionary.admin.machines;
  const ordersDict = dictionary.admin.orders;
  const pageTitle = dictionary.admin.sidebar.customers;
  const ui = dictionary.admin.ui;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const customerFormId = "admin-customer-form";

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

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return customers;
    return customers.filter((c) => matchesCustomerSearch(c, q));
  }, [customers, searchQuery]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setIsSubmitting(true);
    const url = `/api/customers/${editId}`;
    try {
      const res = await fetchWithDeviceTelemetry(
        `Admin customers: save PUT ${editId}`,
        url,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
        { category: "admin" },
      );
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const body = await parseJsonUnknown(res);
        const err = readApiErrorString(body);
        await appAlert({ message: appDialogApiMessage(apiErrors, err, machinesDict.apiError) });
      }
    } catch {
      await appAlert({ message: machinesDict.apiError });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
     if (!(await appConfirm({ message: dict.confirmDelete, variant: "danger" }))) return;
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
       await appAlert({ message: appDialogApiMessage(apiErrors, err, machinesDict.apiError) });
     }
  };

  const openNewModal = () => {
    setEditId(null);
    setCreateFormKey((k) => k + 1);
    setIsModalOpen(true);
  };

  const openPreview = (customer: Customer) => {
    setPreviewCustomer(customer);
  };

  const openEditModal = (customer: Customer) => {
    setPreviewCustomer(null);
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
        </div>
        {canMutate && (
        <button onClick={openNewModal} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> {dict.addCustomer}
        </button>
        )}
      </div>

      <CustomersTable
        customers={customers}
        filteredCustomers={filteredCustomers}
        searchQuery={searchQuery}
        isLoading={isLoading}
        canMutate={canMutate}
        onSearchChange={setSearchQuery}
        onPreview={openPreview}
        onEdit={openEditModal}
        onDelete={handleDelete}
        dict={dict}
        machinesDict={machinesDict}
      />

      <AdminModalShell
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editId ? dict.modalEditTitle : dict.modalCreateTitle}
        maxWidthClass={editId ? "max-w-3xl" : "max-w-lg"}
        titleSize="lg"
        scrollableBody
        closeOnBackdropClick={false}
        footer={
          editId ? (
            <FormModalFooter
              formId={customerFormId}
              onCancel={() => setIsModalOpen(false)}
              submitLabel={isSubmitting ? ordersDict.saving : dict.save}
              isSubmitting={isSubmitting}
            />
          ) : undefined
        }
      >
        {!editId ? (
          <div className="p-6">
            <CustomerInlineCreateForm
              key={createFormKey}
              onCreated={() => {
                setIsModalOpen(false);
                void fetchData();
              }}
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        ) : (
          <form id={customerFormId} onSubmit={handleSave}>
            <CustomerFormFields
              form={form}
              editId={editId}
              onFormChange={setForm}
              dict={dict}
            />
          </form>
        )}
      </AdminModalShell>

      <AdminPreviewModal
        open={previewCustomer != null}
        onClose={() => setPreviewCustomer(null)}
        title={ui.previewTitle}
        canEdit={canMutate}
        onEdit={
          previewCustomer
            ? () => {
                openEditModal(previewCustomer);
              }
            : undefined
        }
        editLabel={machinesDict.editTitle}
        maxWidthClass="max-w-lg"
      >
        {previewCustomer ? (
          <>
            <AdminPreviewField
              label={dict.customerData}
              value={
                previewCustomer.firstName
                  ? `${previewCustomer.firstName} ${previewCustomer.lastName}`
                  : previewCustomer.lastName
              }
            />
            <AdminPreviewField label="ID" value={`#${previewCustomer.id}`} />
            <AdminPreviewField label={dict.defaultAddress}>
              {previewCustomer.defaultAddress ? (
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                  {previewCustomer.defaultAddress}
                </span>
              ) : (
                <span className="italic text-zinc-500">{dict.noAddress}</span>
              )}
            </AdminPreviewField>
          </>
        ) : null}
      </AdminPreviewModal>
    </>
  )
}

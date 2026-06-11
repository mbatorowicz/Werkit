"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Package, Plus } from "lucide-react";
import { useDictionary } from "@/i18n";
import { CustomerContactFields } from "@/components/customers/CustomerContactFields";
import { buildOrderLabelCustomerDisplay } from "@/lib/orderLabelCustomerDisplay";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { narrowAdminCustomerRows, type AdminCustomerListRow } from "@/lib/narrowApiListRows";
import { matchesCustomerSearch } from "@/lib/customerSearch";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { CustomerInlineCreateForm } from "@/components/customers/CustomerInlineCreateForm";
import { FormModalFooter } from "@/components/FormModalFooter";
import CustomersTable from "./CustomersTable";
import CustomerFormFields, {
  emptyCustomerForm,
  type CustomerFormState,
} from "./CustomerFormFields";
import { customerFormFromStored, customerFormToApiBody } from "./customerFormApi";

type Customer = AdminCustomerListRow;

function CustomerPreviewFields({
  customer,
  dict,
}: {
  customer: Customer;
  dict: Record<string, string>;
}) {
  const customerDisplay = buildOrderLabelCustomerDisplay({
    customerFirstName: customer.firstName,
    customerLastName: customer.lastName,
    customerPhone: customer.phone,
    customerAddress: customer.defaultAddress,
  });

  return (
    <>
      <AdminPreviewField label="ID" value={`#${customer.id}`} />
      <CustomerContactFields
        variant="admin"
        labels={{
          customer: dict.customerData,
          streetLabel: dict.streetLabel,
          postalCodeLabel: dict.postalCodeLabel,
          cityLabel: dict.cityLabel,
          phoneLabel: dict.phoneLabel,
          defaultAddressLabel: dict.defaultAddress,
          noAddressValue: dict.noAddress,
        }}
        customerName={customerDisplay.customerName}
        phone={customerDisplay.customerPhone}
        addressParts={customerDisplay.addressParts}
      />
    </>
  );
}

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
  const dictionary = useDictionary();
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
      const res = await fetchWithDeviceTelemetry(
        "Admin customers: list",
        "/api/customers",
        { cache: "no-store" },
        {
          category: "admin",
        }
      );
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
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(customerFormToApiBody(form)),
        },
        { category: "admin" }
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
      { category: "admin" }
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
    setForm(
      customerFormFromStored({
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        defaultAddress: customer.defaultAddress,
        latitude: customer.latitude,
        longitude: customer.longitude,
      })
    );
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-500" /> {pageTitle}
          </h1>
        </div>
        {canMutate && (
          <button
            onClick={openNewModal}
            className={cn("flex items-center gap-2", BTN_PRIMARY_COMPACT)}
          >
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
            <CustomerFormFields form={form} editId={editId} onFormChange={setForm} dict={dict} />
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
        {previewCustomer ? <CustomerPreviewFields customer={previewCustomer} dict={dict} /> : null}
      </AdminPreviewModal>
    </>
  );
}

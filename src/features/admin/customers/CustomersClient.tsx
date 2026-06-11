"use client";

import { Package, Plus } from "lucide-react";
import { useDictionary } from "@/i18n";
import { CustomerContactFields } from "@/components/customers/CustomerContactFields";
import { buildOrderLabelCustomerDisplay } from "@/lib/orderLabelCustomerDisplay";
import type { AdminCustomerListRow } from "@/lib/narrowApiListRows";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { CustomerInlineCreateForm } from "@/components/customers/CustomerInlineCreateForm";
import { FormModalFooter } from "@/components/FormModalFooter";
import CustomersTable from "./CustomersTable";
import CustomerFormFields from "./CustomerFormFields";
import { useCustomersClient } from "./useCustomersClient";

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
  const {
    customers,
    searchQuery,
    setSearchQuery,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    previewCustomer,
    setPreviewCustomer,
    editId,
    createFormKey,
    form,
    setForm,
    isSubmitting,
    filteredCustomers,
    fetchData,
    handleSave,
    handleDelete,
    openNewModal,
    openPreview,
    openEditModal,
  } = useCustomersClient();
  const dictionary = useDictionary();
  const dict = dictionary.admin.customers;
  const machinesDict = dictionary.admin.machines;
  const ordersDict = dictionary.admin.orders;
  const pageTitle = dictionary.admin.sidebar.customers;
  const ui = dictionary.admin.ui;
  const customerFormId = "admin-customer-form";

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

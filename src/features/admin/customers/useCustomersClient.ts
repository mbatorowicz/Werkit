"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { narrowAdminCustomerRows, type AdminCustomerListRow } from "@/lib/narrowApiListRows";
import { matchesCustomerSearch } from "@/lib/customerSearch";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { emptyCustomerForm, type CustomerFormState } from "./CustomerFormFields";
import { customerFormFromStored, customerFormToApiBody } from "./customerFormApi";

type Customer = AdminCustomerListRow;

export function useCustomersClient() {
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
  const apiErrors = dictionary.apiErrors as Record<string, string>;

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

  const handleSave = async (e: FormEvent) => {
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

  return {
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
  };
}

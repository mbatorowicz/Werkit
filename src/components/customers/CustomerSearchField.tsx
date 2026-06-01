"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  AdminSearchCombobox,
  type AdminSearchComboboxOption,
} from "@/components/Admin/AdminSearchCombobox";
import { CustomerInlineCreateForm } from "@/components/customers/CustomerInlineCreateForm";
import {
  buildCustomerSearchText,
  formatCustomerDisplayAddress,
  formatCustomerLabel,
  matchesCustomerSearch,
} from "@/lib/customerSearch";
import type { BaseCustomer } from "@/types/admin";

export type CustomerSearchFieldDict = {
  searchPlaceholder: string;
  searchNoResults: string;
  searchClear: string;
  addCustomerInline: string;
};

type CustomerSearchFieldProps = {
  label: string;
  customers: BaseCustomer[];
  value: string;
  onChange: (customerId: string) => void;
  onCustomerCreated?: (customer: BaseCustomer) => void;
  required?: boolean;
  disabled?: boolean;
  /** Gdy false — tylko wybór z listy (bez formularza dodawania). */
  canCreate?: boolean;
  dict: CustomerSearchFieldDict;
  /** Kategoria logów urządzenia przy POST /api/customers. */
  telemetryCategory?: "admin" | "lifecycle";
};

export function CustomerSearchField({
  label,
  customers,
  value,
  onChange,
  onCustomerCreated,
  required = false,
  disabled = false,
  canCreate = true,
  dict,
  telemetryCategory = "admin",
}: CustomerSearchFieldProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");

  const options: AdminSearchComboboxOption[] = useMemo(
    () =>
      customers.map((c) => ({
        id: String(c.id),
        label: formatCustomerLabel(c),
        sublabel: formatCustomerDisplayAddress(c),
        searchText: buildCustomerSearchText(c),
      })),
    [customers]
  );

  const openCreateForm = useCallback(() => {
    setShowCreate(true);
  }, []);

  const trimmedQuery = pendingQuery.trim();
  const hasMatches =
    trimmedQuery.length > 0 && customers.some((c) => matchesCustomerSearch(c, pendingQuery));
  const createEnabled = canCreate && !disabled;
  const showAddButton = createEnabled && !showCreate && trimmedQuery.length > 0 && !hasMatches;

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </label>
      <AdminSearchCombobox
        options={options}
        value={value}
        onChange={onChange}
        onQueryChange={setPendingQuery}
        placeholder={dict.searchPlaceholder}
        disabled={disabled}
        required={required}
        noResultsLabel={dict.searchNoResults}
        clearAriaLabel={dict.searchClear}
        aria-label={label}
        emptyAction={
          createEnabled && !showCreate
            ? {
                label: dict.addCustomerInline,
                onClick: openCreateForm,
              }
            : undefined
        }
      />
      {showAddButton ? (
        <button
          type="button"
          onClick={openCreateForm}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/80 px-3 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          {dict.addCustomerInline}
        </button>
      ) : null}
      {createEnabled && showCreate ? (
        <CustomerInlineCreateForm
          initialLastName={trimmedQuery}
          onCancel={() => setShowCreate(false)}
          telemetryCategory={telemetryCategory}
          onCreated={(customer) => {
            onCustomerCreated?.(customer);
            onChange(String(customer.id));
            setShowCreate(false);
            setPendingQuery("");
          }}
        />
      ) : null}
    </div>
  );
}

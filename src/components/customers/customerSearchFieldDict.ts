import type { CustomerSearchFieldDict } from "@/components/customers/CustomerSearchField";

/** Słownik pól wyszukiwania klienta z worker wizard. */
export function workerCustomerSearchFieldDict(dict: {
  wizardCustomerPlaceholder: string;
  searchNoResults: string;
  searchClear: string;
  addCustomerInline: string;
}): CustomerSearchFieldDict {
  return {
    searchPlaceholder: dict.wizardCustomerPlaceholder,
    searchNoResults: dict.searchNoResults,
    searchClear: dict.searchClear,
    addCustomerInline: dict.addCustomerInline,
  };
}

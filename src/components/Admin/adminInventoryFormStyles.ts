import { SEARCH_FIELD_INPUT_CLASS } from "@/components/searchFieldStyles";

/** Wspólny układ pól formularza katalogu magazynowego (materiały + części DUR). */
export const INVENTORY_FORM_STACK = "space-y-5";
export const INVENTORY_FORM_FIELD = "space-y-1.5";
export const INVENTORY_FORM_LABEL = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";
export const INVENTORY_FORM_LABEL_REQUIRED = `${INVENTORY_FORM_LABEL} after:ml-0.5 after:text-red-500 after:content-['*']`;
export const INVENTORY_FORM_HINT = "text-[11px] text-zinc-500 dark:text-zinc-400";
export const INVENTORY_FORM_GRID_2 = "grid grid-cols-1 gap-4 sm:grid-cols-2";
export const INVENTORY_FORM_CONTROL = SEARCH_FIELD_INPUT_CLASS;
export const INVENTORY_FORM_TEXTAREA = `${INVENTORY_FORM_CONTROL} min-h-[5.5rem] resize-none py-3`;

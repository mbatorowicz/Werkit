import { FIELD_HINT, FIELD_LABEL, FIELD_LABEL_REQUIRED, FIELD_STACK } from "@/lib/uiTypography";
import { INPUT_BASE, TEXTAREA_BASE } from "@/lib/uiTokens";

/** Wspólny układ pól formularza katalogu magazynowego (materiały + części DUR). */
export const INVENTORY_FORM_STACK = "space-y-5";
export const INVENTORY_FORM_FIELD = FIELD_STACK;
export const INVENTORY_FORM_LABEL = FIELD_LABEL;
export const INVENTORY_FORM_LABEL_REQUIRED = FIELD_LABEL_REQUIRED;
export const INVENTORY_FORM_HINT = FIELD_HINT;
export const INVENTORY_FORM_GRID_2 = "grid grid-cols-1 gap-4 sm:grid-cols-2";
export const INVENTORY_FORM_CONTROL = INPUT_BASE;
export const INVENTORY_FORM_TEXTAREA = TEXTAREA_BASE;

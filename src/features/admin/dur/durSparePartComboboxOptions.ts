import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import type { DurSparePartCatalogItem } from "@/features/admin/dur/useDurSparePartCatalog";

/** Opcje comboboxa części z podpisem stanu magazynowego. */
export function durSparePartComboboxOptions(
  items: DurSparePartCatalogItem[],
  stockSublabel: string
): AdminSearchComboboxOption[] {
  return items.map((p) => {
    const stockText = stockSublabel
      .replace("{qty}", p.stockQuantity)
      .replace("{unit}", p.unit);
    return {
      id: String(p.id),
      label: p.name,
      sublabel: p.catalogNumber ? `${p.catalogNumber} · ${stockText}` : stockText,
      searchText: `${p.name} ${p.catalogNumber}`,
    };
  });
}

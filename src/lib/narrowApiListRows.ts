/**
 * @deprecated Importuj z `@/lib/narrow` zamiast `@/lib/narrowApiListRows`.
 * Ten plik pozostaje dla kompatybilności wstecznej.
 */

export {
  isRecord,
  narrowNumberArray,
  narrowStringArray,
  readBool,
  narrowPriority,
  narrowBaseWorkers,
  narrowBaseMachines,
  narrowBaseMaterials,
  narrowBaseCustomers,
  narrowBaseCategories,
  narrowAdminUserRows,
  narrowAdminCustomerRows,
  narrowUnifiedGanttItems,
  narrowWorkOrders,
  narrowWizardCategories,
  narrowWizardMachines,
  narrowWizardMaterials,
  narrowWizardCustomers,
  narrowMachinesResourceRows,
  narrowMachinesCategoryRows,
  narrowMaterialRowRows,
  narrowMaterialCategoryRows,
  type AdminUserListRow,
  type AdminCustomerListRow,
} from "@/lib/narrow";

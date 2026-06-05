/**
 * Zbiór zawężaczy typów (`narrow*`) do bezpiecznego parsowania odpowiedzi API.
 *
 * Podział według domen:
 * - `shared` – helpery ogólne (`isRecord`, `readBool`, itp.)
 * - `base` – typy bazowe (worker, machine, material, customer, category)
 * - `admin` – panel admina (użytkownicy, klienci, Gantt)
 * - `worker` – moduł pracownika (zlecenia, wizard)
 * - `machines` – moduł maszyn i materiałów
 */

export { isRecord, narrowNumberArray, narrowStringArray, readBool, narrowPriority } from "./shared";

export {
  narrowBaseWorkers,
  narrowBaseMachines,
  narrowBaseMaterials,
  narrowBaseCustomers,
  narrowBaseCategories,
} from "./base";

export {
  narrowAdminUserRows,
  narrowAdminCustomerRows,
  narrowUnifiedGanttItems,
  type AdminUserListRow,
  type AdminCustomerListRow,
} from "./admin";

export {
  narrowWorkOrders,
  narrowWizardCategories,
  narrowWizardMachines,
  narrowWizardMaterials,
  narrowWizardCustomers,
} from "./worker";

export {
  narrowMachinesResourceRows,
  narrowMachinesCategoryRows,
  narrowMaterialRowRows,
  narrowMaterialCategoryRows,
} from "./machines";

export {
  narrowOrganizationDepartments,
  narrowOrganizationTeams,
  narrowOrganizationTeamDetail,
  narrowUserOrgProfile,
  narrowDelegatableWorkers,
  type OrganizationDepartmentRow,
  type OrganizationTeamRow,
  type OrganizationTeamMemberRow,
  type OrganizationTeamDetail,
} from "./organization";

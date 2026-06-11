import type {
  AdminDispatchBootstrap,
  BaseCategory,
  BaseCustomer,
  BaseMachine,
  BaseMaterial,
  BaseMaterialCategory,
  BaseWorker,
  UnifiedGanttItem,
} from "@/types/admin";
import { narrowOrderType } from "@/lib/orderType";
import { AdminOrderService } from "@/services/AdminOrderService";
import { AdminUserService } from "@/services/AdminUserService";
import { DelegationScopeService } from "@/services/DelegationScopeService";
import { DictionaryService } from "@/services/DictionaryService";

export type AdminDispatchContext = {
  companyId: number;
  actorUserId: number;
  actorRole: string;
  /** `true` gdy aktor ma delegację bez pełnych uprawnień admina. */
  scopedWorkers: boolean;
};

export type AdminDispatchLivePayload = {
  orders: UnifiedGanttItem[];
  liveSessions: UnifiedGanttItem[];
};

export type AdminDispatchDictionariesPayload = {
  workers: BaseWorker[];
  machines: BaseMachine[];
  materials: BaseMaterial[];
  materialCategories: BaseMaterialCategory[];
  customers: BaseCustomer[];
  categories: BaseCategory[];
};

const DEFAULT_ARCHIVE_LIMIT = 500;

function mapMaterialCategories(
  rows: Awaited<ReturnType<typeof DictionaryService.getMaterialCategories>>
): BaseMaterialCategory[] {
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color ?? null,
  }));
}

function mapCustomers(
  rows: Awaited<ReturnType<typeof DictionaryService.getCustomers>>
): BaseCustomer[] {
  return rows.map((c) => ({
    id: c.id,
    firstName: c.firstName ?? null,
    lastName: c.lastName,
    ...(c.phone ? { phone: c.phone } : {}),
    defaultAddress: c.defaultAddress ?? null,
    ...(c.locationAddresses?.length ? { locationAddresses: c.locationAddresses } : {}),
  }));
}

function mapCategories(
  rows: Awaited<ReturnType<typeof DictionaryService.getCategories>>
): BaseCategory[] {
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    showCustomer: Boolean(c.showCustomer),
    showMaterial: Boolean(c.showMaterial),
    showQuantity: Boolean(c.showQuantity),
    showTaskDescription: Boolean(c.showTaskDescription),
    reqCustomer: Boolean(c.reqCustomer),
    reqMaterial: Boolean(c.reqMaterial),
    reqQuantity: Boolean(c.reqQuantity),
    reqTaskDescription: Boolean(c.reqTaskDescription),
    isGlobal: Boolean(c.isGlobal),
    isStationary: Boolean(c.isStationary),
    color: c.color ?? null,
    showResourceName: Boolean(c.showResourceName),
    showResourceDescription: Boolean(c.showResourceDescription),
    showRegistrationNumber: Boolean(c.showRegistrationNumber),
    orderType: narrowOrderType(c.orderType) ?? "machine_work",
  }));
}

function mapMachines(
  rows: Awaited<ReturnType<typeof DictionaryService.getResources>>
): BaseMachine[] {
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    brand: m.brand ?? undefined,
    model: m.model ?? undefined,
    registrationNumber: m.registrationNumber ?? undefined,
    description: m.description ?? null,
    categoryIds: m.categoryIds,
    resourceGroupId: m.resourceGroupId ?? null,
    imageUrl: m.imageUrl ?? null,
  }));
}

function mapMaterials(
  rows: Awaited<ReturnType<typeof DictionaryService.getMaterials>>
): BaseMaterial[] {
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    unit: m.unit,
    categoryIds: m.categoryIds,
    stockQuantity: m.stockQuantity != null ? String(m.stockQuantity) : undefined,
    minStock: m.minStock != null ? String(m.minStock) : null,
    location: m.location ?? null,
  }));
}

export class AdminDispatchService {
  static async fetchDispatchWorkers(ctx: AdminDispatchContext): Promise<BaseWorker[]> {
    if (ctx.scopedWorkers) {
      return DelegationScopeService.getDelegatableWorkers(
        ctx.companyId,
        ctx.actorUserId,
        ctx.actorRole
      );
    }
    const allUsers = await AdminUserService.getAllUsers(ctx.companyId);
    return allUsers.map((u) => ({
      id: u.id,
      fullName: u.fullName,
    }));
  }

  /** Słowniki dyspozycji — rzadkie odświeżanie po stronie klienta. */
  static async getDictionaries(
    ctx: AdminDispatchContext
  ): Promise<AdminDispatchDictionariesPayload> {
    const { companyId } = ctx;
    const [workers, machines, materials, materialCategories, customers, categories] =
      await Promise.all([
        AdminDispatchService.fetchDispatchWorkers(ctx),
        DictionaryService.getResources(companyId),
        DictionaryService.getMaterials(companyId),
        DictionaryService.getMaterialCategories(companyId, { leavesOnly: true }),
        DictionaryService.getCustomers(companyId),
        DictionaryService.getCategories(companyId, { leavesOnly: true }),
      ]);

    return {
      workers,
      machines: mapMachines(machines),
      materials: mapMaterials(materials),
      materialCategories: mapMaterialCategories(materialCategories),
      customers: mapCustomers(customers),
      categories: mapCategories(categories),
    };
  }

  /** Zlecenia oczekujące + sesje w toku — częste odświeżanie. */
  static async getLiveData(companyId: number): Promise<AdminDispatchLivePayload> {
    const [orders, liveSessions] = await Promise.all([
      AdminOrderService.getActiveWorkOrders(companyId),
      AdminOrderService.getInProgressSessions(companyId),
    ]);
    return {
      orders: orders as unknown as UnifiedGanttItem[],
      liveSessions: liveSessions as unknown as UnifiedGanttItem[],
    };
  }

  /** Archiwum zakończonych sesji — lazy-load po starcie strony. */
  static async getArchiveSessions(
    companyId: number,
    limitCount = DEFAULT_ARCHIVE_LIMIT,
    offsetCount = 0
  ): Promise<UnifiedGanttItem[]> {
    const rows = await AdminOrderService.getCompletedArchiveSessions(
      companyId,
      limitCount,
      offsetCount
    );
    return rows as unknown as UnifiedGanttItem[];
  }

  /**
   * Pierwsze ładowanie dyspozycji (SSR): słowniki + dane live; archiwum poza bootstrap.
   */
  static async getBootstrap(ctx: AdminDispatchContext): Promise<AdminDispatchBootstrap> {
    const [dictionaries, live] = await Promise.all([
      AdminDispatchService.getDictionaries(ctx),
      AdminDispatchService.getLiveData(ctx.companyId),
    ]);

    return {
      ...dictionaries,
      ...live,
    };
  }
}

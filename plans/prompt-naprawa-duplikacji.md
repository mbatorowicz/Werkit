# Prompt: Eliminacja duplikacji i unifikacja kodu w Werkit

## Kontekst

Audyt kodu wykrył 12 obszarów duplikacji w serwisach, API route'ach, komponentach Map i zawężaczach typów (`narrow*`). Poniższy prompt opisuje wszystkie zmiany do wykonania w ramach jednego PR.

**Zasady ogólne:**
- Nie refaktoryzuj całych modułów „przy okazji" — zmień tylko to, co opisane.
- Po każdej zmianie uruchom `npx tsc --noEmit` i `npm test`.
- Nie zmieniaj kontraktów API (request/response) — tylko wewnętrzną organizację kodu.
- Nie zmieniaj i18n — struktura jest czysta.
- Przestrzegaj zasad z [`AGENTS.md`](AGENTS.md): żadnego `any`, `Array.isArray()` przed `.map()`, typy przez narrow functions.

---

## 1. Unifikacja logiki schedule conflict

**Pliki:** [`src/services/ScheduleConflictService.ts`](src/services/ScheduleConflictService.ts), [`src/services/AdminOrderService.ts`](src/services/AdminOrderService.ts), [`src/services/WorkerOrderService.ts`](src/services/WorkerOrderService.ts)

**Co zrobić:**

1. W [`ScheduleConflictService`](src/services/ScheduleConflictService.ts) dodaj statyczną metodę:

```ts
static async assertNoScheduleConflict(
  companyId: number,
  params: {
    userId: number;
    resourceId: number | null;
    dueDate: Date | null;
    durationHours: number | null;
    excludeOrderId?: number;
  },
): Promise<{ ok: true } | never> {
  const { userId, resourceId, dueDate, durationHours, excludeOrderId } = params;

  if (dueDate && durationHours != null && durationHours > 0) {
    const conflicts = await ScheduleConflictService.findConflictsForRequest(companyId, {
      userId,
      resourceId: resourceId!,
      dueDate,
      durationHours,
      excludeOrderId,
    });
    if (conflicts.length > 0) {
      throw new Error('schedule_conflict');
    }
  } else if (resourceId) {
    const resourceBusy = await ScheduleConflictService.hasActiveResourceSession(
      companyId,
      resourceId,
      userId,
    );
    if (resourceBusy) {
      throw new Error('resource_busy');
    }
  }

  return { ok: true };
}
```

2. W [`AdminOrderService.getScheduleSaveBlockCode`](src/services/AdminOrderService.ts:36) — zastąp ciało wywołaniem `assertNoScheduleConflict` z `try/catch` mapującym `Error('schedule_conflict')` → `"schedule_conflict"`, `Error('resource_busy')` → `"resource_busy"`.

3. W [`WorkerOrderService.acceptOrder`](src/services/WorkerOrderService.ts:86) — zastąp blok `if (order.dueDate && durationHours != null) { ... } else if (order.resourceId) { ... }` wywołaniem:
```ts
await ScheduleConflictService.assertNoScheduleConflict(companyId, {
  userId,
  resourceId: order.resourceId,
  dueDate: order.dueDate,
  durationHours,
  excludeOrderId: order.id,
});
```

4. W [`WorkerOrderService.createOwnOrder`](src/services/WorkerOrderService.ts:252) — analogicznie zastąp blok schedule conflict.

---

## 2. Unifikacja cross-tenant validation

**Pliki:** [`src/lib/tenantContext.ts`](src/lib/tenantContext.ts), [`src/services/AdminOrderService.ts`](src/services/AdminOrderService.ts), [`src/services/WorkerOrderService.ts`](src/services/WorkerOrderService.ts)

**Co zrobić:**

1. W [`src/lib/tenantContext.ts`](src/lib/tenantContext.ts) dodaj:

```ts
export async function assertOrderEntitiesBelongToCompany(
  orderData: {
    userId?: number | null;
    resourceId?: number | null;
    customerId?: number | null;
    materialId?: number | null;
  },
  companyId: number,
): Promise<void> {
  if (orderData.userId != null) {
    const [userRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, orderData.userId), eq(users.companyId, companyId)))
      .limit(1);
    if (!userRow) throw new Error('invalid_user');
  }
  if (orderData.resourceId != null) {
    await assertResourceBelongsToCompany(orderData.resourceId, companyId);
  }
  if (orderData.customerId != null) {
    await assertCustomerBelongsToCompany(orderData.customerId, companyId);
  }
  if (orderData.materialId != null) {
    await assertMaterialBelongsToCompany(orderData.materialId, companyId);
  }
}
```

2. W [`AdminOrderService.createOrder`](src/services/AdminOrderService.ts:152) — zastąp blok `if (orderData.userId != null) { ... } if (orderData.resourceId != null) { ... } ...` jednym wywołaniem `assertOrderEntitiesBelongToCompany(orderData, companyId)`.

3. W [`WorkerOrderService.createOwnOrder`](src/services/WorkerOrderService.ts:225) — zastąp blok `if (payload.resourceId != null) { ... } if (payload.customerId != null) { ... } ...` jednym wywołaniem `assertOrderEntitiesBelongToCompany(payload, companyId)`.

---

## 3. Unifikacja walidacji kategorii

**Pliki:** [`src/lib/workOrderCategoryValidation.ts`](src/lib/workOrderCategoryValidation.ts), [`src/app/api/admin/work-orders/route.ts`](src/app/api/admin/work-orders/route.ts), [`src/services/WorkerOrderService.ts`](src/services/WorkerOrderService.ts)

**Co zrobić:**

1. W [`src/lib/workOrderCategoryValidation.ts`](src/lib/workOrderCategoryValidation.ts) dodaj:

```ts
import { DictionaryService } from '@/services/DictionaryService';

export async function validateCategoryForOrder(
  companyId: number,
  categoryId: number,
  fields: {
    customerId?: unknown;
    materialId?: unknown;
    quantityTons?: unknown;
    taskDescription?: unknown;
  },
): Promise<{ ok: true } | never> {
  const categoryRow = await DictionaryService.getResourceCategoryById(companyId, categoryId);
  if (!categoryRow || categoryRow.isGroup) {
    throw new Error('invalid_category');
  }
  const check = validateWorkOrderFieldsAgainstCategory(categoryRow, fields);
  if (check !== 'ok') {
    throw new Error(check);
  }
  return { ok: true };
}
```

2. W [`src/app/api/admin/work-orders/route.ts`](src/app/api/admin/work-orders/route.ts:47) — zastąp:
```ts
const { DictionaryService } = await import('@/services/DictionaryService');
const categoryRow = await DictionaryService.getResourceCategoryById(companyId, catIdNum);
if (!categoryRow || categoryRow.isGroup) { return jsonError("invalid_category", 400); }
const catCheck = validateWorkOrderFieldsAgainstCategory(categoryRow, { ... });
if (catCheck !== 'ok') { return jsonError(catCheck, 400); }
```
→
```ts
try {
  await validateCategoryForOrder(companyId, catIdNum, { customerId, materialId, quantityTons, taskDescription });
} catch (e) {
  return jsonError(e instanceof Error ? e.message : "invalid_category", 400);
}
```

3. W [`WorkerOrderService.createOwnOrder`](src/services/WorkerOrderService.ts:236) — zastąp blok `DictionaryService.getResourceCategoryById` + `validateWorkOrderFieldsAgainstCategory` wywołaniem `validateCategoryForOrder`.

---

## 4. Unifikacja parsowania body

**Pliki:** [`src/lib/parseRouteParams.ts`](src/lib/parseRouteParams.ts) (lub nowy plik), [`src/services/WorkerOrderService.ts`](src/services/WorkerOrderService.ts), [`src/services/WorkerSessionService.ts`](src/services/WorkerSessionService.ts)

**Co zrobić:**

1. W [`src/lib/parseRouteParams.ts`](src/lib/parseRouteParams.ts) (lub nowym `src/lib/parseOrderBody.ts`) dodaj:

```ts
import { parsePositiveIntParam } from './parseRouteParams';

export type ParsedOrderBody = {
  categoryId: number;
  resourceId: number;
  materialId: number | null;
  customerId: number | null;
  taskDescription: string | null;
  quantityTons: string | null;
  expectedDurationHours: string | null;
  dueDate: Date | null;
  priority: string | null;
};

export function parseOrderBody(body: Record<string, unknown>): ParsedOrderBody {
  const categoryId = parsePositiveIntParam(body.categoryId);
  const resourceId = parsePositiveIntParam(body.resourceId);
  if (categoryId == null || resourceId == null) {
    throw new Error('missing_fields');
  }

  const materialId = parseOptionalPositiveInt(body.materialId);
  const customerId = parseOptionalPositiveInt(body.customerId);

  const taskDescription = typeof body.taskDescription === "string" ? body.taskDescription : null;
  const quantityTons = typeof body.quantityTons === "string" || typeof body.quantityTons === "number"
    ? String(body.quantityTons) : null;
  const expectedDurationHours = typeof body.expectedDurationHours === "string" || typeof body.expectedDurationHours === "number"
    ? String(body.expectedDurationHours) : null;
  const dueDateRaw = typeof body.dueDate === "string" ? body.dueDate : null;
  const parsedDueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const priority = typeof body.priority === "string" ? body.priority : null;

  return {
    categoryId,
    resourceId,
    materialId,
    customerId,
    taskDescription,
    quantityTons,
    expectedDurationHours,
    dueDate: parsedDueDate,
    priority,
  };
}

function parseOptionalPositiveInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parsePositiveIntParam(v);
  if (n == null) throw new Error('invalid_payload');
  return n;
}
```

2. W [`WorkerOrderService.createOwnOrder`](src/services/WorkerOrderService.ts:161) — zastąp ręczne parsowanie (linie 166-198) wywołaniem `parseOrderBody(body)`.

3. W [`WorkerSessionService.createWizardSession`](src/services/WorkerSessionService.ts:107) — użyj `parseOrderBody(body)`, ale zignoruj `expectedDurationHours`, `dueDate`, `priority` (nie są używane w wizardzie). Alternatywnie stwórz `parseWizardBody(body)` delegujący do `parseOrderBody`.

---

## 5. Unifikacja `ManeuverIcon`

**Pliki:** [`src/components/Map/NavigationInstructionBar.tsx`](src/components/Map/NavigationInstructionBar.tsx), [`src/components/Map/NavigationBottomSheet.tsx`](src/components/Map/NavigationBottomSheet.tsx)

**Co zrobić:**

1. Utwórz [`src/components/Map/ManeuverIcon.tsx`](src/components/Map/ManeuverIcon.tsx):

```tsx
import { ArrowLeft, ArrowRight, ArrowUp, CornerDownLeft, CornerUpRight, MapPin, RotateCcw } from "lucide-react";

export function ManeuverIcon({ type, modifier, className = "h-5 w-5" }: { type: string; modifier?: string; className?: string }) {
  if (type === "arrive") return <MapPin className={className} />;
  if (type === "depart") return <ArrowUp className={className} />;
  if (type === "roundabout" || type === "rotary" || type === "exit_roundabout") return <RotateCcw className={className} />;
  if (type === "uturn" || modifier === "uturn") return <RotateCcw className={className} />;
  if (modifier === "left" || modifier === "sharp_left") return <ArrowLeft className={className} />;
  if (modifier === "right" || modifier === "sharp_right") return <ArrowRight className={className} />;
  if (modifier === "slight_left") return <CornerDownLeft className={className} />;
  if (modifier === "slight_right") return <CornerUpRight className={className} />;
  return <ArrowUp className={className} />;
}
```

2. W [`NavigationInstructionBar.tsx`](src/components/Map/NavigationInstructionBar.tsx) — usuń lokalną definicję `ManeuverIcon`, zaimportuj z `./ManeuverIcon`.

3. W [`NavigationBottomSheet.tsx`](src/components/Map/NavigationBottomSheet.tsx) — usuń lokalną definicję `ManeuverIcon`, zaimportuj z `./ManeuverIcon`.

---

## 6. Unifikacja `formatNavigationDistance` / `formatNavigationDuration`

**Pliki:** [`src/components/Map/NavigationInstructionBar.tsx`](src/components/Map/NavigationInstructionBar.tsx), [`src/components/Map/NavigationBottomSheet.tsx`](src/components/Map/NavigationBottomSheet.tsx)

**Co zrobić:**

1. Utwórz [`src/components/Map/navigationFormat.ts`](src/components/Map/navigationFormat.ts):

```ts
/** Format distance in a human-readable way (meters or kilometers). */
export function formatNavigationDistance(meters: number): string {
  if (meters < 50) return "ok. 50 m";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format duration in a human-readable way. */
export function formatNavigationDuration(seconds: number): string {
  if (seconds < 60) return "<1 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
```

2. W [`NavigationInstructionBar.tsx`](src/components/Map/NavigationInstructionBar.tsx) — usuń definicje `formatNavigationDistance` i `formatNavigationDuration`, zaimportuj z `./navigationFormat`.

3. W [`NavigationBottomSheet.tsx`](src/components/Map/NavigationBottomSheet.tsx) — zmień import z `"./NavigationInstructionBar"` na `"./navigationFormat"`.

---

## 7. Eliminacja duplikacji OSRM hooków

**Pliki:** [`src/components/Map/useOsrmRouteToDestination.ts`](src/components/Map/useOsrmRouteToDestination.ts), [`src/components/Map/usePlannedDrivingRoute.ts`](src/components/Map/usePlannedDrivingRoute.ts)

**Co zrobić:**

1. W [`useOsrmRouteToDestination.ts`](src/components/Map/useOsrmRouteToDestination.ts) — dodaj opcjonalny parametr `throttleMs` do interfejsu (domyślnie 12_000). Użyj go w `fetchWithDeviceTelemetry`.

2. Usuń [`usePlannedDrivingRoute.ts`](src/components/Map/usePlannedDrivingRoute.ts).

3. Znajdź wszystkie miejsca importujące `usePlannedDrivingRoute` i przekieruj na `useOsrmRouteToDestination`. Jeśli któryś z call-site'ów używał innego `throttleMs`, przekaż go jawnie.

---

## 8. Unifikacja narrow functions

**Pliki:** [`src/lib/narrow/base.ts`](src/lib/narrow/base.ts), [`src/lib/narrow/machines.ts`](src/lib/narrow/machines.ts), [`src/lib/narrow/worker.ts`](src/lib/narrow/worker.ts), [`src/lib/narrow/shared.ts`](src/lib/narrow/shared.ts)

### 8a. Helper `narrowNullableNumber`

W [`shared.ts`](src/lib/narrow/shared.ts) dodaj:

```ts
export function narrowNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
```

Następnie w [`worker.ts`](src/lib/narrow/worker.ts) — zastąp inline logikę dla `expectedDurationHours` i `quantityTons` wywołaniem `narrowNullableNumber`.

### 8b. `narrowMachinesResourceRows` → delegacja do `narrowBaseMachines`

W [`machines.ts`](src/lib/narrow/machines.ts) — zmień `narrowMachinesResourceRows` na:

```ts
export function narrowMachinesResourceRows(rows: unknown[]): MachinesResource[] {
  return narrowBaseMachines(rows).map((m) => ({
    ...m,
    categoryIds: m.categoryIds ?? [],
  }));
}
```

### 8c. `narrowWizardCategories` → delegacja do `narrowBaseCategories`

W [`worker.ts`](src/lib/narrow/worker.ts) — zmień `narrowWizardCategories` na:

```ts
export function narrowWizardCategories(rows: unknown[]): WizardCategory[] {
  const base = narrowBaseCategories(rows);
  return base.map((c) => ({
    ...c,
    icon: undefined as string | undefined, // będzie nadpisane poniżej
  }));
  // Uwaga: narrowBaseCategories nie zwraca icon, showResourceName itp.
  // Potrzebne jest scalenie — patrz niżej.
}
```

**Alternatywa:** Jeśli `WizardCategory` rozszerza `BaseCategory` o `icon`, a `BaseCategory` ma już `showResourceName`/`showResourceDescription`/`showRegistrationNumber` (co widać w kodzie), to `narrowWizardCategories` może po prostu delegować do `narrowBaseCategories` i dodawać `icon`:

```ts
export function narrowWizardCategories(rows: unknown[]): WizardCategory[] {
  const base = narrowBaseCategories(rows);
  return rows
    .filter((r): r is Record<string, unknown> => isRecord(r))
    .map((raw, i) => ({
      ...base[i],
      icon: typeof raw.icon === "string" ? raw.icon : undefined,
    }))
    .filter((_, i) => i < base.length);
}
```

---

## 9. Unifikacja refreshBlobUrl w sesjach

**Pliki:** [`src/services/AdminSessionService.ts`](src/services/AdminSessionService.ts), [`src/services/WorkerSessionService.ts`](src/services/WorkerSessionService.ts)

**Co zrobić:**

1. W [`AdminSessionService.getSessionDetails`](src/services/AdminSessionService.ts:37) i [`WorkerSessionService.getSessionHistoryFull`](src/services/WorkerSessionService.ts:395) — logika `Promise.all(rawPhotos.map(async (p) => ({ ...p, photoUrl: await refreshBlobUrl(p.photoUrl) })))` jest identyczna.

2. Utwórz helper w [`src/lib/photoUpload.ts`](src/lib/photoUpload.ts) (lub nowym pliku):

```ts
export async function refreshPhotoUrls<T extends { photoUrl: string }>(photos: T[]): Promise<T[]> {
  const { refreshBlobUrl } = await import('@/lib/photoUpload');
  return Promise.all(
    photos.map(async (p) => ({
      ...p,
      photoUrl: await refreshBlobUrl(p.photoUrl),
    })),
  );
}
```

3. Użyj go w obu serwisach.

---

## Weryfikacja

Po wprowadzeniu wszystkich zmian:

```bash
npx tsc --noEmit
npm test
npm run lint
```

Sprawdź też, czy nie ma martwych importów (np. `DictionaryService` w route'cie po przeniesieniu do `validateCategoryForOrder`).

---

## Podsumowanie plików do modyfikacji

| # | Plik | Operacja |
|---|------|----------|
| 1 | `src/services/ScheduleConflictService.ts` | + `assertNoScheduleConflict` |
| 2 | `src/services/AdminOrderService.ts` | refactor `getScheduleSaveBlockCode` |
| 3 | `src/services/WorkerOrderService.ts` | refactor schedule + validation + body parsing |
| 4 | `src/lib/tenantContext.ts` | + `assertOrderEntitiesBelongToCompany` |
| 5 | `src/lib/workOrderCategoryValidation.ts` | + `validateCategoryForOrder` |
| 6 | `src/app/api/admin/work-orders/route.ts` | użyj `validateCategoryForOrder` |
| 7 | `src/lib/parseRouteParams.ts` | + `parseOrderBody` |
| 8 | `src/services/WorkerSessionService.ts` | użyj `parseOrderBody` / `parseWizardBody` |
| 9 | `src/components/Map/ManeuverIcon.tsx` | **NOWY** — wyciągnięty komponent |
| 10 | `src/components/Map/NavigationInstructionBar.tsx` | import z ManeuverIcon + navigationFormat |
| 11 | `src/components/Map/NavigationBottomSheet.tsx` | import z ManeuverIcon + navigationFormat |
| 12 | `src/components/Map/navigationFormat.ts` | **NOWY** — wyciągnięte helpery |
| 13 | `src/components/Map/useOsrmRouteToDestination.ts` | + opcjonalny `throttleMs` |
| 14 | `src/components/Map/usePlannedDrivingRoute.ts` | **USUNĄĆ** |
| 15 | `src/lib/narrow/shared.ts` | + `narrowNullableNumber` |
| 16 | `src/lib/narrow/worker.ts` | użyj `narrowNullableNumber`, delegacja do `narrowBaseCategories` |
| 17 | `src/lib/narrow/machines.ts` | delegacja `narrowMachinesResourceRows` → `narrowBaseMachines` |
| 18 | `src/lib/photoUpload.ts` | + `refreshPhotoUrls` helper |
| 19 | `src/services/AdminSessionService.ts` | użyj `refreshPhotoUrls` |

# Werkit Master Plan — jedyny plan (SSOT)

> **Cel:** Jeden spójny dokument zastępujący wszystkie rozproszone plany w `plans/`.  
> **Data:** 2026-05-29  
> **Źródła scalone:** `audyt-werkit-2026-05.md`, `naprawa-audyt-2026-05.md`, `dur-module-completion-plan.md`, `dur-module-plan.md`, `feature-flags-platform-plan.md`, `order-types-org-gps-toggle-plan.md`, `audyt-i18n-2026-05.md`, `audyt-multitenant-2026-05.md`, `ios-support-2026-05.md`, `prompt-naprawa-duplikacji.md`, `docs/TECH_DEBT_ROADMAP.md`  
> **Dokumenty nadrzędne:** [`AGENTS.md`](../AGENTS.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/SYSTEM_MAP.md`](../docs/SYSTEM_MAP.md)

---

## Spis treści

1. [Stan obecny — co jest zrobione](#1-stan-obecny--co-jest-zrobione)
2. [Pozostałe zadania — podział na fazy](#2-pozostałe-zadania--podział-na-fazy)
   - [Faza I: Krytyczne bugi i luki bezpieczeństwa](#faza-i-krytyczne-bugi-i-luki-bezpieczeństwa)
   - [Faza II: Unifikacja kodu (DRY)](#faza-ii-unifikacja-kodu-dry)
   - [Faza III: i18n — nowe klucze i poprawki](#faza-iii-i18n--nowe-klucze-i-poprawki)
   - [Faza IV: Feature flags — runtime guards](#faza-iv-feature-flags--runtime-guards)
   - [Faza V: UI admin/worker — brakujące ekrany](#faza-v-ui-adminworker--brakujące-ekrany)
   - [Faza VI: Czyszczenie i dokumentacja](#faza-vi-czyszczenie-i-dokumentacja)
3. [Jak utrzymywać ten plan](#3-jak-utrzymywać-ten-plan)
4. [Indeks plików do zmiany](#4-indeks-plików-do-zmiany)

---

## 1. Stan obecny — co jest zrobione

### 1.1 TECH_DEBT_ROADMAP — zamknięte

| ID | Temat | Status |
|----|-------|--------|
| Faza A | Harmonogram w serwisach (`schedule.ts` → `AdminOrderService`) | ✅ |
| Faza B | Pipeline migracji (`db:napraw-wszystko-i-zweryfikuj`) | ✅ |
| Faza C | Legacy kolumny DB (migracja 0014) | ✅ |
| Faza D | Semantyka statusu zlecenia (PENDING → IN_PROGRESS → COMPLETED) | ✅ |
| Faza E | bcrypt/bcryptjs (`passwordCrypto.ts`, `WERKIT_USE_BCRYPTJS`) | ✅ |
| Faza F | Dokumentacja routingu admin (SYSTEM_MAP §4) | ✅ |
| D-01 | Ujednolicenie dat/czasu w panelu admin | ✅ |
| D-02 | Rozszerzenie testów (AdminUserService) | ✅ |
| D-03 | Wspólny moduł okien czasowych dla telemetrii | ✅ |
| D-04 | Abstrakcja providera trasy mapy (RouteGeometryProvider) | ✅ |
| D-05 | Przeniesienie logiki DB z route handlera do serwisu (foto) | ✅ |
| D-06 | Rozszerzenie testów (AdminSessionService, GpsService, SystemLogService) | ✅ |

### 1.2 DUR Module — zrobione

| Komponent | Status |
|-----------|--------|
| DB schema + migracja 0020 (spare_parts, categories, compatibility) | ✅ |
| Domain types (`src/types/dur.ts`) | ✅ |
| Services: `SparePartService`, `SparePartCategoryService`, `SparePartCompatibilityService` | ✅ |
| API: `/api/dur/spare-parts/*`, `/api/dur/spare-part-categories/*`, `/api/dur/spare-part-compatibility/*` | ✅ |
| Narrow functions (`src/lib/narrow/dur.ts`) | ✅ |
| i18n keys (`dur.*`) | ✅ |
| Admin UI: SparePartsClient, SparePartCategoriesClient, CompatibilityClient | ✅ |
| Admin nav links | ✅ |
| Tests (services + narrow) | ✅ |
| DB schema + migracja 0022 (inventory, stock_receipts, stock_issues) | ✅ |
| `InventoryService`, `StockMovementService` | ✅ |
| API: `/api/dur/inventory`, `/api/dur/stock/receipts`, `/api/dur/stock/issues` | ✅ |
| Admin UI: InventoryClient, StockMovementsClient | ✅ |
| Admin page: `/admin/dur/warehouse` | ✅ |
| `WorkOrderSparePartService` | ✅ |
| Admin API: `/api/admin/work-orders/[id]/spare-parts` | ✅ |
| Worker API: `/api/worker/work-orders/[id]/spare-parts` | ✅ |
| Worker UI: `WorkerSparePartsPanel.tsx` | ✅ |

### 1.3 Feature Flags — zrobione

| Komponent | Status |
|-----------|--------|
| Migracja 0023 (`dur_enabled` w `company_settings`) | ✅ |
| `schema.ts` — `durEnabled` | ✅ |
| `PlatformFeatureFlagService` | ✅ |
| API: `/api/platform/feature-flags/[companyId]` | ✅ |
| `FeatureFlagsSection` UI | ✅ |
| Typy `featureFlags.ts` | ✅ |

### 1.4 Order Types + Organization — zrobione

| Komponent | Status |
|-----------|--------|
| Migracja 0021 (`order_type`, `repair_description`, `repair_notes`) | ✅ |
| `schema.ts` — kolumny order_type | ✅ |
| `OrganizationService` | ✅ |
| API: `/api/admin/organization/departments`, `/teams`, `/team-members` | ✅ |
| Typy `organization.ts` | ✅ |

### 1.5 Unifikacja kodu — zrobione

| Komponent | Status |
|-----------|--------|
| `ManeuverIcon.tsx` — wyciągnięty komponent | ✅ |
| `navigationFormat.ts` — wyciągnięte helpery | ✅ |
| `usePlannedDrivingRoute.ts` — usunięty | ✅ |
| `workOrderCategoryValidation.ts` — istnieje | ✅ |
| `photoUpload.ts` — istnieje | ✅ |
| `JWT_SECRET` — fallback usunięty (rzuca `Error`) | ✅ |

### 1.6 Multi-tenant — zrobione

| Komponent | Status |
|-----------|--------|
| `CustomerLocationService` — dodano `companyId` do metod | ✅ |

---

## 2. Pozostałe zadania — podział na fazy

### Faza I: Krytyczne bugi i luki bezpieczeństwa

> **Priorytet: 🔴 WYSOKI** — do zrobienia przed wszystkim innym.

#### I-1: 🔴 Bug Compatibility UI — złe endpointy kategorii

**Problem:** [`CompatibilityClient.tsx`](../src/features/admin/dur/CompatibilityClient.tsx) i [`useSparePartsAdminData.ts`](../src/features/admin/dur/useSparePartsAdminData.ts) fetchują `/api/dur/spare-part-categories` zamiast `/api/resource-categories` dla listy kategorii maszyn. Skutkuje to FK violation przy zapisie kompatybilności.

**Pliki:**
- [`src/features/admin/dur/CompatibilityClient.tsx`](../src/features/admin/dur/CompatibilityClient.tsx)
- [`src/features/admin/dur/useSparePartsAdminData.ts`](../src/features/admin/dur/useSparePartsAdminData.ts)

**Fix:** Zmienić URL fetcha na `/api/resource-categories?leavesOnly=1`, użyć odpowiedniej narrow function (np. `narrowBaseCategories` z `base.ts`).

---

#### I-2: 🔴 Brak guarda tenant w endpointach `customer-locations`

**Problem:** 5 endpointów API nie sprawdza przynależności klienta do firmy:

| Endpoint | Plik |
|----------|------|
| `GET /api/customers/[id]/locations` | [`src/app/api/customers/[id]/locations/route.ts`](../src/app/api/customers/%5Bid%5D/locations/route.ts) |
| `POST /api/customers/[id]/locations` | j.w. |
| `PUT /api/customers/[id]/locations/[locationId]` | [`src/app/api/customers/[id]/locations/[locationId]/route.ts`](../src/app/api/customers/%5Bid%5D/locations/%5BlocationId%5D/route.ts) |
| `DELETE /api/customers/[id]/locations/[locationId]` | j.w. |
| `PUT /api/worker/customer-locations/[id]/route` | [`src/app/api/worker/customer-locations/[id]/route/route.ts`](../src/app/api/worker/customer-locations/%5Bid%5D/route/route.ts) |

**Fix:** Dodać `requireCompanyScopedSession()` / `requireWorkerCompanySession()` do każdego endpointu. `CustomerLocationService` już przyjmuje `companyId` — wystarczy przekazać z guarda.

---

#### I-3: 🔴 Brak UI admina dla organizacji (`/admin/organization`)

**Problem:** Serwis `OrganizationService` i API istnieją, ale nie ma panelu admina do zarządzania działami/zespołami.

**Pliki do stworzenia:**
- [`src/features/admin/organization/OrganizationClient.tsx`](../src/features/admin/organization/OrganizationClient.tsx) — główny komponent
- [`src/features/admin/organization/DepartmentTree.tsx`](../src/features/admin/organization/DepartmentTree.tsx) — drzewo działów
- [`src/features/admin/organization/TeamList.tsx`](../src/features/admin/organization/TeamList.tsx) — lista zespołów
- [`src/features/admin/organization/TeamMembers.tsx`](../src/features/admin/organization/TeamMembers.tsx) — zarządzanie członkami
- [`src/app/admin/organization/page.tsx`](../src/app/admin/organization/page.tsx) — strona
- [`src/app/admin/organization/layout.tsx`](../src/app/admin/organization/layout.tsx) — layout (opcjonalnie)
- i18n: klucze `admin.organization.*`

**Zależności:** Typy `organization.ts` istnieją, serwis `OrganizationService` istnieje, API istnieje.

---

### Faza II: Unifikacja kodu (DRY)

> **Priorytet: 🟡 ŚREDNI** — redukcja duplikacji, poprawa maintainability.

#### II-1: `assertNoScheduleConflict` w ScheduleConflictService

**Plik:** [`src/services/ScheduleConflictService.ts`](../src/services/ScheduleConflictService.ts)

Dodać metodę statyczną `assertNoScheduleConflict(companyId, params)` i użyć jej w:
- [`AdminOrderService.getScheduleSaveBlockCode`](../src/services/AdminOrderService.ts)
- [`WorkerOrderService.acceptOrder`](../src/services/WorkerOrderService.ts)
- [`WorkerOrderService.createOwnOrder`](../src/services/WorkerOrderService.ts)

---

#### II-2: `assertOrderEntitiesBelongToCompany` w tenantContext

**Plik:** [`src/lib/tenantContext.ts`](../src/lib/tenantContext.ts)

Dodać funkcję `assertOrderEntitiesBelongToCompany(orderData, companyId)` i użyć jej w:
- [`AdminOrderService.createOrder`](../src/services/AdminOrderService.ts)
- [`WorkerOrderService.createOwnOrder`](../src/services/WorkerOrderService.ts)

---

#### II-3: `validateCategoryForOrder` w workOrderCategoryValidation

**Plik:** [`src/lib/workOrderCategoryValidation.ts`](../src/lib/workOrderCategoryValidation.ts)

Dodać funkcję `validateCategoryForOrder(companyId, categoryId, fields)` i użyć jej w:
- [`src/app/api/admin/work-orders/route.ts`](../src/app/api/admin/work-orders/route.ts)
- [`WorkerOrderService.createOwnOrder`](../src/services/WorkerOrderService.ts)

---

#### II-4: `parseOrderBody` — wspólny parser body zlecenia

**Plik:** [`src/lib/parseOrderBody.ts`](../src/lib/parseOrderBody.ts) (NOWY)

Dodać `parseOrderBody(body)` i `parseWizardBody(body)` i użyć w:
- [`WorkerOrderService.createOwnOrder`](../src/services/WorkerOrderService.ts)
- [`WorkerSessionService.createWizardSession`](../src/services/WorkerSessionService.ts)

---

#### II-5: Narrow functions — unifikacja

**Pliki:**
- [`src/lib/narrow/shared.ts`](../src/lib/narrow/shared.ts) — dodać `narrowNullableNumber`
- [`src/lib/narrow/worker.ts`](../src/lib/narrow/worker.ts) — użyć `narrowNullableNumber`, delegacja `narrowWizardCategories` → `narrowBaseCategories`
- [`src/lib/narrow/machines.ts`](../src/lib/narrow/machines.ts) — delegacja `narrowMachinesResourceRows` → `narrowBaseMachines`

---

#### II-6: `refreshPhotoUrls` helper

**Plik:** [`src/lib/photoUpload.ts`](../src/lib/photoUpload.ts) (już istnieje — dodać helper)

Dodać `refreshPhotoUrls<T>(photos)` i użyć w:
- [`AdminSessionService.getSessionDetails`](../src/services/AdminSessionService.ts)
- [`WorkerSessionService.getSessionHistoryFull`](../src/services/WorkerSessionService.ts)

---

### Faza III: i18n — nowe klucze i poprawki

> **Priorytet: 🟡 ŚREDNI** — spójność UI, wsparcie EN/DE.

#### III-1: Nowe klucze w słownikach

Dodać do [`pl.ts`](../src/i18n/locales/pl.ts) (SSOT), [`en.ts`](../src/i18n/locales/en.ts), [`de.ts`](../src/i18n/locales/de.ts):

```typescript
// login — rozszerzenie istniejącej sekcji
login: {
  ...existing,
  systemLogin: "System Logowania",
  subtitle: "Panel dowodzenia i logistyki",
  usernameLabel: "Login administratora",
  usernamePlaceholder: "login",
  passwordLabel: "Hasło",
  passwordPlaceholder: "••••••••",
}

// worker.nav — NOWA sekcja
worker: {
  ...existing,
  nav: {
    session: "Sesja",
    history: "Historia",
    profile: "Profil",
    help: "Pomoc",
  },
  profile: {
    noAccess: "Brak dostępu",
    backToSession: "Powrót do sesji",
    title: "Twój Profil",
    roleAdmin: "Administrator",
    roleWorker: "Pracownik",
    systemLogin: "Login Systemowy:",
    goToAdminPanel: "Przejdź do Panelu Administratora",
    logout: "Wyloguj z systemu",
  },
  wizard: { backToSession: "Powrót do sesji" },
  help: { backToSession: "Powrót do sesji" },
  client: {
    requiresPhoto: "Wymaga min. 1 zdjęcia",
    photo: "Zdjęcie",
    note: "Notatka",
  },
}

// admin.ui — NOWE podklucze
admin: {
  ...existing,
  ui: {
    ...existing.ui,
    back: "Wstecz",
    noResults: "Brak wyników",
    clear: "Wyczyść",
  },
  orders: {
    ...existing.orders,
    previousPage: "Poprzednia strona",
    nextPage: "Następna strona",
  },
  map: {
    addWaypoint: "Dodaj punkt pośredni — kliknij na mapie",
    cancelAdd: "Anuluj dodawanie",
    removeWaypoint: "Usuń punkt pośredni — kliknij marker",
    cancelRemove: "Anuluj usuwanie",
    navigate: "Nawiguj",
    openGoogleMaps: "Otwórz w Google Maps",
    centerOnLocation: "Center on my location",
    eventPhoto: "Zdjęcie",
    eventNote: "Notatka",
    eventAlt: "Zdarzenie",
  },
}
```

#### III-2: Poprawki w komponentach

| Komponent | Zmiana |
|-----------|--------|
| [`src/app/login/page.tsx`](../src/app/login/page.tsx) | Dodać `getDictionary()`, zastąpić hardcodowane stringi |
| [`src/app/worker/layout.tsx`](../src/app/worker/layout.tsx) | Dodać `getDictionary()`, użyć `worker.nav.*` |
| [`src/app/worker/profile/page.tsx`](../src/app/worker/profile/page.tsx) | Dodać `getDictionary()`, zastąpić stringi |
| [`src/app/worker/wizard/page.tsx`](../src/app/worker/wizard/page.tsx) | Użyć `worker.wizard.backToSession` |
| [`src/app/worker/help/page.tsx`](../src/app/worker/help/page.tsx) | Użyć `worker.help.backToSession` |
| [`src/components/Admin/AdminMobileBackButton.tsx`](../src/components/Admin/AdminMobileBackButton.tsx) | Dodać prop `ariaLabel` |
| [`src/components/Admin/AdminSearchCombobox.tsx`](../src/components/Admin/AdminSearchCombobox.tsx) | Dodać props `noResultsLabel`, `clearAriaLabel` |
| [`src/components/Admin/MobileAdminNav.tsx`](../src/components/Admin/MobileAdminNav.tsx) | Użyć `dict.sidebar.logoutSession` |
| [`src/components/Admin/Orders/OrdersDispatchToolbar.tsx`](../src/components/Admin/Orders/OrdersDispatchToolbar.tsx) | Użyć `admin.orders.previousPage`/`nextPage` |
| [`src/components/Map/LiveMap.tsx`](../src/components/Map/LiveMap.tsx) | Użyć `admin.map.eventPhoto`/`eventNote`/`eventAlt` |
| [`src/components/Map/FullScreenMapModal.tsx`](../src/components/Map/FullScreenMapModal.tsx) | Użyć `admin.map.*` |
| [`src/components/Map/mapSharedComponents.tsx`](../src/components/Map/mapSharedComponents.tsx) | Dodać prop `dict` do `WaypointControls` i `LocateMeButton` |
| [`src/features/worker/components/ActiveSessionDashboard.tsx`](../src/features/worker/components/ActiveSessionDashboard.tsx) | Użyć `worker.client.requiresPhoto` |

---

### Faza IV: Feature flags — runtime guards

> **Priorytet: 🟡 ŚREDNI** — blokada GPS/DUR w runtime.

#### IV-1: `FeatureFlagsProvider` + hook `useFeatureFlags`

**Plik:** [`src/components/FeatureFlags.tsx`](../src/components/FeatureFlags.tsx) (NOWY)

Stworzyć provider React i hook `useFeatureFlags()`. Załadować flagi w layoutach:
- [`src/app/admin/layout.tsx`](../src/app/admin/layout.tsx)
- [`src/app/worker/layout.tsx`](../src/app/worker/layout.tsx)

#### IV-2: Blokada GPS w backendzie

**Plik:** [`src/app/api/worker/gps/route.ts`](../src/app/api/worker/gps/route.ts)

Dodać sprawdzenie `gpsTrackingEnabled` — jeśli `false`, zwrócić 403 `feature_disabled`.

#### IV-3: Blokada DUR w UI

| Komponent | Guard |
|-----------|-------|
| [`WorkerSparePartsPanel.tsx`](../src/features/worker/components/WorkerSparePartsPanel.tsx) | Jeśli `!durEnabled` → nie renderuj |
| [`WorkOrderSparePartsSection.tsx`](../src/components/Admin/Modals/WorkOrderSparePartsSection.tsx) | Jeśli `!durEnabled` → nie renderuj |

---

### Faza V: UI admin/worker — brakujące ekrany

> **Priorytet: 🟡 ŚREDNI** — pełna funkcjonalność order types.

#### V-1: Rozgałęziony formularz zlecenia (admin)

**Plik:** [`src/components/Admin/Modals/OrderFormFields.tsx`](../src/components/Admin/Modals/OrderFormFields.tsx)

Po wybraniu kategorii:
- `order_type = 'machine_work'` → obecne zachowanie (materiał, tony, klient)
- `order_type = 'machine_repair'` → ukryj materiał/tony, pokaż `repairDescription` + sekcję części zamiennych

#### V-2: Wizard pracownika dla napraw

**Plik:** [`src/features/worker/components/wizard/WizardClient.tsx`](../src/features/worker/components/wizard/WizardClient.tsx)

Rozgałęzienie w zależności od `orderType` wybranej kategorii:
- `machine_repair` → pole opisu usterki + wybór części z magazynu

#### V-3: Dashboard sesji naprawczej

**Plik:** [`src/features/worker/components/shell/`](../src/features/worker/components/shell/)

Dla sesji `machine_repair`: pokaż użyte części, możliwość dodania notatki serwisowej.

---

### Faza VI: Czyszczenie i dokumentacja

> **Priorytet: 🟢 NISKI** — porządki.

#### VI-1: Usunąć pusty katalog

```bash
rmdir /s src\app\api\settings
```

#### VI-2: Sprawdzić `narrowApiListRows.ts`

Czy wszystkie call-site'y już używają `@/lib/narrow` zamiast deprecated re-exportu. Jeśli tak — usunąć plik.

#### VI-3: Sprawdzić `AdminOrderService.checkScheduleConflict()` deprecated

Czy wszystkie call-site'y używają `ScheduleConflictService`. Jeśli tak — usunąć starą metodę.

#### VI-4: iOS PWA — ulepszenia

- Dodać `apple-touch-icon`, meta tagi iOS
- Dodać wykrywanie iOS z komunikatem "Dodaj do ekranu głównego"
- (Opcjonalnie) dodać `@capacitor/ios` do projektu

#### VI-5: Aktualizacja dokumentacji

Po każdej zmianie:
- [`docs/SYSTEM_MAP.md`](../docs/SYSTEM_MAP.md) — dodać nowe endpointy, serwisy, komponenty
- [`AGENTS.md`](../AGENTS.md) — zaktualizować listę serwisów jeśli potrzeba
- [`docs/TECH_DEBT_ROADMAP.md`](../docs/TECH_DEBT_ROADMAP.md) — dodać wpis o wykonanych zadaniach

---

## 3. Jak utrzymywać ten plan

1. **Ten plik (`MASTER-PLAN.md`) jest SSOT** — wszystkie inne plany w `plans/` są archiwalne. Po zatwierdzeniu tego planu, stare plany można przenieść do `plans/archive/`.
2. **Po każdej zmianie kodu** — zaktualizuj checklistę w §2 (zmień `[ ]` na `[x]`).
3. **Nowe zadania** — dopisuj w odpowiedniej fazie, nie twórz nowych plików.
4. **Przed większym PR** — sprawdź czy nie ma konfliktów między fazami (np. Faza II zmienia serwis, który Faza I też modyfikuje).
5. **Po zamknięciu fazy** — zrób wpis w `TECH_DEBT_ROADMAP.md` §5.

---

## 4. Indeks plików do zmiany

### Faza I — Krytyczne

| # | Plik | Operacja |
|---|------|----------|
| I-1 | `src/features/admin/dur/CompatibilityClient.tsx` | EDIT — zmiana URL fetcha |
| I-1 | `src/features/admin/dur/useSparePartsAdminData.ts` | EDIT — zmiana URL fetcha |
| I-2 | `src/app/api/customers/[id]/locations/route.ts` | EDIT — dodać guard tenant |
| I-2 | `src/app/api/customers/[id]/locations/[locationId]/route.ts` | EDIT — dodać guard tenant |
| I-2 | `src/app/api/worker/customer-locations/[id]/route/route.ts` | EDIT — dodać guard tenant |
| I-3 | `src/features/admin/organization/OrganizationClient.tsx` | CREATE |
| I-3 | `src/features/admin/organization/DepartmentTree.tsx` | CREATE |
| I-3 | `src/features/admin/organization/TeamList.tsx` | CREATE |
| I-3 | `src/features/admin/organization/TeamMembers.tsx` | CREATE |
| I-3 | `src/app/admin/organization/page.tsx` | CREATE |
| I-3 | `src/i18n/locales/pl.ts` | EDIT — klucze `admin.organization.*` |
| I-3 | `src/i18n/locales/en.ts` | EDIT |
| I-3 | `src/i18n/locales/de.ts` | EDIT |

### Faza II — Unifikacja

| # | Plik | Operacja |
|---|------|----------|
| II-1 | `src/services/ScheduleConflictService.ts` | EDIT — + `assertNoScheduleConflict` |
| II-1 | `src/services/AdminOrderService.ts` | EDIT — refactor `getScheduleSaveBlockCode` |
| II-1 | `src/services/WorkerOrderService.ts` | EDIT — refactor schedule check |
| II-2 | `src/lib/tenantContext.ts` | EDIT — + `assertOrderEntitiesBelongToCompany` |
| II-2 | `src/services/AdminOrderService.ts` | EDIT — użyj helpera |
| II-2 | `src/services/WorkerOrderService.ts` | EDIT — użyj helpera |
| II-3 | `src/lib/workOrderCategoryValidation.ts` | EDIT — + `validateCategoryForOrder` |
| II-3 | `src/app/api/admin/work-orders/route.ts` | EDIT — użyj helpera |
| II-3 | `src/services/WorkerOrderService.ts` | EDIT — użyj helpera |
| II-4 | `src/lib/parseOrderBody.ts` | CREATE |
| II-4 | `src/services/WorkerOrderService.ts` | EDIT — użyj `parseOrderBody` |
| II-4 | `src/services/WorkerSessionService.ts` | EDIT — użyj `parseOrderBody`/`parseWizardBody` |
| II-5 | `src/lib/narrow/shared.ts` | EDIT — + `narrowNullableNumber` |
| II-5 | `src/lib/narrow/worker.ts` | EDIT — delegacja |
| II-5 | `src/lib/narrow/machines.ts` | EDIT — delegacja |
| II-6 | `src/lib/photoUpload.ts` | EDIT — + `refreshPhotoUrls` |
| II-6 | `src/services/AdminSessionService.ts` | EDIT — użyj helpera |
| II-6 | `src/services/WorkerSessionService.ts` | EDIT — użyj helpera |

### Faza III — i18n

| # | Plik | Operacja |
|---|------|----------|
| III-1 | `src/i18n/locales/pl.ts` | EDIT — nowe klucze |
| III-1 | `src/i18n/locales/en.ts` | EDIT — tłumaczenia |
| III-1 | `src/i18n/locales/de.ts` | EDIT — tłumaczenia |
| III-2 | `src/app/login/page.tsx` | EDIT — użyj słownika |
| III-2 | `src/app/worker/layout.tsx` | EDIT — użyj słownika |
| III-2 | `src/app/worker/profile/page.tsx` | EDIT — użyj słownika |
| III-2 | `src/app/worker/wizard/page.tsx` | EDIT — użyj słownika |
| III-2 | `src/app/worker/help/page.tsx` | EDIT — użyj słownika |
| III-2 | `src/components/Admin/AdminMobileBackButton.tsx` | EDIT — prop `ariaLabel` |
| III-2 | `src/components/Admin/AdminSearchCombobox.tsx` | EDIT — props i18n |
| III-2 | `src/components/Admin/MobileAdminNav.tsx` | EDIT — użyj `dict` |
| III-2 | `src/components/Admin/Orders/OrdersDispatchToolbar.tsx` | EDIT — użyj słownika |
| III-2 | `src/components/Map/LiveMap.tsx` | EDIT — użyj słownika |
| III-2 | `src/components/Map/FullScreenMapModal.tsx` | EDIT — użyj słownika |
| III-2 | `src/components/Map/mapSharedComponents.tsx` | EDIT — prop `dict` |
| III-2 | `src/features/worker/components/ActiveSessionDashboard.tsx` | EDIT — użyj słownika |

### Faza IV — Feature flags

| # | Plik | Operacja |
|---|------|----------|
| IV-1 | `src/components/FeatureFlags.tsx` | CREATE |
| IV-1 | `src/app/admin/layout.tsx` | EDIT — provider |
| IV-1 | `src/app/worker/layout.tsx` | EDIT — provider |
| IV-2 | `src/app/api/worker/gps/route.ts` | EDIT — guard GPS |
| IV-3 | `src/features/worker/components/WorkerSparePartsPanel.tsx` | EDIT — guard DUR |
| IV-3 | `src/components/Admin/Modals/WorkOrderSparePartsSection.tsx` | EDIT — guard DUR |

### Faza V — UI

| # | Plik | Operacja |
|---|------|----------|
| V-1 | `src/components/Admin/Modals/OrderFormFields.tsx` | EDIT — rozgałęzienie order_type |
| V-2 | `src/features/worker/components/wizard/WizardClient.tsx` | EDIT — rozgałęzienie |
| V-3 | `src/features/worker/components/shell/` | EDIT — dashboard naprawczy |

### Faza VI — Czyszczenie

| # | Plik | Operacja |
|---|------|----------|
| VI-1 | `src/app/api/settings/` | DELETE — pusty katalog |
| VI-2 | `src/lib/narrowApiListRows.ts` | DELETE (jeśli nieużywany) |
| VI-3 | `src/services/AdminOrderService.ts` | DELETE — deprecated metoda |
| VI-4 | `public/` | EDIT — iOS meta tagi |
| VI-5 | `docs/SYSTEM_MAP.md` | EDIT |
| VI-5 | `AGENTS.md` | EDIT (jeśli potrzeba) |
| VI-5 | `docs/TECH_DEBT_ROADMAP.md` | EDIT |

---

## Podsumowanie — kolejność realizacji

```
Faza I (Krytyczne) ──────────────────────┐
  ├─ I-1: Bug Compatibility UI           │ → 3 pliki
  ├─ I-2: Guard tenant customer-locations│ → 3 pliki
  └─ I-3: UI organizacji                │ → ~8 plików
                                          │
Faza II (Unifikacja) ─────────────────────┤
  ├─ II-1: assertNoScheduleConflict       │ → 3 pliki
  ├─ II-2: assertOrderEntitiesBelongTo    │ → 3 pliki
  ├─ II-3: validateCategoryForOrder       │ → 3 pliki
  ├─ II-4: parseOrderBody                 │ → 3 pliki
  ├─ II-5: Narrow functions               │ → 3 pliki
  └─ II-6: refreshPhotoUrls              │ → 3 pliki
                                          │
Faza III (i18n) ──────────────────────────┤
  ├─ III-1: Nowe klucze                   │ → 3 pliki
  └─ III-2: Poprawki w komponentach      │ → ~14 plików
                                          │
Faza IV (Feature Flags) ──────────────────┤
  ├─ IV-1: Provider + hook                │ → 3 pliki
  ├─ IV-2: Blokada GPS                    │ → 1 plik
  └─ IV-3: Blokada DUR                   │ → 2 pliki
                                          │
Faza V (UI) ──────────────────────────────┤
  ├─ V-1: Formularz admin                 │ → 1 plik
  ├─ V-2: Wizard worker                   │ → 1 plik
  └─ V-3: Dashboard naprawczy            │ → ~2 pliki
                                          │
Faza VI (Czyszczenie) ────────────────────┘
  ├─ VI-1: Usunąć pusty katalog
  ├─ VI-2/3: Sprawdzić deprecated
  ├─ VI-4: iOS PWA
  └─ VI-5: Dokumentacja
```

**Łącznie: ~55 plików do modyfikacji/stworzenia** (wiele z nich to małe zmiany, np. dodanie guarda lub zmiana URL).

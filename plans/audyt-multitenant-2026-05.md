# Audyt multi-tenant — Werkit (maj 2026)

## 1. Cel audytu

Ocena poprawności i kompletności izolacji danych między firmami (tenantami) w systemie Werkit. Sprawdzono: schemat bazy, migracje, proxy (Edge), API route handlery, serwisy, komponenty platformy (superadmin).

---

## 2. Model danych — stan obecny

### 2.1 Tabela `companies` (tenant)

- [`src/db/schema.ts`](src/db/schema.ts:10) — `id`, `name`, `slug` (UNIQUE), `is_active`, `created_at`.
- Migracja [`0017_multi_company.sql`](drizzle/0017_multi_company.sql) — dodaje tabelę, wstawia firmę domyślną `id=1`.

### 2.2 Tabele z `company_id` (dane operacyjne)

| Tabela | Kolumna `company_id` | Typ FK | Schema (linia) |
|--------|---------------------|--------|----------------|
| `users` | `company_id` (nullable — NULL = superadmin) | `RESTRICT` | 21 |
| `resource_categories` | `company_id` NOT NULL | `CASCADE` | 40 |
| `resources` | `company_id` NOT NULL | `CASCADE` | 74 |
| `materials` | `company_id` NOT NULL | `CASCADE` | 87 |
| `material_categories` | `company_id` NOT NULL | `CASCADE` | 94 |
| `customers` | `company_id` NOT NULL | `CASCADE` | 119 |
| `work_orders` | `company_id` NOT NULL | `CASCADE` | 218 |
| `work_sessions` | `company_id` NOT NULL | `CASCADE` | 143 |
| `device_logs` | `company_id` NOT NULL | `CASCADE` | 239 |
| `company_settings` | `company_id` NOT NULL UNIQUE | `CASCADE` | 197 |

### 2.3 Tabele BEZ `company_id` (dane podrzędne)

| Tabela | Uzasadnienie |
|--------|-------------|
| `session_photos` | FK → `work_sessions` (kaskada) |
| `gps_logs` | FK → `work_sessions` (kaskada) |
| `session_notes` | FK → `work_sessions` (kaskada) |
| `customer_locations` | FK → `customers` (kaskada) |
| `resource_to_categories` | FK → `resources` + `resource_categories` (obie z `company_id`) |
| `material_to_categories` | FK → `materials` + `material_categories` (obie z `company_id`) |

**Wniosek:** Model danych jest poprawny — izolacja przez `company_id` na głównych tabelach, podrzędne chronione przez kaskadę FK.

---

## 3. Warstwa API — izolacja tenantów

### 3.1 Mechanizm guardów

Każdy endpoint API używa jednego z:

- [`requireCompanyScopedSession()`](src/lib/apiTenant.ts:30) — zwraca `{ companyId, session }` dla admin/viewer/worker.
- [`requireWorkerCompanySession()`](src/lib/apiTenant.ts:10) — to samo + gwarantuje `userId`.
- [`requireSuperadminSession()`](src/lib/apiPlatform.ts) — tylko dla platformy.

Wszystkie korzystają z [`resolveTenantCompanyId()`](src/lib/tenantContext.ts:29) — bierze `companyId` z JWT, a w razie legacy JWT bez `companyId` — z DB.

### 3.2 Endpointy API — pokrycie guardami

| Grupa endpointów | Guard | Uwagi |
|-----------------|-------|-------|
| `GET /api/admin/*` | `requireCompanyScopedSession` | ✅ |
| `POST /api/admin/work-orders` | Ręczny `jwtVerify` + `companyId` z payloadu | ⚠️ Inline, ale działa |
| `DELETE /api/admin/work-sessions/[id]` | `requireCompanyScopedSession` | ✅ |
| `GET/POST /api/worker/*` | `requireWorkerCompanySession` | ✅ |
| `POST /api/worker/logs` | Ręczny `jwtVerify` + `companyId` z payloadu | ⚠️ Inline, ale działa |
| `GET/POST /api/customers` | `requireCompanyScopedSession` | ✅ |
| `GET/POST /api/machines` | `requireCompanyScopedSession` | ✅ |
| `GET/POST /api/materials` | `requireCompanyScopedSession` | ✅ |
| `GET/POST /api/categories` | `requireCompanyScopedSession` | ✅ |
| `GET/POST /api/material-categories` | `requireCompanyScopedSession` | ✅ |
| `GET/POST /api/platform/*` | `requireSuperadminSession` | ✅ |
| `GET /api/geocode` | **Brak guarda** | 🚨 Publiczny — OK (geokodowanie OSM) |
| `GET/POST /api/customers/[id]/locations` | **Brak guarda tenant** | 🚨 Patrz §3.3 |
| `PUT/DELETE /api/customers/[id]/locations/[locationId]` | Tylko `guardAdminMutation` | 🚨 Patrz §3.3 |
| `PUT /api/worker/customer-locations/[id]/route` | Tylko `getAuthSession` + `userCanEditRoute` | 🚨 Patrz §3.3 |

### 3.3 LUKI: Endpointy `customer-locations` bez `companyId`

**Endpointy:**

1. [`GET /api/customers/[id]/locations`](src/app/api/customers/%5Bid%5D/locations/route.ts:6) — brak `requireCompanyScopedSession`. Każdy zalogowany użytkownik (nawet z innej firmy) może odczytać lokalizacje dowolnego klienta, znając `customerId`.

2. [`POST /api/customers/[id]/locations`](src/app/api/customers/%5Bid%5D/locations/route.ts:15) — tylko `guardAdminMutation()` (sprawdza rolę `admin`), ale **nie sprawdza przynależności klienta do firmy admina**. Admin firmy A może modyfikować lokalizacje klienta firmy B.

3. [`PUT /api/customers/[id]/locations/[locationId]`](src/app/api/customers/%5Bid%5D/locations/%5BlocationId%5D/route.ts:6) — j.w., tylko `guardAdminMutation`.

4. [`DELETE /api/customers/[id]/locations/[locationId]`](src/app/api/customers/%5Bid%5D/locations/%5BlocationId%5D/route.ts:25) — j.w.

5. [`PUT /api/worker/customer-locations/[id]/route`](src/app/api/worker/customer-locations/%5Bid%5D/route/route.ts:7) — tylko `getAuthSession()` + `userCanEditRoute()`. Worker z uprawnieniem może modyfikować trasę lokalizacji dowolnego klienta, niezależnie od firmy.

**Ryzyko:** średnie — atak wymaga znajomości `customerId` / `locationId` (int, sekwencyjny). Jednak w scenariuszu socjotechnicznym lub przy wycieku ID — możliwy dostęp do danych innej firmy.

### 3.4 LUKA: `CustomerLocationService` — brak `companyId` w zapytaniach

Serwis [`CustomerLocationService`](src/services/CustomerLocationService.ts) **nie przyjmuje parametru `companyId`** w żadnej metodzie. Wszystkie zapytania operują wyłącznie po `customerId` lub `id`, bez filtrowania po firmie. Nawet jeśli endpoint doda guarda, serwis sam w sobie nie wymusza izolacji.

---

## 4. Warstwa serwisów — `companyId` w zapytaniach

### 4.1 Serwisy z `companyId` (poprawne)

| Serwis | Metody z `companyId` |
|--------|---------------------|
| `AdminOrderService` | `getActiveWorkOrders`, `getArchivedSessions`, `updateOrder`, `deleteOrder`, `getScheduleSaveBlockCode`, `checkScheduleConflict` |
| `AdminSessionService` | `getSessionDetails`, `forceCompleteSession`, `deleteArchivedSession` |
| `AdminUserService` | `getAllUsers`, `getUserByIdForCompany`, `getWorkers`, `createUser`, `updateUser`, `deleteUser` |
| `AdminReportService` | `getDashboardSnapshot` (i metody prywatne) |
| `WorkerOrderService` | `getPendingOrders`, `acceptOrder`, `createOwnOrder` |
| `WorkerSessionService` | wszystkie metody |
| `ScheduleConflictService` | wszystkie metody |
| `SystemLogService` | `getRecentLogs`, `insertLog` |
| `DictionaryService` → `CategoryService` | wszystkie metody |
| `DictionaryService` → `MaterialCategoryService` | wszystkie metody |
| `DictionaryService` → `MaterialService` | wszystkie metody |
| `DictionaryService` → `ResourceService` | wszystkie metody |
| `DictionaryService` → `CustomerService` | wszystkie metody |
| `DictionaryService` → `SettingsService` | wszystkie metody |

### 4.2 Serwisy BEZ `companyId` (luki)

| Serwis | Problem |
|--------|---------|
| `CustomerLocationService` | Żadna metoda nie przyjmuje `companyId` — operuje tylko po `customerId`/`id` |
| `GpsService` | `getActiveSessionGpsLogs` i `saveGpsLogs` przyjmują tylko `userId` — brak `companyId`. Jednak wyszukuje po `userId` (unikalny w skali DB), więc ryzyko niskie. |

### 4.3 `GpsService` — analiza ryzyka

`GpsService.getActiveSessionGpsLogs(userId)` i `saveGpsLogs(userId, points)` nie filtrują po `companyId`. Ponieważ `userId` jest unikalny w skali całej bazy (PK), ryzyko wycieku danych między firmami jest **znikome** — nie ma dwóch użytkowników z różnych firm o tym samym `userId`. Jednak dla spójności i defense-in-depth warto dodać `companyId`.

---

## 5. Proxy (Edge Middleware) — izolacja ról

[`proxy.ts`](src/proxy.ts) poprawnie:

- Blokuje superadmina przed dostępem do `/admin`, `/worker`, `/api` (company-scoped).
- Blokuje admin/worker/viewer przed `/platform`.
- Blokuje worker/viewer przed mutacjami admin API.
- Blokuje niezalogowanych.
- Obsługuje przekierowanie z `/login` przy ważnym JWT.

**Nie implementuje** filtrowania po `companyId` — to jest zadaniem warstwy API (serwisów). Proxy sprawdza tylko role, co jest prawidłowym wzorcem.

---

## 6. Platforma (superadmin)

### 6.1 Komponenty

- [`PlatformDashboard`](src/components/Platform/PlatformDashboard.tsx) — lista firm z użyciem.
- [`PlatformCompanyTable`](src/components/Platform/PlatformCompanyTable.tsx) — CRUD firm.
- [`PlatformCompanyForm`](src/components/Platform/PlatformCompanyForm.tsx) — formularz dodawania/edycji.

### 6.2 Serwisy

- [`PlatformCompanyService`](src/services/PlatformCompanyService.ts) — CRUD firm + adminów.
- [`PlatformAnalyticsService`](src/services/PlatformAnalyticsService.ts) — agregacje użycia po firmach.

### 6.3 API

- `GET /api/platform/companies` — lista firm (superadmin).
- `POST /api/platform/companies` — tworzenie firmy + admina.
- `PATCH /api/platform/companies/[id]` — edycja firmy.
- `POST /api/platform/companies/[id]/admin` — dodawanie admina do firmy.
- `GET /api/platform/analytics` — statystyki.

Wszystkie chronione przez `requireSuperadminSession()`. **Brak zastrzeżeń.**

---

## 7. Podsumowanie luk

| # | Lokalizacja | Typ | Opis | Ryzyko |
|---|-------------|-----|------|--------|
| 1 | [`CustomerLocationService`](src/services/CustomerLocationService.ts) — wszystkie metody | Brak `companyId` | Serwis nie filtruje po firmie; operuje tylko po `customerId`/`id` | Średnie |
| 2 | [`GET /api/customers/[id]/locations`](src/app/api/customers/%5Bid%5D/locations/route.ts:6) | Brak guarda tenant | Każdy zalogowany może czytać lokalizacje dowolnego klienta | Średnie |
| 3 | [`POST /api/customers/[id]/locations`](src/app/api/customers/%5Bid%5D/locations/route.ts:15) | Brak guarda tenant | Admin firmy A może modyfikować lokalizacje klienta firmy B | Średnie |
| 4 | [`PUT /api/customers/[id]/locations/[locationId]`](src/app/api/customers/%5Bid%5D/locations/%5BlocationId%5D/route.ts:6) | Brak guarda tenant | J.w. | Średnie |
| 5 | [`DELETE /api/customers/[id]/locations/[locationId]`](src/app/api/customers/%5Bid%5D/locations/%5BlocationId%5D/route.ts:25) | Brak guarda tenant | J.w. | Średnie |
| 6 | [`PUT /api/worker/customer-locations/[id]/route`](src/app/api/worker/customer-locations/%5Bid%5D/route/route.ts:7) | Brak guarda tenant | Worker z `canEditRoute` może modyfikować trasę dowolnej lokalizacji | Średnie |
| 7 | [`GpsService`](src/services/GpsService.ts) — `getActiveSessionGpsLogs`, `saveGpsLogs` | Brak `companyId` | Nie filtruje po firmie (ale `userId` jest globalnie unikalny) | Niskie |

---

## 8. Rekomendacje

### 8.1 Krytyczne (do natychmiastowej naprawy)

1. **Dodać `companyId` do `CustomerLocationService`** — wszystkie metody powinny przyjmować `companyId` i filtrować po nim (przez JOIN z `customers` lub bezpośrednio, jeśli dodamy kolumnę).
2. **Dodać `requireCompanyScopedSession()` do wszystkich endpointów `customer-locations`** — zarówno admin, jak i worker.

### 8.2 Zalecane (w ramach najbliższego sprintu)

3. **Dodać `companyId` do `GpsService`** — dla spójności i defense-in-depth, mimo niskiego ryzyka.
4. **Rozważyć dodanie kolumny `companyId` do `customer_locations`** — uprościłoby to zapytania i wyeliminowało potrzebę JOIN-a dla izolacji. Obecnie `customer_locations` dziedziczy firmę przez `customers.companyId`.

### 8.3 Kosmetyczne / monitoring

5. **Dodać testy penetracyjne dla endpointów `customer-locations`** — symulacja żądania z innej firmy.
6. **Rozważyć audyt automatyczny** — skrypt sprawdzający, czy każdy endpoint API ma guard `companyId`.

---

## 9. Podsumowanie ogólne

Architektura multi-tenant w Werkit jest **generalnie poprawna**:

- Model danych: `companyId` na głównych tabelach, kaskady FK na podrzędnych. ✅
- Proxy (Edge): izolacja ról (superadmin vs company-scoped). ✅
- Większość serwisów: `companyId` jako parametr, filtrowanie w WHERE. ✅
- Większość endpointów API: guard `requireCompanyScopedSession()` / `requireWorkerCompanySession()`. ✅
- Platforma (superadmin): osobna ścieżka, `requireSuperadminSession()`. ✅

**Główna luka:** endpointy i serwis `customer-locations` nie mają izolacji tenantów. Wymaga to dodania `companyId` do `CustomerLocationService` i guardów do 5 endpointów.

**Dodatkowo:** `GpsService` brakuje `companyId` (niskie ryzyko, ale warto ujednolicić).

Łącznie: **2 średnie luki** (customer-locations), **1 niska** (GPS). Brak luk krytycznych.

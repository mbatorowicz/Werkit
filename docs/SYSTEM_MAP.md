# Werkit — mapa systemu (SYSTEM_MAP)

> **Cel:** referencja „kto, gdzie, jak”. Każda tabela DB, endpoint API, serwis, hook i ważny komponent w jednym miejscu.
> Zaktualizuj ten plik **w tym samym PR** co zmianę struktury — inaczej traci sens.
>
> Plik towarzyszący: [`AGENTS.md`](../AGENTS.md) (zasady pracy), [`ARCHITECTURE.md`](../ARCHITECTURE.md) (warstwy i wzorce), [`TECH_DEBT_ROADMAP.md`](./TECH_DEBT_ROADMAP.md) (plan redukcji długu — **SSOT planu**, nie duplikuj go tutaj w rozmiarze essay).

---

## 1. Wersje, środowiska, deploy

| Element | Wartość |
|---|---|
| Wersja aplikacji | **SSOT: `package.json#version`** — wstrzykiwana do UI jako `APP_VERSION` w `src/lib/version.ts` (z dopiskiem 7-znakowego SHA z `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`). Android: `versionName` czytane dynamicznie z `package.json` w `build.gradle`; `versionCode` wyliczane z semver (`major*10000 + minor*100 + patch`). Nie hardkoduj wersji poza `package.json`. |
| Framework | **Next.js 16.2.4**, React 19.2.4, App Router. |
| Runtime API | Domyślne Vercel Node.js (hasło: **`passwordCrypto`** — domyślnie natywny `bcrypt`, opcjonalnie `bcryptjs` przez `WERKIT_USE_BCRYPTJS`). Tras **edge** brak. |
| Hosting | Vercel + custom domain `https://werkit.cncsolutions.dev/`. |
| Mobilka | Capacitor 8 (`capacitor.config.ts → server.url = 'https://werkit.cncsolutions.dev/'`). WebView ładuje produkcję; natywne wtyczki: `@capacitor/app`, `@capacitor/local-notifications`, `@capacitor-community/background-geolocation`, `@capgo/capacitor-native-biometric`. APK: jeden uniwersalny build debug z GitHub Release `android-latest` (`werkit.apk` + `werkit-apk-meta.json`). |
| Lokalny dev | `npm run dev` na porcie 3000. Baza: `DATABASE_URL` / `POSTGRES_URL` w `.env.local` (nie commituj). |
| Domyślny język | `'pl'` (zob. `src/i18n/index.ts`); locale dat/czasu: `DEFAULT_UI_LOCALE = 'pl-PL'`, strefa UI (SSR + hydracja): `DEFAULT_UI_TIMEZONE = 'Europe/Warsaw'` (`src/i18n/constants.ts`; formaty w `src/i18n/format.ts`). |

---

## 2. Konwencja warstw (powtórka)

```
Klient (PWA/WebView) ── HTTP ──▶ Next.js
                                  │
                          src/proxy.ts (JWT + role, Edge proxy)
                                  │
                ┌─────────────────┼─────────────────┐
                │                                   │
       Route Handler `route.ts`         Server Component `page.tsx`
                │                                   │
                └────────► src/services/* ◀─────────┘
                                  │
                              `src/db/index.ts` (Drizzle)
                                  │
                              Neon Postgres
```

**Reguła**: kod w `src/app/**` **nie importuje** `@/db` ani `@/db/schema` — wszystkie zapytania w **`src/services/*`** (w tym wykrywanie konfliktów harmonogramu: **`ScheduleConflictService`** + delegacja z `AdminOrderService.checkScheduleConflict`).

---

## 3. Schemat bazy (`src/db/schema.ts`)

| Tabela | Klucz biznesowy | Najważniejsze kolumny | Relacje (ON DELETE) |
|---|---|---|---|
| `companies` | `slug` (unique) | `id`, `name`, `is_active`, `created_at` | — (multi-tenant; patrz **0017**) |
| `users` | `username_email` (unique, **case-insensitive** w zapytaniu — `lower(...)`) | `id`, `company_id`, `full_name`, `password_hash`, `role` ∈ `admin\|worker\|viewer\|superadmin`, `is_active`, `can_create_own_orders`, `can_edit_route`, `can_create_customers`, `notifications_enabled`, `biometric_login_enabled`, `device_unique_id`, **`reports_to_id?`** (opcjonalny przełożony — FK self) | `company_id → companies.id` (restrict); `reports_to_id → users.id` (set null). Migracja **0028**. |
| `resource_categories` | `name` (per `company_id`) | **`company_id`**, **`parent_id`**, **`is_group`**, **`sort_order`**, … | `company_id → companies.id` (cascade) |
| `resources` (= zasoby w rejestrze) | display `name` | **`company_id`**, `brand`, `model`, … | `company_id → companies.id` (cascade) |
| `resource_to_categories` | `(resource_id, category_id)` | wielokrotne kategorie maszyny | cascade z `resources` i `resource_categories` |
| `materials` | `id` | **`company_id`**, `name` | `company_id → companies.id` (cascade) |
| `material_categories` | `id` | **`company_id`**, `name`, **`parent_id`**, … | `company_id → companies.id` (cascade) |
| `material_to_categories` | PK `(material_id, category_id)` | linki N↔M | cascade z `materials` i `material_categories` |
| `customers` | `id` | `company_id`, `first_name?`, `last_name`, `default_address?`, `latitude?`, `longitude?` | `company_id → companies.id` (cascade) |
| `customer_locations` | `id` | `customer_id`, `label`, `address?`, `latitude`, `longitude`, `is_default`, `sort_order`, `route_waypoints` (jsonb) | `customer_id → customers.id` (cascade); migracja **0015** |
| `work_orders` | `id` | `company_id`, `user_id` (przypisany pracownik), `resource_id`, `category_id`, `material_id?`, `customer_id?`, `customer_location_id?`, `task_description?`, `status` ∈ **`PENDING`** (kolejka dyspozycji) **\|`IN_PROGRESS`** (worker zaakceptował; żywa sesja `work_sessions`) **\|`COMPLETED`** **\|`CANCELLED`**, `quantity_tons?`, `expected_duration_hours?`, **`priority` ∈ `URGENT\|HIGH\|NORMAL\|LOW`** (CHECK `work_orders_priority_chk`), `due_date?`, `locked_until?`, `created_by_id?`, `created_at` | `company_id → companies.id` (cascade); `user_id`/`created_by_id → users.id` (cascade/set null), `resource_id → resources.id` (set null), `category_id → resource_categories.id` (set null), `customer_location_id → customer_locations.id` (set null) |
| `work_sessions` | `id` | **`company_id`**, `work_order_id?`, `user_id`, … (status, GPS bookend, itd.) | `company_id → companies.id` (cascade); `work_order_id → work_orders.id` (set null), … |
| `session_photos` | `id` | `work_session_id`, `photo_url` (data URL JPEG, kompresja 800px/0.7 po stronie klienta), `photo_type` ∈ `START\|END\|AD_HOC`, `latitude?`, `longitude?`, `created_at` | cascade z `work_sessions` |
| `gps_logs` | `id` | `work_session_id`, `latitude`, `longitude`, `timestamp` | cascade z `work_sessions` |
| `session_notes` | `id` | `work_session_id`, `note`, `latitude?`, `longitude?`, `created_at` | cascade z `work_sessions` |
| `company_settings` | per `company_id` (unique) | **`company_id`**, `company_name`, `cancel_window_minutes`, geofence, przypomnienia, **feature flags** (`gps_tracking_enabled`, `map_view_enabled`, `geofencing_enabled`, `route_planning_enabled`, `navigation_enabled`, `dur_enabled`), … | `company_id → companies.id` (cascade) |
| `device_logs` | `id` | `user_id?`, `level` ∈ `INFO\|WARN\|ERROR\|DEBUG`, `message`, `metadata: jsonb`, `created_at` | `user_id → users.id` (cascade) |
| `spare_part_categories` | `name` (per `company_id`) | **`company_id`**, **`parent_id`**, **`is_group`**, **`sort_order`**, `color` | `company_id → companies.id` (cascade) |
| `spare_parts` | `id` | **`company_id`**, `name`, `catalog_number?`, `manufacturer?`, `unit`, `purchase_price?` (numeric), `description?`, `min_stock` (numeric, default 0), `location?`, `image_url?`, `is_active`, `created_at` | `company_id → companies.id` (cascade) |
| `spare_part_to_categories` | PK `(part_id, category_id)` | link N↔M części ↔ kategorie części | cascade z `spare_parts` i `spare_part_categories` |
| `resource_groups` | `id` | **`company_id`**, `name`, `description?`, `sort_order` | typ maszyny (np. kapsułkarka 02A) — **nie** kategorie zleceń |
| `resources.resource_group_id` | FK | przypisanie egzemplarza zasobu do grupy maszyn | `resource_groups` (set null) |
| `spare_part_machine_compatibility` | PK `(part_id, resource_group_id)` | link N↔M części ↔ **grupy maszyn** (`resource_groups`); `notes?` | cascade z `spare_parts` i `resource_groups` |
| `work_order_spare_parts` | `id` | **`work_order_id`**, **`part_id`**, `quantity` (numeric, default 1), `unit_price` (numeric), `notes?`, `created_at` | `work_order_id → work_orders.id` (cascade); `part_id → spare_parts.id` (cascade) |
| `spare_part_inventory` | PK `(part_id, company_id)` | **`part_id`**, **`company_id`**, `quantity` (numeric, default 0), `updated_at` | `part_id → spare_parts.id` (cascade); `company_id → companies.id` (cascade) |
| `stock_receipts` | `id` | **`company_id`**, **`part_id`**, `quantity` (numeric), `unit_price` (numeric), `invoice_number?`, `notes?`, `created_by_id?`, `created_at` | `company_id → companies.id` (cascade); `part_id → spare_parts.id` (cascade); `created_by_id → users.id` (set null) |
| `stock_issues` | `id` | **`company_id`**, **`part_id`**, `quantity` (numeric), **`work_order_id?`**, `notes?`, `created_by_id?`, `created_at` | `company_id → companies.id` (cascade); `part_id → spare_parts.id` (cascade); `work_order_id → work_orders.id` (set null); `created_by_id → users.id` (set null) |
| `departments` | `name` (per `company_id`) | **`company_id`**, `name`, **`parent_id?`**, **`manager_id?`** (kierownik działu → `users`), `sort_order` | `company_id → companies.id` (cascade); `parent_id` self-ref (set null); `manager_id → users.id` (set null). Migracja **0021**. |
| `teams` | `name` (per departament) | **`company_id`**, **`department_id`**, `name`, **`leader_id?`** (lider → `users`), `sort_order` | `department_id → departments.id` (cascade); `leader_id → users.id` (set null). |
| `team_members` | PK `id` | **`team_id`**, **`user_id`**, **`role`** ∈ `leader\|member`, `joined_at` | `team_id → teams.id` (cascade); `user_id → users.id` (cascade). **SSOT lidera:** `teams.leader_id` synchronizowany w `OrganizationService` z wpisem `role='leader'`. |

### 3.1. Drizzle relations

`usersRelations` ⟶ many `workSessions` · `workSessionsRelations` ⟶ user/resource/material/customer + many photos/gpsLogs/notes · `workOrdersRelations` ⟶ user/resource/material/customer.

### 3.2. Migracje (kolejne `drizzle/*.sql`)

| Idx | Plik | Co robi |
|---:|---|---|
| 0000 | `0000_stormy_dakota_north.sql` | Initial schema |
| 0001 | `0001_whole_infant_terrible.sql` | Pierwsze rozszerzenia |
| 0002 | `0002_violet_lord_tyger.sql` | Dalsze zmiany schematu |
| 0003 | `0003_work_orders_priority_chk.sql` | UPDATE + `CHECK work_orders_priority_chk` na `priority ∈ {URGENT,HIGH,NORMAL,LOW}` |
| 0004 | `0004_users_biometric_login.sql` | `users.biometric_login_enabled boolean NOT NULL DEFAULT false` |
| 0005 | `0005_material_categories.sql` | Tabele `material_categories` + `material_to_categories` |
| 0006 | `0006_resources_vehicle_identity.sql` | `resources.brand/model/registration_number` (NOT NULL DEFAULT '') |
| 0007 | `0007_resource_categories_stationary.sql` | `resource_categories.is_stationary` + UPDATE „WARSZTAT/WORKSHOP” = true |
| 0008 | `0008_work_sessions_bookend_coords.sql` | `work_sessions.start_latitude/longitude` + `end_latitude/longitude` |
| 0009 | `0009_materials_drop_type.sql` | `ALTER materials DROP COLUMN type` — tylko kategorie materiałów |
| 0010 | `0010_resource_categories_visibility.sql` | `resource_categories.show_*` (boolean NOT NULL DEFAULT true) — **bez** powiązania z `is_stationary` |
| 0011 | `0011_undo_stationary_auto_hide_fields.sql` | Cofnięcie ewentualnego `UPDATE` z wczesnej wersji 0010: `show_material`/`show_quantity` = true tylko gdy `is_stationary` oraz oba `show_*` były `false` (podpis starej automatyzacji) |
| 0012 | `0012_resources_description_category_resource_fields.sql` | `resources.description`; na `resource_categories`: `show_resource_name`, `show_resource_description`, `show_registration_number` |
| 0013 | `0013_work_orders_in_progress_status.sql` | Backfill: `work_orders.status = 'IN_PROGRESS'` tam, gdzie jest powiązana sesja `work_sessions.status = 'IN_PROGRESS'` (naprawa stanów po zmianie semantyki vs stary marker `COMPLETED`). |
| 0014 | `0014_drop_legacy_session_type_resource_category.sql` | `DROP COLUMN session_type` z `work_sessions` i `work_orders`; `DROP COLUMN category_id` z `resources` (N↔M tylko przez `resource_to_categories`). **Kolejność wdrożenia:** uruchom **0014** na Postgres **przed lub razem z** deployem wersji aplikacji bez tych pól — stara baza z `NOT NULL session_type` zrzuci INSERT sesji/zlecenia. |
| 0016 | `0016_category_hierarchy.sql` | `parent_id`, `is_group`, `sort_order` na `resource_categories` i `material_categories` (grupy tylko w adminie; przypisania i zlecenia — liście). |
| 0015 | `0015_customer_locations_planned_route.sql` | Tabela `customer_locations`; `users.can_edit_route`; `work_orders.customer_location_id`; backfill lokalizacji z `customers`. |
| 0017 | `0017_multi_company.sql` | Tabela `companies`; `company_id` na encjach operacyjnych (users, słowniki, zlecenia, sesje, ustawienia firmy); backfill `company_id = 1`. |
| 0018 | `0018_users_can_create_customers.sql` | `users.can_create_customers boolean NOT NULL DEFAULT false`. |
| 0019 | `0019_performance_indexes.sql` | Indeksy wydajnościowe: `work_orders(company_id, status)`, `work_sessions(company_id, user_id, status)`, `gps_logs(work_session_id, timestamp)`, `device_logs(company_id, created_at)`, `session_photos(work_session_id)`, `session_notes(work_session_id)`. |
| 0020 | `0020_dur_spare_parts.sql` | Moduł DUR: tabele `spare_part_categories`, `spare_parts`, `spare_part_to_categories`, `spare_part_machine_compatibility` + indeksy. |
| 0021 | `0021_order_types_org_feature_flags.sql` | `resource_categories.order_type` (`machine_work` / `machine_repair`), `company_settings.enable_worker_wizard`, `company_settings.enable_worker_order_accept`. |
| 0022 | `0022_dur_warehouse.sql` | Tabele `work_order_spare_parts`, `spare_part_inventory`, `stock_receipts`, `stock_issues` + indeksy. |
| 0023 | `0023_feature_flags_dur.sql` | `company_settings.dur_enabled` — feature flag dla modułu DUR (domyślnie `false`). |

### 3.3. Weryfikacja pokrycia DB ↔ kod (`schema.ts`)

- **`npm run db:verify-schema`** — uruchamia `src/scripts/verify_schema_alignment.ts`: odczyt `information_schema.columns` i porównanie z kanoniczną listą kolumn **zsynchronizowaną z `src/db/schema.ts`** (brak wymaganej kolumny → exit code `1`).
- Przy **każdej zmianie kolumn** w `schema.ts` agent aktualizuje **również** tablicę `EXPECTED` w tym skrypcie (jedna zmiana = dwa pliki).

**Status migracji na produkcji** (2026-05-11): **Jedna kanoniczna procedura** po zmianie oczekiwań wobec bazy (skrypty idempotentne pod aktualny kod): **`npm run db:napraw-wszystko-i-zweryfikuj`** = `db:napraw-wszystko` (kolejno m.in. **0006–0009**, **0010/0011**, **0012** — patrz `package.json`) **oraz** `db:verify-schema`. **Migracja Drizzle `0013`/`0014`** (statusy zleceń + DROP legacy kolumn) uruchamiane przez **`npm run db:migrate`** lub ręczne SQL na Neon — **po deployu** kodu oczekującego nowego schematu. Alternatywnie ten sam efekt dwoma krokami ręcznie: najpierw `npm run db:napraw-wszystko`, potem `npm run db:verify-schema`. Katalog `drizzle/*.sql` + `meta/_journal.json` zachowuje historię i jest SSOT dla review; wdrożenie na Neon często odbywa się przez te skrypty (`tsx`) lub `psql`, a nie przez automatyczny hook w buildzie Vercela. **`npm run db:migrate`** (`drizzle-kit migrate`) pozostaje osobną ścieżką oficjalnego pipeline’u Drizzle — nie zastępuje skryptów `apply_*`, dopóki zespół nie zunifikuje procesu. **Historia:** wcześniej na części środowisk pominięto **0004** (`users.biometric_login_enabled`) — objaw: `Failed query … users` / „Wewnętrzny Błąd Serwera”; naprawa ręcznym SQL lub skryptami słownika. W `src/app/api/auth/login/route.ts` funkcja `isLikelyDatabaseOrInfraError` mapuje typowe błędy schematu na **503 `service_unavailable`** (wzorce m.in. `Failed query`, `column … does not exist`, `NeonDbError`).

**Drizzle nie ma zaczepionej automatycznej migracji w build/start.** Kolejność wdrożenia migracji na bazę produkcyjną jest manualna (skrypty `tsx src/scripts/apply_*.ts` lub bezpośrednie `psql`). Patrz `ARCHITECTURE.md §9` i `package.json#scripts`.

---

## 4. Routing — strony (`src/app/**/page.tsx`)

| Ścieżka | Rodzaj | Główny komponent UI | Opis | Layout |
|---|---|---|---|---|
| `/` | RSC | — | `redirect('/login')` | root |
| `/login` | Client (`use client`) | treść w `login/page.tsx` | Login + biometryczny przycisk; POST `/api/auth/login` | root |
| `/privacy-policy` | static | treść w `privacy-policy/page.tsx` | Polityka prywatności | root |
| `/admin` | RSC | `OrdersClient` | Zlecenia (Gantt, kategorie zleceń, planowanie); `features/admin/orders/OrdersClient.tsx` | `admin/layout.tsx` |
| `/admin/orders` | RSC | — | Legacy redirect → `/admin` (zachowuje query, np. `?open=` z Gantta) | admin |
| `/admin/users` | RSC | `UsersClient` | Konta admin/viewer/worker + flagi uprawnień (`features/admin/users/UsersClient.tsx`) | admin |
| `/admin/machines` | RSC | `MachinesClient` | Typy zasobów (zwijany blok) + rejestr zasobów (`features/admin/machines/MachinesClient.tsx`) | admin |
| `/admin/customers` | RSC | `CustomersClient` | Klienci CRUD + lokalizacje + geocode (`features/admin/customers/`) | admin |
| `/admin/materials` | RSC | `MaterialsClient` | Materiały + kategorie materiałów (`features/admin/materials/MaterialsClient.tsx`) | admin |
| `/admin/reports` | RSC | `ReportsDashboard` | SSR: `AdminReportService.getDashboardSnapshot` → `components/Admin/Reports/ReportsDashboard.tsx` | admin |
| `/admin/settings` | RSC | `SettingsForm` | Ustawienia firmy (tenant) (`admin/settings/SettingsForm.tsx`) | admin |
| `/admin/logs` | RSC | `LogsClient` | Logi urządzeń (`features/admin/logs/LogsClient.tsx`; filtrowane po `companyId`) | admin |
| `/admin/dur/warehouse` | RSC | `WarehouseClient` | Magazyn: kategorie + katalog (`SparePartsClient` embedded) + przyjęcia/wydania (`StockMovementsClient`) | admin |
| `/admin/dur/spare-parts` | RSC | redirect → `warehouse` | Legacy URL | admin |
| `/admin/dur/spare-part-categories` | RSC | redirect → `warehouse` | Legacy URL — kategorie na stronie Magazyn | admin |
| `/platform` | RSC | `PlatformDashboard` | Panel superadmin: firmy, analityka użycia, feature flags (`components/Platform/PlatformDashboard.tsx`, `FeatureFlagsSection`) | `platform/layout.tsx` |
| `/worker` | RSC | `WorkerClient` | SSR ładuje zlecenia/sesję → aktywna sesja, lista `PENDING`, GPS, notatki, zdjęcia (`worker/WorkerClient.tsx`) | `worker/layout.tsx` |
| `/worker/wizard` | RSC | `WizardClient` | Kreator własnego zlecenia (guard `canCreateOwnOrders`): 5 kroków — kategoria → maszyna → szczegóły → **termin** → podsumowanie; kroki 1–3: `AdminSearchCombobox` (client-side filter); `POST work-orders` + `accept` | worker |
| `/worker/history` | RSC | — | Lista zakończonych sesji — logika w `worker/history/page.tsx` + `OrderLabelCard` | worker |
| `/worker/history/[id]` | RSC | `MapWrapper`, `TimelineGalleryClient` | Szczegóły sesji (mapa GPS, galeria); reszta JSX w `page.tsx` | worker |
| `/worker/profile` | RSC | `ProfileSettings` | Profil: notyfikacje, dźwięki alarmów, biometria (`features/worker/components/profile/ProfileSettings.tsx`) | worker |
| `/worker/help` | RSC | `HelpAccordion` | Akordeon pomocy (`components/HelpAccordion.tsx`) | worker |

### 4.1. Layout `admin`
- `force-dynamic`. Pobiera `companyName` z `DictionaryService.getSettings()`, weryfikuje JWT z cookie i przekazuje `canMutate` (rola=`admin`) przez `AdminAbilityProvider`.
- Sidebar (desktop) + `MobileAdminNav` (mobile). Stopka z ikonką użytkownika i `LogoutButton`.
- Sidebar **DUR**: `/admin/dur/warehouse` (Magazyn — katalog części + przyjęcia/wydania). Legacy: `/admin/dur/spare-parts`, `/admin/dur/spare-part-categories` → `warehouse`; `/admin/dur/resource-groups` → `/admin/machines`. Typy zasobów (`resource_groups`): zwijany blok na `/admin/machines`. Kategorie zleceń (`resource_categories`): drzewo na `/admin` w `OrdersCategoriesPanel`.

### 4.2. Layout `worker`
- `force-dynamic`. Pobiera `companyName` + nazwę zalogowanego użytkownika.
- Montuje **`<GlobalErrorHandler />`** (window `error` + `unhandledrejection` → `sendRemoteLog('ERROR', ...)`).
- Hardware back (Android): patrz root `app/layout.tsx` — **`CapacitorBackButton`** (cała aplikacja mobilna).
- Bottom nav: `Sesja / Historia / Profil / Pomoc` z `pb-safe`.

### 4.3. Layout `platform`
- `force-dynamic`. Tylko rola **`superadmin`** (JWT); inne role → redirect z `proxy.ts`.
- Superadmin **nie** ma `companyId` w scope operacyjnym — zarządza wieloma firmami z `/platform` i `/api/platform/*`.

---

## 5. Routing — API (`src/app/api/**/route.ts`)

Klasyfikacja zgodna z `src/proxy.ts`:

- **`/api/auth/*`** — publiczne (sam login/logout).
- **`/api/worker/*`** — wymaga roli `worker` lub `admin` (cookie JWT).
- **`/api/platform/*`** — wymaga roli **`superadmin`** (`requireSuperadminSession` w `src/lib/apiPlatform.ts`).
- **`/api/machines`, `/api/materials`, `/api/customers`, `/api/categories`, `/api/resource-groups`** — `SHARED_API_PREFIXES`. `resource-groups` = CRUD **grup maszyn** (`ResourceGroupService`), nie kategorie zleceń. **GET**: `worker|admin|viewer`. **Mutacje** (`POST/PUT/PATCH/DELETE`): domyślnie tylko `admin`; **wyjątek**: worker z `can_create_customers` może `POST /api/customers` (proxy + `guardCustomerCreate()` w handlerze).
- **Wszystko inne pod `/api/`** — domyślnie traktowane jako `admin API` (deny-by-default), wymaga roli `admin|viewer` na GET, `admin` na mutacjach.

### 5.1. Auth

| Endpoint | Metoda | Body / opis | Response |
|---|---|---|---|
| `/api/auth/login` | POST | `{usernameEmail, password}` (lowercase + trim po stronie serwera) | 200 `{success, user:{id,fullName,role}}` + cookie `auth_token` (`HttpOnly, Secure, SameSite=None, 7d`); 400 `invalid_payload\|missing_credentials`; 401 `invalid_credentials`; 403 `account_blocked`; 503 `service_unavailable` (DB); 500 `server_error`. |
| `/api/auth/logout` | POST | brak | 200 + delete cookie |

### 5.2. Worker

| Endpoint | Metoda | Funkcja |
|---|---|---|
| `/api/worker/work-orders` | GET | `WorkerOrderService.getPendingOrders(userId)` — sortowanie po `dueDate`, potem `createdAt` |
| `/api/worker/work-orders` | POST | `WorkerOrderService.createOwnOrder` — tylko gdy `users.can_create_own_orders`; `userId` z sesji (ignoruje body); bez `forceSave`; 409 `schedule_conflict` / `resource_busy` |
| `/api/worker/work-orders/schedule-conflicts` | GET `?userId&resourceId&dueDate?&expectedDurationHours?&excludeOrderId?` | Podgląd konfliktów (worker scope — `userId` musi = zalogowany); bez terminu → tylko `resource_busy` (aktywna sesja na zasobie) |
| `/api/worker/work-orders/[id]/accept` | POST `{latitude?,longitude?}` | `WorkerOrderService.acceptOrder` — walidacja `session_active`, `schedule_conflict`, `resource_busy`; `work_orders.status='IN_PROGRESS'`, INSERT `work_sessions` |
| `/api/worker/session` | GET | `WorkerSessionService.getActiveSessionWithDetails(userId)` — sesja + ustawienia + user (z `notificationsEnabled`/`canCreateOwnOrders`) |
| `/api/worker/session` | POST `{resourceId, categoryId, …}` | Wizard legacy — `createWizardSession` (nadal dostępne; **nowy wizard** tworzy `POST work-orders` + `accept`) |
| `/api/worker/session` | PUT `{latitude?, longitude?}` | `endActiveSession` — ustawia `COMPLETED` + `end_time` + bookend GPS |
| `/api/worker/session/cancel` | POST | `cancelActiveSession` — przywraca powiązane `workOrder.status='PENDING'`, kasuje sesję |
| `/api/worker/session/notes` | POST `{note, location?:{lat,lng}}` | `addNote` |
| `/api/worker/session/notes` | PUT `{noteId, note}` | `updateNote` (z weryfikacją że nota należy do aktywnej sesji usera) |
| `/api/worker/session/photos` | POST `{photoUrl, location?}` | `addPhoto` (`photo_type='AD_HOC'`) |
| `/api/worker/gps` | GET | `GpsService.getActiveSessionGpsLogs(userId)` — logi po `timestamp` |
| `/api/worker/gps` | POST `Coord \| Coord[]` | `GpsService.saveGpsLogs` — przyjmuje pojedynczy punkt **lub tablicę** (offline sync z `GPSManager.flushQueue`) |
| `/api/worker/profile` | POST `{notificationsEnabled?:bool, biometricLoginEnabled?:bool, password?:string}` | Notyfikacje + włączenie biometrii (wymaga roli `worker` + weryfikacji hasła `bcrypt.compare`) |
| `/api/worker/logs` | POST `{level, message, metadata?}` | `SystemLogService.insertLog` — używane przez `sendRemoteLog` (z `keepalive:true`) |
| `/api/worker/customer-locations/[id]/route` | PUT `{waypoints}` | `CustomerLocationService.setRouteWaypoints` — wymaga `AdminUserService.userCanEditRoute` |
| `/api/worker/work-orders/[id]/spare-parts` | GET | `WorkOrderSparePartService.getPartsForOrder(workOrderId)` — lista części w zleceniu (widok pracownika) |
| `/api/worker/work-orders/[id]/spare-parts` | POST `{partId, quantity?, notes?}` | `WorkOrderSparePartService.addPartToOrder` — dodanie części (wydanie z magazynu przez pracownika w trakcie naprawy) |
| `/api/worker/work-orders/[id]/spare-parts/[partId]` | DELETE | `WorkOrderSparePartService.removePartFromOrder` — usunięcie części ze zlecenia (pracownik) |
| `/api/worker/delegation-targets` | GET | `DelegationScopeService.getDelegatableWorkers` — aktywni workerzy w zasięgu lidera/kierownika (picker delegacji w workerze) |
| `/api/worker/delegations` | POST | `WorkerDelegationService.createDelegatedOrder` — tworzy `PENDING` z `created_by_id = actor`; `assertCanDelegateTo` + walidacja kategorii/harmonogramu |

### 5.3. Platform (superadmin)

| Endpoint | Metoda | Funkcja |
|---|---|---|
| `/api/platform/companies` | GET | `PlatformCompanyService.listCompanies` |
| `/api/platform/companies` | POST | `PlatformCompanyService.createCompanyWithAdmin` (opcjonalnie konto admina firmy) |
| `/api/platform/companies/[id]` | PUT | `PlatformCompanyService.updateCompany` |
| `/api/platform/companies/[id]/admin` | POST | `PlatformCompanyService.createCompanyAdmin` |
| `/api/platform/feature-flags/[companyId]` | GET | `PlatformFeatureFlagService.getFlags` |
| `/api/platform/feature-flags/[companyId]` | PUT | `PlatformFeatureFlagService.updateFlags` |
| `/api/platform/analytics` | GET | `PlatformAnalyticsService.getCompaniesUsageOverview` |

### 5.4. Admin (deny-by-default → tylko admin/viewer)

| Endpoint | Metoda | Funkcja |
|---|---|---|
| `/api/admin/work-orders` | GET | `AdminOrderService.getActiveWorkOrders` — tylko **`PENDING`** (kolejka dyspozycji) |
| `/api/admin/work-orders` | POST | `guardDispatchMutation` (admin **lub** lider/kierownik z org) → tworzy zlecenie + `DelegationScopeService.assertCanDelegateTo` na `userId` + walidacja kategorii + konflikt harmonogramu. 403 `forbidden` / `invalid_assignee`. UI: panel inline w `OrderFormModal`. |
| `/api/admin/work-orders/schedule-conflicts` | GET | Podgląd konfliktów (admin); bez terminu → konflikty `resource_busy` |
| `/api/admin/work-orders/[id]` | PUT | `guardDispatchMutation` + `assertCanDelegateTo` przy zmianie `userId`; `assertOrderEntitiesBelongToCompany`; edycja (sprawdza `not_pending`); konflikt harmonogramu (+ `forceSave`) |
| `/api/admin/work-orders/[id]` | DELETE | Usuwa zlecenie + sesje pochodne (transakcja) |
| `/api/admin/archive` | GET | `AdminOrderService.getArchivedSessions` (limit 500) |
| `/api/admin/logs/export` | GET | `SystemLogService.getRecentLogs(DEVICE_LOGS_EXPORT_MAX)` → JSON z `device_logs`; limity w `src/lib/deviceLogLimits.ts`; GET dla ról admin, viewer |
| `/api/admin/work-sessions/[id]` | GET | `AdminSessionService.getSessionDetails` — logi GPS + zdjęcia + notatki |
| `/api/admin/work-sessions/[id]` | DELETE | Body JSON `{ password }` → `AdminUserService.verifyPasswordForUserId` (zalogowany admin); potem `deleteArchivedSession`. 400 `admin_password_required`, 401 `invalid_credentials`, 409 `session_still_active` |
| `/api/admin/work-sessions/[id]/force-complete` | POST | `forceCompleteSession` — ratunek dla zawieszonej `IN_PROGRESS` |
| `/api/admin/users` | GET | `AdminUserService.getAllUsers` + `orgProfile` (skrót badge'y) z `DelegationScopeService.getOrgProfilesForCompany` |
| `/api/admin/users/delegatable` | GET | `DelegationScopeService.getDelegatableWorkers` — lista do pickera dyspozycji (scoped: tylko podlegli; admin: wszyscy aktywni workerzy) |
| `/api/admin/users/[id]` | GET | Szczegóły użytkownika + pełny `orgProfile` (`getUserOrgProfile`) |
| `/api/admin/users` | POST | Rejestracja konta + `bcrypt.hash(password, 10)`; worker: opcjonalne `reportsToId`, `teamId` (przypisanie zespołu po `createUser`); `23505 → user_exists`, `invalid_team` |
| `/api/admin/users/[id]` | PUT | Edycja konta (z opcjonalnym hash hasła); worker: `reportsToId`, `teamId` → `replaceUserTeamAssignment` |
| `/api/admin/users/[id]` | DELETE | Usunięcie konta |
| `/api/admin/settings` | GET | `DictionaryService.getSettings()` |
| `/api/admin/settings` | POST | `DictionaryService.updateSettings` (upsert id=1) |
| `/api/geocode?q=...` | GET | Proxy do Nominatim (OSM) — `User-Agent: WerkitERP/1.9` |
| `/api/admin/work-orders/[id]/spare-parts` | GET | `WorkOrderSparePartService.getPartsForOrder(workOrderId)` — lista części w zleceniu naprawy |
| `/api/admin/work-orders/[id]/spare-parts` | POST `{partId, quantity?, unitPrice?, notes?}` | `WorkOrderSparePartService.addPartToOrder` — dodanie części do zlecenia (admin) |
| `/api/admin/work-orders/[id]/spare-parts/[partId]` | PATCH `{quantity?, unitPrice?, notes?}` | `WorkOrderSparePartService.updatePartInOrder` — aktualizacja ilości/ceny/notatek |
| `/api/admin/work-orders/[id]/spare-parts/[partId]` | DELETE | `WorkOrderSparePartService.removePartFromOrder` — usunięcie części ze zlecenia |

### 5.5. Słowniki (SHARED — admin pisze, wszyscy zalogowani czytają)

Każda trasa w `categories|customers|materials|machines|material-categories` ma ten sam wzorzec: `GET (DictionaryService.get*) `, `POST (DictionaryService.add*)`, `PUT/DELETE` przez `[id]/route.ts`. Mutacje za `guardAdminMutation()`. **`POST /api/customers`** zwraca `{ customerId }` (inline tworzenie w modalu zlecenia). Dodatkowo handlery wykrywają **brakujące migracje** (`isMissingResourcesVehicleColumns`, `isMissingMaterialCategoriesTables`, `isMissingResourceCategoriesStationaryColumn`) → 503 z czytelnym kluczem (`migration_required`, `migration_material_categories`).

**Materiały:** `POST/PUT /api/materials` — ciało `{ name, categoryIds }`; **co najmniej jedna** kategoria (`categoryIds.length ≥ 1`), inaczej **400** `missing_material_category`. Kolumna `materials.type` usunięta migracją **0009** (`DictionaryService.addMaterial(name, categoryIds)`).

### 5.6. DUR (części zamienne)

Endpointy pod `/api/dur/*` — chronione przez deny-by-default (admin API). Mutacje przez `guardAdminMutation()`.

| Endpoint | Metoda | Funkcja |
|---|---|---|
| `/api/dur/spare-parts` | GET | `SparePartService.getParts(companyId, { compatibleWithCategoryId? })` — lista części; opcjonalnie filtr po kategorii zlecenia (liść) z dopasowaniem do zapisanych **grup** maszyn |
| `/api/dur/spare-parts` | POST | `SparePartService.addPart(companyId, body)` — tworzy część + linki kategorii i kompatybilności |
| `/api/dur/spare-parts/[id]` | GET | `SparePartService.getPart(companyId, id)` — szczegóły części z linkami |
| `/api/dur/spare-parts/[id]` | PUT | `SparePartService.updatePart(companyId, id, body)` — edycja + aktualizacja linków |
| `/api/dur/spare-parts/[id]` | DELETE | `SparePartService.deletePart(companyId, id)` — usunięcie (kaskada) |
| `/api/dur/spare-part-categories` | GET | `SparePartCategoryService.getCategories(companyId, {leavesOnly?})` — drzewo kategorii; `?leavesOnly=1` zwraca tylko liście |
| `/api/dur/spare-part-categories` | POST | `SparePartCategoryService.addCategory(companyId, body)` — tworzy kategorię (grupę lub liść) |
| `/api/dur/spare-part-categories/[id]` | PUT | `SparePartCategoryService.updateCategory(companyId, id, body)` — edycja + walidacja hierarchii (`validateHierarchyPatch`) |
| `/api/dur/spare-part-categories/[id]` | DELETE | `SparePartCategoryService.deleteCategory(companyId, id)` — blokada gdy kategoria ma dzieci |

### 5.7. Organizacja (admin)

| Endpoint | Metoda | Funkcja |
|---|---|---|
| `/api/admin/organization/departments` | GET/POST | `OrganizationService.getDepartments` / `createDepartment` |
| `/api/admin/organization/departments/[id]` | PUT/DELETE | `updateDepartment` / `deleteDepartment` |
| `/api/admin/organization/teams` | GET/POST | `getTeams` / `createTeam` (sync `leaderId` ↔ `team_members`) |
| `/api/admin/organization/teams/[id]` | PUT/DELETE | `updateTeam` / `deleteTeam` |
| `/api/admin/organization/team-members` | POST | `addTeamMember` |
| `/api/admin/organization/team-members/[id]` | PUT/DELETE | `updateTeamMember` / `removeTeamMember` |
| `/api/admin/organization/tree` | GET | `OrganizationService.getDepartmentTree` + `getUnassignedWorkers` — `{ tree, unassignedUsers }` |

UI (SSOT): `src/features/admin/organization/PeopleClient.tsx` — `adminRoutes.people` (`/admin/organization`). Drzewo: `OrgHierarchyTree.tsx` (wzorzec jak katalogi: `ListSearchBar`, chevron, badge). Budowa drzewa: `src/lib/hierarchyTree.ts` (generyczny SSOT; `organizationTree.ts` deleguje). `/admin/users` → redirect na `people`. POST/PUT `/api/admin/users` przy workerze: opcjonalne `teamId` → `OrganizationService.replaceUserTeamAssignment` (błąd `invalid_team`).

---

## 6. Warstwa serwisów (`src/services/*`)

Wszystkie metody `static async` (świadomy prosty wzorzec, nie DI). Każdy serwis żyje od `import { db } from '@/db'`.

### `AdminUserService`
- `getAllUsers(companyId)` — projekcja kolumn (bez hasła).
- `getUserById(userId)`, `getUserByUsername(usernameEmail)` — case-insensitive (`lower(...)`).
- `getWorkers(companyId)` — pracownicy do dispatchera.
- `userCanEditRoute(userId) → boolean` — flaga `can_edit_route` (worker edycja trasy).
- `createUser(companyId, payload)`, `updateUser(companyId, userId, updates)`.
- `verifyPasswordForUserId(userId, plainPassword) → boolean` (bcrypt/bcryptjs).
- `deleteUser(userId)`.
- Eksport: `type UserUpdatePayload = Partial<typeof users.$inferInsert>`.

### `WorkerOrderService`
- `getPendingOrders(userId)` — JOIN: resources, materials, customers, creator (alias users), resource_categories. Sort: dueDate asc → createdAt asc. Mapuje `priority` przez `normalizeWorkOrderPriority`.
- `createOwnOrder(userId, payload)` — wymaga `canCreateOwnOrders`; INSERT `work_orders` PENDING dla siebie; bez override konfliktów; zwraca `orderId`.
- `acceptOrder(userId, orderId, startCoord?)` — walidacja harmonogramu (`schedule_conflict`, `resource_busy`, `session_active`); UPDATE order **`IN_PROGRESS`** + INSERT `workSessions IN_PROGRESS`. Zwraca `sessionId`.

### `ScheduleConflictService`
- `loadCandidates`, `findConflictsForRequest`, `findConflictsForRequestSerialized` — nakładające się zlecenia PENDING/IN_PROGRESS i aktywne sesje dla pracownika/zasobu.
- `findResourceBusyConflicts` — aktywna sesja IN_PROGRESS na zasobie (bez terminu zlecenia).
- `hasActiveWorkerSession`, `hasActiveResourceSession`.
- `checkScheduleConflictLegacyMessage` — komunikat PL pod 409 admin API.

### `WorkerSessionService`
- `getActiveSessionWithDetails(userId)` — sesja IN_PROGRESS + JOIN klient/maszyna/kategoria (z `categoryIsStationary`)/materiał + ustawienia + user (`notificationsEnabled`, `canCreateOwnOrders`) + zdjęcia + notatki.
- `createWizardSession(userId, payload)` — rzuca `session_active` jeśli już trwa.
- `endActiveSession(userId, endCoord?)` — `no_active_session` jeśli brak.
- `addNote/updateNote/addPhoto`.
- `cancelActiveSession(userId)` — jeśli `work_sessions.work_order_id` jest ustawione, **`work_orders.status → PENDING`**; usuwa wiersz sesji (również dla wizarda bez zlecenia).
- `getCompletedSessions(userId, limit=20)`, `getSessionHistoryFull(sessionId, userId)` (GPS + notatki + zdjęcia).

### `AdminOrderService`
- `getScheduleSaveBlockCode(...)` → `'schedule_conflict' | 'resource_busy' | null` — ten sam kontrakt co worker API.
- `checkScheduleConflict(...)` — legacy (komunikat PL); preferuj `getScheduleSaveBlockCode`.
- `resolveLockedUntil(dueDate, durationHours)` — `locked_until` przy zapisie zlecenia.
- `getActiveWorkOrders()` — wyłącznie **`PENDING`** z JOIN-ami pod kolejkę dyspozycji.
- `getArchivedSessions(limit=500)` — sesje z JOIN-ami pracownika/maszyny/itp.
- `createOrder(orderData, { actorUserId, actorRole }?)` — opcjonalnie `DelegationScopeService.assertCanDelegateTo` na `userId`.
- `updateOrder(orderId, updates, { actorUserId, actorRole }?)` — jak wyżej przy zmianie `userId`; `assertOrderEntitiesBelongToCompany` na update; rzuca `not_found` lub `not_pending`.
- `deleteOrder(orderId)` — transakcja: kasuje sesje z `work_order_id = orderId`, potem zlecenie.

### `AdminSessionService`
- `getSessionDetails(sessionId)` — logi GPS, zdjęcia, notatki (sortowane od najnowszych).
- `forceCompleteSession(sessionId)` — `not_found` / `not_in_progress`; domyka sesję i powiązane **`work_orders.status → COMPLETED`** gdy `work_order_id` jest ustawione.
- `deleteArchivedSession(sessionId)` — `session_still_active` jeśli w toku; transakcja: kasuje sesję + powiązany `work_order` jeśli istniał.

### `DictionaryService`
- Słowniki + ustawienia, **w tym mapowanie N↔M** dla maszyn (`resource_to_categories`) i materiałów (`material_to_categories`).
- Wszystkie CRUD-y wymienione w sekcji 5.4. Eksportuje **`type ResourceCategoryUpdateInput`** i **`type MaterialCategoryUpdateInput`** — używane w `/api/categories/[id]` zamiast importowania `@/db/schema` w handlerze.
- `getSettings()` zwraca tablicę 1-elementową (singleton id=1); `updateSettings()` robi `INSERT … ON CONFLICT (id) DO UPDATE`.

### `AdminReportService`
- `getDashboardSnapshot(referenceDate?)` → `ReportsDashboardSnapshot` (typ w `src/types/admin.ts`). Liczy: aktywne sesje (z kategorią), pending orders, MoM% completed, top maszyny, sumę ton w bieżącym miesiącu, koordynaty mapy z `company_settings`.

### `GpsService`
- `getActiveSessionGpsLogs(userId)` → `Coord[]`.
- `saveGpsLogs(userId, points)` — odrzuca punkty bez liczbowych `lat/lng`. Rzuca `no_active_session`.

### `SystemLogService`
- `getRecentLogs(companyId, limit=500)` z JOIN users (`workerName`). Mapuje `createdAt` na ISO string.
- `insertLog(userId, level, message, metadata)`.

### `CustomerLocationService`
- CRUD lokalizacji klienta (`customer_locations`), `route_waypoints` (jsonb), `setRouteWaypoints`.
- `resolveForWorkOrder(workOrderId, customerId)` — domyślna lokalizacja dla mapy/trasy.

### `PlatformCompanyService` / `PlatformAnalyticsService`
- Multi-tenant: tworzenie/edycja firm (`companies`), pierwszy admin firmy, lista firm dla superadmina.
- Analityka użycia per firma na `/platform`.

### `PlatformFeatureFlagService` (`src/services/PlatformFeatureFlagService.ts`)
- `getFlags(companyId)` — odczytuje feature flags (`gpsTrackingEnabled`, `mapViewEnabled`, `geofencingEnabled`, `routePlanningEnabled`, `navigationEnabled`, `durEnabled`) z `company_settings`. Zwraca domyślne wartości gdy wiersz nie istnieje.
- `updateFlags(companyId, flags)` — UPSERT do `company_settings` z mapowaniem camelCase → snake_case. Przyjmuje `Partial<FeatureFlags>` — tylko podane klucze są zmieniane.
- Używany przez endpointy `GET/PUT /api/platform/feature-flags/:companyId` oraz przez API worker/admin do blokowania modułów GPS i DUR (zwracają `feature_disabled` 403 gdy flaga wyłączona).

### `SparePartCategoryService` (`src/services/dur/SparePartCategoryService.ts`)
- `getCategories(companyId, opts?)` — lista kategorii części; `leavesOnly` zwraca tylko liście (do przypisania części).
- `addCategory(companyId, payload)` — tworzy kategorię (domyślnie `isGroup=false`, `sortOrder=0`).
- `updateCategory(companyId, id, payload)` — edycja z walidacją hierarchii (`validateHierarchyPatch` z `categoryValidation.ts`).
- `deleteCategory(companyId, id)` — blokada gdy kategoria ma dzieci (`countSparePartCategoryChildren > 0`).

### `SparePartService` (`src/services/dur/SparePartService.ts`)
- `getParts(companyId, { compatibleWithCategoryId? })` — lista części z `categoryIds` i `machineCategoryIds`; filtr kompatybilności: dopasowanie ID lub `isDescendantOf` (grupa ↔ liść zlecenia).
- `getPart(companyId, id)` — szczegóły pojedynczej części z linkami.
- `addPart(companyId, payload)` — tworzy część + linki; `machineCategoryIds` tylko **grupy** (`assertMachineResourceGroupsAssignable`).
- `updatePart(companyId, id, payload)` — edycja pól + synchronizacja linków (DELETE + INSERT).
- `deletePart(companyId, id)` — usunięcie (kaskada przez FK).

### `categoryValidation.ts` (`src/services/dur/categoryValidation.ts`)
- `validateHierarchyPatch<T>(current, patch)` — walidacja zmiany `parentId`/`isGroup`: zakaz self-parent, zakaz przypisania do liścia jako rodzica, zakaz zmiany grupy→liść gdy ma dzieci.
- `countSparePartCategoryChildren(id)` — licznik dzieci kategorii części.
- `assertSparePartCategoriesAssignable(companyId, categoryIds)` — rzuca `CategoryHierarchyError` gdy któreś ID nie istnieje lub jest grupą.
- `assertResourceGroupsAssignable(companyId, groupIds)` — rzuca `invalid_resource_group` gdy ID nie istnieje w `resource_groups`.
- **Pobranie części na zlecenie naprawy** (`POST …/work-orders/[id]/spare-parts`, worker + admin): `WorkOrderSparePartService.pickPartFromWarehouse` → wpis `work_order_spare_parts` + automatyczne **WZ** (`stock_issues`, −stan). **Zwrot** (`DELETE …/spare-parts/[lineId]`): **PZ** zwrotu + usunięcie wpisu. Katalog worker: `GET /api/worker/dur/spare-parts`.

### `WorkOrderSparePartService` (`src/services/dur/WorkOrderSparePartService.ts`)
- `getPartsForOrder(workOrderId)` — lista części przypisanych do zlecenia (JOIN `spare_parts` dla `partName`, `catalogNumber`).
- `addPartToOrder(workOrderId, payload)` — dodaje część do zlecenia (`{partId, quantity, unitPrice?, notes?}`).
- `updatePartInOrder(id, payload)` — aktualizacja ilości/ceny/notatek.
- `removePartFromOrder(id)` — usuwa przypisanie części.
- `assertPartBelongsToOrder(partId, workOrderId)` — weryfikacja przynależności (używana w DELETE/PATCH).

### `InventoryService` (`src/services/dur/InventoryService.ts`)
- `getInventory(companyId)` — stan magazynowy wszystkich części w firmie.
- `getPartInventory(partId, companyId)` — stan pojedynczej części.
- `upsertQuantity(partId, companyId, delta)` — zwiększa/zmniejsza stan (dodaje do istniejącej ilości).
- `setQuantity(partId, companyId, quantity)` — ustawia bezwzględną ilość.

### `StockMovementService` (`src/services/dur/StockMovementService.ts`)
- `getReceipts(companyId)` — lista przyjęć magazynowych.
- `addReceipt(companyId, payload)` — przyjęcie części (`{partId, quantity, unitPrice?, invoiceNumber?, notes?, createdById?}`); automatycznie aktualizuje `spare_part_inventory`.
- `getIssues(companyId)` — lista wydań magazynowych.
- `addIssue(companyId, payload)` — wydanie części (`{partId, quantity, workOrderId?, notes?, createdById?}`); automatycznie aktualizuje `spare_part_inventory`.

### `OrganizationService` (`src/services/OrganizationService.ts`)
- CRUD `departments`, `teams`, `team_members` (scoped `companyId`).
- **Sync lidera:** `teams.leaderId` ↔ wpis `team_members.role='leader'` (`syncTeamLeader`, `applyTeamLeaderFromMember`, `clearTeamLeaderIfMatches`) — wywoływane przy `updateTeam`, `addTeamMember`, `updateTeamMember`, `removeTeamMember`.
- `getUserTeams(userId)` — zespoły użytkownika z departamentami.

### `DelegationScopeService` (`src/services/DelegationScopeService.ts`)
- **SSOT zasięgu delegacji zleceń** (pozycja w org, nie osobne `reportsToId`).
- `getUserOrgProfile(companyId, userId)` → `deptManagerOf[]`, `teamLeaderOf[]`, `teamMemberships[]`, `supervisorChain[]`.
- `getOrgProfilesForCompany(companyId)` — batch pod listę użytkowników admina.
- `hasDelegationRights(companyId, userId)` — manager działu lub lider zespołu.
- `getDelegatableUserIds(companyId, actorUserId, actorRole)` → `'all'` (admin) lub `Set<userId>` aktywnych workerów w zasięgu.
- `getDelegatableWorkers(...)` — lista `{ id, fullName, orgLabel? }` pod pickery.
- `assertCanDelegateTo` / `assertHasDelegationRights` — rzuca `forbidden` / `invalid_assignee`.
- **Reguły:** lider → członkowie swoich zespołów; kierownik działu → członkowie zespołów **bezpośrednio** w zarządzanym dziale (bez rekurencji `parent_id`); suma przy wielu kapeluszach; tylko `role=worker` i `is_active`.

### `WorkerDelegationService` (`src/services/WorkerDelegationService.ts`)
- `createDelegatedOrder(actorUserId, actorRole, companyId, body)` — INSERT `work_orders` `PENDING`, `created_by_id = actor`; pełna walidacja jak admin (kategoria, tenant, harmonogram, zasięg).

---

## 7. Typy domenowe (`src/types/`)

| Plik | Eksporty kluczowe |
|---|---|
| `worker.ts` | `WorkOrderPriority`, `Session`, `WorkOrder`, `Coord`, `Note`, `AppSettings`, `UserData`, `TimelineItem`, `InitialWorkerData` (`hasDelegationRights?` z SSR `/worker`) |
| `organization.ts` | `UserOrgProfile`, `DelegatableWorkerRow`, `DepartmentTreeNode`, `TeamWithMembers`, `TeamMemberWithUser` |
| `admin.ts` | `UnifiedGanttItem` (zmergowany order/session pod Gantt), `OrderFormState` (formularz dyspozycji), `BaseWorker/Machine/Material/Customer/Category`, `ReportActiveSessionRow`, `ReportsDashboardSnapshot` |
| `wizard.ts` | `WizardCategory` (z `isStationary?`), `WizardMachine`, `WizardMaterial`, `WizardCustomer` |
| `deviceTelemetry.ts` | `WerkitLogCategory`, typy metadanych logów urządzenia |
| `dur.ts` | `SparePartCategory`, `SparePart` (z `categoryIds`, `machineCategoryIds`), `SparePartMachineCompatibility`, `SparePartInput`, `SparePartCategoryInput`, `SparePartCompatibilityInput`, `SparePartInventory`, `StockReceipt`, `StockIssue`, `StockReceiptInput`, `StockIssueInput`, `InventoryAdjustmentInput` |

**Konwencja**: **daty w propsach client → string ISO** (zob. `InitialWorkerData`, `UnifiedGanttItem`). Daty w serwisach na granicy DB → `Date`/`string` z Drizzle.

---

## 8. Worker — moduł UI (`src/features/worker/`)

### Komponenty
| Plik | Rola |
|---|---|
| `components/shell/*` | Orkiestracja dashboardu workera (`WorkerActiveSessionSection`, `WorkerPendingOrdersSection`, modale, footer). |
| `components/profile/*` | Ustawienia profilu: powiadomienia, dźwięki alarmów, biometria. |
| `components/wizard/WizardClient.tsx` | Kreator własnego zlecenia (5 kroków). |
| `components/delegation/WorkerDelegateOrderModal.tsx` | Delegacja zlecenia do podległego (lider/kierownik); wejście z `WorkerClient` gdy brak sesji i `hasDelegationRights`. |
| `components/organization/ProfileOrgSection.tsx`, `OrgProfileBadges.tsx` | Badge struktury org (admin users + worker `/worker/profile`). |
| `components/PendingOrdersList.tsx` | Karty zleceń oczekujących. |
| `components/ActiveSessionDashboard.tsx` | UI aktywnej sesji (zawiera `WorkerSparePartsPanel` dla napraw). |
| `components/WorkerSparePartsPanel.tsx` | Panel części zamiennych w aktywnej sesji — przeglądanie, dodawanie i usuwanie części (wydanie z magazynu przez pracownika). Widoczny tylko dla `orderType === 'machine_repair'`. |
| `components/Modals/NotesModal.tsx`, `Modals/GpsWarningModal.tsx`, `WorkerAlarmModal.tsx` | Modale. |

### Hooki
| Hook | Co robi |
|---|---|
| `useWorkerActions` | Akcje sesji (koniec, akceptacja, notatki, zdjęcia, checkpoint). |
| `useWorkerGPS` | Web + natywny GPS, flush kolejki. |
| `useWorkerNotifications` | Alarmy czasu/zleceń + natywne `LocalNotifications`. |
| `useWorkerAlarmSound` | Odtwarzanie dźwięku alarmu w aplikacji (PWA / foreground). |
| `useWorkerShellState` | Stan SSR shell workera (sesja, zlecenia, trasa). |
| `useWorkerSessionSync` | Synchronizacja sesji z API. |
| `useWorkerNotificationActions` | Akcje z powiadomień systemowych (start, dismiss). |

### Lib (alarmy / dźwięk)
| Plik | Eksport |
|---|---|
| `lib/workerNotificationPrefs.ts` | Ustawienia dźwięku (localStorage): głośność, preset per typ alarmu. |
| `lib/workerAlarmSoundPlayer.ts` | Odtwarzanie / podgląd dźwięków (Web Audio + pliki `/sounds/`). |
| `lib/workerNotificationChannel.ts` | Kanały Android Local Notifications (preset → plik WAV). |
| `lib/workerNotificationSoundPresets.ts` | Mapowanie preset → plik natywny / public URL. |
| `lib/workOrderPriority.ts` | `normalizeWorkOrderPriority(value)`. |
| `lib/workOrderPresentation.ts` | Sortowanie/kolorystyka listy zleceń oczekujących. |

---

## 9. Admin — moduł UI

### Lokalizacja komponentów

**Orkiestracja stron (`*Client.tsx`)** — `src/features/admin/{orders|users|customers|machines|materials|logs}/` (np. `CustomerMapPicker`, `CustomerLocationsPanel` w `features/admin/customers/`).

**Shell i współdzielone widgety** — `src/components/Admin/**`:
- `AdminSidebarNav.tsx`, `MobileAdminNav.tsx`, `adminNavLinks.ts` (tryb `scopedViewer`: dyspozycja + raporty + organizacja read-only), `adminNavActive.ts` (aktywna zakładka: `/admin` ≡ legacy `/admin/orders`), `AdminAbilityProvider.tsx` (`useAdminAbility() → {canMutate, canDelegateOrders, delegationScope: 'all'|'scoped'|'none'}`),
- `AdminModalShell.tsx` — obudowa modali formularzy (`scrollableBody`, `footer`, domyślnie bez zamykania kliknięciem w tło),
- `AdminSearchCombobox.tsx` — wyszukiwalny combobox (client-side filter, klawiatura, fixed dropdown z-index 200); używany w `OrderFormModal` dla typu zlecenia, pracownika, zasobu, materiału,
- `AdminPasswordConfirmModal.tsx` — hasło admina przed trwałym usunięciem zakończonej sesji z ewidencji,
- `Modals/OrderFormModal.tsx`, `Modals/SessionDetailsModal.tsx`, `Modals/WorkOrderSparePartsSection.tsx` (sekcja części zamiennych w formularzu zlecenia naprawy — widoczna tylko dla `orderType === 'machine_repair'`),
- `Orders/OrdersDispatchTable.tsx`, `Orders/OrdersDispatchToolbar.tsx`, `Orders/OrdersSettingsQuickModal.tsx`,
- `Reports/ReportsDashboard.tsx`, `Reports/ReportStatCard.tsx`.

`src/components/` (współdzielone admin + worker):
- `customers/CustomerSearchField.tsx` — combobox klienta (admin `OrderFormModal`, worker wizard krok 3): filtrowanie + opcjonalne dodawanie (`canCreate` / `canCreateCustomers`) → `CustomerInlineCreateForm` + auto-wybór nowego klienta,
- `customers/CustomerInlineCreateForm.tsx` — formularz inline kontrahenta (mapa, POST `/api/customers`),
- `scrollPanelStyles.ts` — `INLINE_SCROLL_PANEL_CLASS` (pion), `INLINE_SCROLL_X_PANEL_CLASS` (poziom, tabele admin/Gantt),
- `AppDialogProvider.tsx` + `useAppDialog()` — globalne alert/confirm (root `src/app/layout.tsx`); **`appDialogApiMessage`**. Zakaz natywnych `window.alert` / `confirm`.
- `FormModalFooter.tsx` — stopka Anuluj/Zapisz w modalach CRUD.

`src/components/GanttChart/GanttChart.tsx` — wykres Gantta dla `UnifiedGanttItem[]`.

### Mapy (Leaflet + OSRM)

| Komponent | Rola |
|---|---|
| `LiveMap.tsx` | Główna mapa operacyjna (sesja, ślad GPS, trasa, zdarzenia). Tryb `thumbnail` (statyczny, bez edycji) vs pełny. |
| `FullScreenMapModal.tsx` | Modal pełnoekranowej mapy z edycją trasy, punktami pośrednimi i nawigacją turn-by-turn. |
| `SettingsMap.tsx`, `SettingsMapInner.tsx` | Picker lokalizacji w ustawieniach firmy / klienta. |
| `CustomerRoutePlannerMap.tsx` | Planowanie trasy klienta (punkty pośrednie, przeciąganie). |
| `WerkitTileLayer.tsx` | Wspólna warstwa kafelków: jasna (CartoDB) / ciemna (CartoDB dark_all) z lepszym kontrastem. |
| `RouteWaypointMarkers.tsx` | Markery punktów pośrednich trasy z przeciąganiem i usuwaniem. |
| `TraveledPathLayers.tsx` | Warstwa przebytej trasy (kolor wg prędkości). |
| `NavigationInstructionBar.tsx` | Pasek instrukcji nawigacji turn-by-turn (aktualny manewr, dystans, czas). |
| `NavigationBottomSheet.tsx` | Rozwijany panel listy manewrów nawigacji. |
| `ManeuverIcon.tsx` | Ikona manewru OSRM (skręt, rondo, itp.). |
| `liveMapIcons.ts` | Ikony markerów (start, destination, waypoint, worker). |
| `liveMapLeafletPlugins.tsx` | Wtyczki Leaflet (fit, follow pan). |
| `mapLeafletTheme.css` | Style Leaflet (jasny/ciemny motyw). |
| `LiveMap.module.css` | Style modułowe LiveMap. |

**Hooki mapowe:**

| Hook | Rola |
|---|---|
| `useOsrmNavigation.ts` | Stan nawigacji OSRM: fetch trasy, śledzenie pozycji, znajdowanie aktualnego indeksu instrukcji, obliczanie pozostałego dystansu. |
| `useOsrmRouteToDestination.ts` | Fetch trasy OSRM dla punktów pośrednich. |

**Lib mapowy (`src/lib/map/`):**

| Plik | Rola |
|---|---|
| `blockMapClickBriefly.ts` | Blokada kliknięcia mapy na 300ms po interakcji z UI. |
| `companyBaseLocation.ts` | Lokalizacja bazowa firmy z `company_settings`. |
| `isLeafletUiClick.ts` | Detekcja kliknięcia w element UI Leaflet. |
| `mapBasemap.ts` | Konfiguracja warstwy bazowej (jasny/ciemny). |
| `routeGeometryProvider.ts` | Provider geometrii trasy OSRM: budowanie URL + parsowanie odpowiedzi (`parseRouteResponse`). Typy OSRM (`OsrmStep`, `OsrmRoute`, `NavigationInstruction`) i domenowe (`ParsedRouteResponse`) zdefiniowane tutaj, a nie w hooku. |
| `routeWaypoints.ts` | Logika punktów pośrednich (walidacja, serializacja). |

**Nawigacja zewnętrzna:** `FullScreenMapModal.tsx` → `openNavigation(app, lat, lng)` — otwiera Google Maps / Waze / Apple Maps z podaną lokalizacją.

### Logika wspólna
`src/features/admin/orders/dispatchPlanning.ts`:
- `formatDueDatetimeLocal(dateString)` — bezpieczny ISO bez TZ pod input `datetime-local`.
- `buildUnifiedDispatchItems(orders, sessions, search)` — scala dwa źródła w `UnifiedGanttItem[]` z grupowaniem statusu i sortowaniem.

`src/components/ListSearchBar.tsx` + `src/components/searchFieldStyles.ts` — wspólny pasek wyszukiwania nad listami admin (klienci, użytkownicy, zasoby, dyspozycja, drzewo materiałów); ten sam styl co `AdminSearchCombobox`.

`src/lib/searchComboboxFilter.ts` — SSOT normalizacji PL (`normalizeSearchText`, `matchesSearchQuery`); używane też w `filterCatalogTree`, `dispatchPlanning`, listach.

`src/lib/customerSearch.ts` — wyszukiwanie klientów (imię, nazwisko, adres, lokalizacje).

`src/lib/filterResourcesForCategory.ts` — filtrowanie zasobów po kategorii zlecenia (`whenNoCategory`: wizard true, admin form false).

`src/lib/userSearch.ts` — wyszukiwanie użytkowników (imię, e-mail, rola).

---

## 10. Komponenty współdzielone (`src/components/work-orders/`)

| Komponent | Prop kluczowy | Co |
|---|---|---|
| `WorkOrderPriorityRibbon` | `labels: WorkOrderPriorityLabels` (wycinek `worker.client`) | URGENT (red, pulse), HIGH (orange), NORMAL (zinc), LOW (emerald). Tryb `accentOnly` rysuje tylko URGENT/HIGH. |
| `OrderLabelCard` | props zlecenia + `dict` | SSOT etykiety zlecenia (maszyna, klient, termin) — worker, admin, wizard. |
| `ScheduleConflictPanel` | `mode: admin \| worker`, `conflicts`, etykiety i18n | Panel inline pod datą/czasem; admin: „Utwórz mimo konfliktu”; worker: ukryty Start w liście oczekujących. |
| `WorkOrderScheduleFields` | `scope: admin \| worker`, hook `useScheduleConflictPreview` | Pola czasu + termin + panel konfliktów (debounce 350 ms). |
| `WorkOrderPendingCard` | `mode: start \| preview` | Karta oczekującego zlecenia + panel konfliktów (lista PENDING, kolejka w sesji). |
| `useScheduleConflictPreview` | `scope: admin \| worker` | Debounced GET podglądu konfliktów. |
| `scheduleConflictI18n.ts` | `buildWorkOrderScheduleFieldLabels` | SSOT etykiet z `workOrdersSchedule` (i18n). |

`src/lib/scheduleConflict.ts` — czysta logika: `findScheduleConflicts`, `computeLockedUntil`, deduplikacja sesji vs zlecenia.

---

## 11. Lib (`src/lib/`)

| Plik | Co |
|---|---|
| `auth.ts` | `JWT_SECRET` (TextEncoder), `getAuthSession()` (cookie `auth_token` + `jwtVerify`), `getUserId()`, `getUserRole()`. **Brak `JWT_SECRET`** → rzuca `Error('JWT_SECRET is not set')`. **Na produkcji wymagane!** |
| `passwordCrypto.ts` | `comparePassword` / `hashPassword` — domyślnie natywny **`bcrypt`**; przy **`WERKIT_USE_BCRYPTJS=1`** lub nieudanym imporcie `bcrypt` używa **`bcryptjs`** (login + `/api/admin/users`, biometria w `AdminUserService`). |
| `parseRouteParams.ts` | `parsePositiveIntFromString` / `parsePositiveIntParam` — walidacja ID z URL i JSON (worker: akceptacja zlecenia, wizard sesji, edycja notatek; zapobiega `NaN` w zapytaniach). |
| `requireAdminMutation.ts` | `guardAdminMutation()` — zwraca `NextResponse 401/403` lub `undefined`. Druga linia obrony za `proxy`. |
| `requireDispatchMutation.ts` | `guardDispatchMutation()` — admin **lub** viewer/worker z `DelegationScopeService.hasDelegationRights`; używane w `POST/PUT /api/admin/work-orders*`. |
| `coordsFromRequestBody.ts` | `coordsFromRequestBody(body) → {lat,lng}\|null` (walidacja zakresu), `coordPairToNumericStrings({lat,lng})` (toFixed(8) pod numeric Postgres). |
| `geolocationOnce.ts` | `getCurrentPositionOnce(timeout=12000)` — jednorazowy odczyt (wizard/end-session). |
| `gpsManager.ts` | `GPSManager` (klasa statyczna): `localStorage 'werkit_gps_queue'`, `enqueue/flushQueue/getDistance` (Haversine). `flushQueue` używa `keepalive:true` + retry przy `online`. |
| `biometricLogin.ts` | Owijka `@capgo/capacitor-native-biometric` (server tag `com.werkit.app.auth`). Funkcje: `isNativeBiometricContext`, `biometricHardwareAvailable`, `hasSavedBiometricCredentials`, `saveBiometricCredentials`, `clearBiometricCredentials`, `fetchCredentialsWithBiometricPrompt`. |
| `remoteLogger.ts` | `sendRemoteLog(level, message, metadata?)` → POST `/api/worker/logs` z `keepalive: true`, błędy są zjadane (`.catch(() => {})`). |
| `clientRateLimit.ts` | Jedna implementacja okien czasowych: dedupe przed wysłaniem logu oraz throttle w `fetchWithDeviceTelemetry` (osobne mapy kluczy). |
| `version.ts` | `APP_VERSION = ${pkg.version}${gitHash}` (z `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`). |
| `workOrderCategoryValidation.ts` | `validateWorkOrderFieldsAgainstCategory(cat, payload)` — payload: `customerId`, `materialId`, `quantityTons`, `taskDescription`, `repairDescription`, `orderType`; dla `machine_repair` wymagany opis w `repairDescription` (nie `taskDescription`), pomijane `reqMaterial`/`reqQuantity`; kody jak wyżej + `coerceWorkOrderPriority`. |
| `resourceDisplayName.ts` | `buildResourceDisplayName(brand, model, registrationNumber)` — string `BRAND MODEL · REJ`, max 255. `isVehicleIdentityEmpty()` — wszystkie 3 puste. |
| `postgresMigrationHints.ts` | Detektory braku migracji 0006/0007/0005 (`isMissingResourcesVehicleColumns`, `isMissingResourceCategoriesStationaryColumn`, `isMissingMaterialCategoriesTables`). Używane przez handlery do zwracania **503 `migration_required`** zamiast 500. |
| `narrow/dur.ts` | `narrowSpareParts`, `narrowSparePart`, `narrowSparePartCategories`, `narrowSparePartCompatibility`, `narrowInventory`, `narrowStockReceipts`, `narrowStockIssues` — bezpieczne parsowanie odpowiedzi API DUR (lista/obiekt → typ domenowy z domyślnymi wartościami). |
| `narrow/organization.ts` | `narrowUserOrgProfile`, `narrowDelegatableWorkers`, `narrowOrganizationTreePayload` — profil org, delegowalni workerzy, payload drzewa ludzi (`tree` + `unassignedUsers`). |
| `resolveNeonPostgresUrl.ts` | `resolveNeonPostgresUrl()` + `ensurePostgresUrlForVercelDriver()` — dla skryptów `tsx`, kiedy w `.env.local` jest tylko `DATABASE_URL` (Neon). Patrz `src/db/env.ts`. |

---

## 12. Proxy Edge (`src/proxy.ts`)

```
matcher: ['/admin/:path*', '/worker/:path*', '/login', '/api/:path*']
```

Klasyfikacja → autoryzacja → role:
- **`/login`**: jeśli jest ważne `auth_token` → **redirect** do `/worker` (rola `worker`) lub `/admin` (pozostałe role); nie wolno zwracać `next()` przed tym krokiem — inaczej wstecz z WebView pokazywałby formularz mimo aktywnej sesji.
- **`ADMIN_PANEL_ROLES = ['admin', 'viewer']`** — strony i API admin (czytanie). Mutacje API admin: domyślnie tylko `admin`; **wyjątek:** `POST/PUT /api/admin/work-orders*` (`isAdminDispatchMutation`) — viewer/worker z `hasDelegationRights` (szczegóły w `guardDispatchMutation` w handlerze).
- **`WORKER_APP_ROLES = ['worker', 'admin']`** — `/worker` i `/api/worker`.
- **`SHARED_READ_ROLES = ['worker', 'admin', 'viewer']`** — `SHARED_API_PREFIXES`. Mutacje: domyślnie tylko `admin`; worker: `POST /api/customers` gdy ma flagę w DB.
- Nowy publiczny shard API → **dopisz prefix do `SHARED_API_PREFIXES`**, inaczej deny-by-default zakwalifikuje go jako admin API.

Cookie `auth_token`: `HttpOnly, Secure, SameSite=None, 7d` (potrzebne dla Capacitor WebView na innym originie). Niepoprawny token → wyczyszczenie cookie + redirect/`401`.

---

## 13. i18n (`src/i18n/`)

- `locales/pl.ts` — **źródło prawdy** (sterownik kluczy) i runtime fallback.
- `locales/en.ts` — musi spełnić `AppDictionary = typeof pl`.
- `locales/de.ts` — musi spełnić `AppDictionary = typeof pl` (dodany 2026-05).
- `index.ts` → `getDictionary(locale='pl')`. `formatDict(template, vars)` zamienia `{klucz}` placeholdery.
- `constants.ts` → `DEFAULT_UI_LOCALE = 'pl-PL'` (do `Intl.DateTimeFormat`).

Najwyższe sloty (top-level) — używaj zawsze przez `getDictionary().<slot>`:
| Slot | Co tam jest |
|---|---|
| `apiErrors` | Mapa `kod → komunikat`. **Kluczowe** dla `/login` i wszystkich JSON-owych odpowiedzi z błędem (`error: 'xxx'`). Zawiera m.in. `feature_disabled` (403 gdy moduł GPS/DUR wyłączony dla organizacji). |
| `workOrdersSchedule` | **SSOT** pól terminu/czasu i tekstów konfliktów harmonogramu (admin + worker); helper: `scheduleConflictI18n.ts`. |
| `login` | `submit`, `biometricLogin`, `biometricDivider` |
| `admin.sidebar` | Etykiety nawigacji admin |
| `admin.dashboard`, `admin.reports`, `admin.archive`, `admin.orders`, `admin.users`, `admin.workers`, `admin.machines`, `admin.materials`, `admin.customers`, `admin.settings`, `admin.logs`, `admin.modals` | Każdy ekran admina ma swój sub-słownik |
| `worker.client`, `worker.wizard`, `worker.history`, `worker.profile`, `worker.help` | UI mobilki |
| `dur.sidebar`, `dur.spareParts`, `dur.categories`, `dur.compatibility`, `dur.apiErrors`, `dur.workOrderSpareParts` | Moduł DUR — etykiety nawigacji, lista części, kategorie, kompatybilność, błędy API, części w zleceniu naprawy |

Każdy `error` z route handlerów MUSI mieć odpowiednik w `apiErrors`, inaczej UI pokaże surowy kod.

### 13.1. Słownik produktowy (UI vs kod)

W tekstach dla użytkownika (**pl/en/de**) trzymaj rozróżnienie — nazwy tabel/API mogą zostać historyczne (`category_id`, `order_type`):

| Słowo w UI | Znaczenie | W bazie / API |
|---|---|---|
| **Typ zasobu** | Model/rodzina zasobu (dobór części DUR) | `resource_groups`, `resources.resource_group_id` |
| **Kategoria zlecenia** | Drzewo w module Zlecenia, pole formularza zlecenia | `resource_categories`, `work_orders.category_id` |
| **Kategoria materiału** | Drzewo materiałów | `material_categories` |
| **Kategoria części** | Katalog DUR | `spare_part_categories` |
| **Rodzaj zlecenia** | Praca operacyjna vs naprawa | `order_type` ∈ `machine_work` \| `machine_repair` |

Reguła: **„Typ”** w UI dotyczy zasobu; **„Kategoria”** — klasyfikacji słownikowej; **„Rodzaj”** — enum pracy vs naprawy. Etykiety list: `admin.orderFields.category` (kategoria), `orderFields.orderType` (rodzaj).

---

## 14. Capacitor / mobilka

- `capacitor.config.ts`: `appId: 'com.werkit.app'`, `appName: 'Werkit'`, `webDir: 'public'`, `server.url: https://werkit.cncsolutions.dev/`.
- WebView ładuje **produkcyjną** wersję — lokalne zmiany w UI są widoczne na telefonie tylko po deploy. Do testów na telefonie w sieci LAN: tymczasowo zmień `server.url` na `http://192.168.x.x:3000` + `cleartext: true` (uwaga: w repo `cleartext` jest celowo wyłączone — patrz commit `e7285b5 security: remove cleartext HTTP flag to enforce HTTPS`).
- **Hardware back (Android)**: jedyne miejsce obsługi — `<CapacitorBackButton />` w root `app/layout.tsx` (Capacitor native). Jeśli `window.history.length > 1` → **`router.back()`**, w przeciwnym razie **`App.minimizeApp()`** (pierwszy ekran w sesji WebView). **Nie dodawaj własnych listenerów `backButton`.**
- **GPS w tle**: `BackgroundGeolocation` + filtr `accuracy > 40m` + `distanceFilter: 10m`. Bufor `localStorage` (`werkit_gps_queue`) → flush co 30s lub natychmiast po nowej koordynacie. Dla `categoryIsStationary` (warsztat/plac) GPS jest **wyłączony** — i w UI, i przy czekpoint-confirm.
- **Notyfikacje natywne**: `LocalNotifications.schedule({at: now+1s})`. Persistencja IDs: `werkit_notified_orders` (localStorage).
- **Logi z urządzenia**: każda krytyczna ścieżka woła `sendRemoteLog('LEVEL', 'msg', meta)` → `/api/worker/logs` → tabela `device_logs` → admin `/admin/logs`. **Globalne błędy JS** łapie `<GlobalErrorHandler />` (window error + unhandledrejection).
- **Biometria**: Keystore/Keychain pod tagiem `com.werkit.app.auth`. Włączenie z poziomu profilu wymaga aktualnego hasła (weryfikowane w `/api/worker/profile`).

---

## 15. Skrypty `tsx` (`src/scripts/`, mapowanie do `package.json`)

| Polecenie | Co robi | Skrypt |
|---|---|---|
| `npm run db:napraw-maszyny` | Migracja 0006 (resources brand/model/registration_number) | `apply_resources_vehicle_identity.ts` |
| `npm run db:napraw-slowniki-baza` | Migracje 0005 + 0007 (material_categories + is_stationary) | `apply_dictionary_schema.ts` |
| `npm run db:napraw-lokalizacja-sesji` | Migracja 0008 (work_sessions bookend coords) | `apply_work_sessions_bookend_coords.ts` |
| `npm run db:napraw-materialy-bez-typu` | Migracja 0009 (`materials` bez `type`) | `apply_materials_drop_type.ts` |
| `npm run db:napraw-wszystko` | Kolejno skrypty `apply_*`: pojazdy → słowniki → bookend GPS → drop `materials.type` → widoczność pól kategorii → rozszerzenie zasobów (idempotentne) | — |
| `npm run db:napraw-wszystko-i-zweryfikuj` | **`db:napraw-wszystko`** następnie **`db:verify-schema`** — zalecane „jedno polecenie” po aktualizacji kodu oczekującego nowego schematu | — |
| `npm run db:apply-resources-identity` | Alias dla 0006 | jw. |
| `npm run db:migrate` | `drizzle-kit migrate` (WebSocket `@vercel/postgres` — na części środowisk Windows/CLI bywa niestabilne) | — |
| `npm run db:migrate:pg` | **`tsx src/scripts/run_drizzle_migrate_pg.ts`** — ten sam katalog `drizzle/` przez TCP (`pg`), preferuje **`DATABASE_URL_UNPOOLED`**. Gdy baza powstała ze skryptów `apply_*` bez historii Drizzle: **baseline** dla migracji &lt; 0013 przy błędzie „already exists”, potem wykonuje **0013** i **0014** jak w journal. |
| `npm run db:verify-schema` | Porównanie kolumn Postgres ↔ `schema.ts` (`verify_schema_alignment.ts`) | — |
| `npm run sounds:generate` | Generuje pliki WAV powiadomień do `public/sounds/` i `android/.../res/raw/` | `generate_notification_sounds.ts` |

**Wszystkie skrypty** używają `loadEnvConfig(cwd)` + `ensurePostgresUrlForVercelDriver()` z `src/lib/resolveNeonPostgresUrl.ts`. Brak `DATABASE_URL`/`POSTGRES_URL` → komunikat instruujący wklejenie connection stringa do `.env.local`.

`docs/archive/legacy-root-scripts/` — historyczne skrypty SQL/Python z katalogu głównego repo (przed ujednoliceniem Drizzle); **nie uruchamiać** na produkcji.

---

## 16. Środowiskowe zmienne

| Zmienna | Gdzie | Wymagana |
|---|---|---|
| `JWT_SECRET` | `src/lib/auth.ts` (HMAC dla `jose.SignJWT/jwtVerify`) | **TAK na produkcji** (fallback tylko ostrzega `console.warn`) |
| `POSTGRES_URL` | używa `@vercel/postgres` automatycznie | **TAK** |
| `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`, `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `POSTGRES_*` itd.) | `src/lib/resolveNeonPostgresUrl.ts` zbiera dowolny z aliasów (Neon/Vercel) i ustawia `POSTGRES_URL` dla skryptów `tsx` | przynajmniej jeden z nich |
| `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` | wstrzykiwana przez Vercel; pokazana w `APP_VERSION` | nie (ozdobna) |
| `WERKIT_USE_BCRYPTJS` | `src/lib/passwordCrypto.ts` — `1` wymusza `bcryptjs` zamiast natywnego `bcrypt` (hash + compare) | nie |

---

## 17. Częste pułapki / debug recipes

1. **„Wewnętrzny Błąd Serwera" przy logowaniu** — sprawdź czy wszystkie migracje są zaaplikowane (zwłaszcza dodające kolumny do `users`). Drizzle zwraca m.in. `Failed query: …` — `isLikelyDatabaseOrInfraError` w `src/app/api/auth/login/route.ts` mapuje to na **503 `service_unavailable`** (wzorce m.in. `Failed query`, `column … does not exist`, `NeonDbError`).
2. **`Array.isArray` przed `.map`/`.filter` na odpowiedzi API** — error handler może zwrócić `{error}` zamiast tablicy → crash mobilki.
3. **`params` w `[id]/route.ts` jest `Promise`** w Next 16 — `const { id } = await context.params;`.
4. **Duplikaty pod `src/components/Worker/**`** — w repo już ich nie ma; UI pracownika tylko w `@/features/worker/...`.
5. **Konflikty harmonogramu zleceń** — logika w **`ScheduleConflictService`** + **`src/lib/scheduleConflict.ts`**; UI współdzielone w `components/work-orders/`; nie dodawaj ponownie zapytań Drizzle do `src/lib/` dla tego case’u.
6. **JWT_SECRET** — brak zmiennej powoduje crash proxy (Edge middleware) przy każdym requeście. Upewnij się, że `.env.local` zawiera `JWT_SECRET`.
7. **GPS bookend** (`workSessions.start_*`/`end_*`) — wymaga migracji 0008. Akceptacja zlecenia (`POST /api/worker/work-orders/:id/accept`) i koniec sesji (`PUT /api/worker/session`) wysyłają `{latitude, longitude}` w body, ale są opcjonalne (urządzenie bez zgody na GPS → po prostu null w bazie).
8. **`/api/worker/gps`** akceptuje **pojedynczy obiekt LUB tablicę** (offline sync). Klient zawsze wysyła tablicę (zob. `GPSManager.flushQueue`), ale serwer toleruje też pojedynczy.
9. **Cookie `SameSite=None, Secure`** — wymagane dla WebView na innym originie (Capacitor). Lokalnie na `http://localhost:3000` przeglądarka odrzuci `Secure` cookie — to **wyłącznie problem dev-przeglądarki**, mobilka działa.
10. **Mutacje admin** — zawsze przez `guardAdminMutation()` (nawet jeśli `proxy` już sprawdza). Druga warstwa obrony chroni przed pominięciem matchera.
11. **Pusta lista kategorii na `/admin/machines` + „Błąd pobierania danych”** — kod jest już wdrożony, ale **baza bez migracji 0010** (`resource_categories.show_*`): dawniej **GET `/api/categories`** padał na `SELECT` przez Drizzle. Serwis robi teraz **fallback** (odczyt bez `show_*`, domyślnie `show* = true`). **Zapis** kategorii nadal wymaga kolumn: uruchom `npm run db:napraw-kategorie-widocznosc` (lub SQL z `drizzle/0010` + `0011`) na bazie produkcyjnej.
12. **`GET /api/geocode`** — `q` min. 3 znaki, **maks. 280** (anty-nadużycie wobec Nominatim); błędy walidacji `short_query` / `query_too_long`. **Brak wyniku Nominatim:** odpowiedź **200** z `{ lat: null, lng: null, error: "not_found" }` (nie HTTP 404), żeby nie zaśmiecać telemetrii i UI.
13. **`POST /api/worker/logs`** — `level` tylko z zestawu `INFO|WARN|ERROR|DEBUG`; długość `message` i `metadata` ograniczona przed zapisem (stabilność + rozmiar wiersza w `device_logs`).
14. **Rozjazd wersji web vs APK** — panel pokazuje `WEB_PACKAGE_VERSION` z `package.json`; APK z release `android-latest` ma własną wersję w `werkit-apk-meta.json`. Ostrzeżenie w **`AppDownloadCard`** gdy `inSync === false`. Build CI nie startuje przy każdym deployu web — po zmianach mobilnych bez `android/**` uruchom ręcznie workflow **Build Android App**.

---

## 18. Dług techniczny

**Pełny plan faz, ryzyka i checklistę:** [`TECH_DEBT_ROADMAP.md`](./TECH_DEBT_ROADMAP.md) (tam aktualizuj postęp — nie rozdmuchuj tej sekcji).

Skrót: kolumny legacy usunięte migracją **0014**; pipeline migracji (`db:napraw-wszystko-i-zweryfikuj` + **`npm run db:migrate:pg`** dla journalu Drizzle, w tym **0013/0014**); `passwordCrypto` + `WERKIT_USE_BCRYPTJS`; §4 mapuje trasy admin → komponenty UI. **Fazy A–F roadmapy zamknięte** — patrz [`TECH_DEBT_ROADMAP.md`](./TECH_DEBT_ROADMAP.md).

---

*Ostatnia weryfikacja vs repo: 2026-05-28. Jeśli przypisanie endpoint↔serwis rozjedzie się z kodem — aktualizuj ten plik w tym samym PR.*

---

## 19. CI i formalności repozytorium

| Element | Lokalizacja |
|---|---|
| CI (lint, TypeScript, build Next) | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `main`, PR do `main` |
| Build Android (Capacitor) | [`.github/workflows/android-build.yml`](../.github/workflows/android-build.yml) — release `android-latest`: `werkit.apk` (debug) + `werkit-apk-meta.json` |
| APK — pobranie / metadane | `GET /api/app/android`, `GET /api/app/android/info` — [`androidAppDownload.ts`](../src/lib/androidAppDownload.ts), [`githubReleaseApk.ts`](../src/lib/githubReleaseApk.ts) |
| Licencja (zastrzeżone prawa) | [`LICENSE`](../LICENSE); pole `license` w `package.json`: `UNLICENSED` |
| Raportowanie podatności | [`SECURITY.md`](../SECURITY.md) |

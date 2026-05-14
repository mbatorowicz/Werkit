# Werkit — mapa systemu (SYSTEM_MAP)

> **Cel:** referencja „kto, gdzie, jak”. Każda tabela DB, endpoint API, serwis, hook i ważny komponent w jednym miejscu.
> Zaktualizuj ten plik **w tym samym PR** co zmianę struktury — inaczej traci sens.
>
> Plik towarzyszący: [`AGENTS.md`](../AGENTS.md) (zasady pracy), [`ARCHITECTURE.md`](../ARCHITECTURE.md) (warstwy i wzorce), [`TECH_DEBT_ROADMAP.md`](./TECH_DEBT_ROADMAP.md) (plan redukcji długu — **SSOT planu**, nie duplikuj go tutaj w rozmiarze essay).

---

## 1. Wersje, środowiska, deploy

| Element | Wartość |
|---|---|
| Wersja aplikacji | `package.json#version` (obecnie **1.9.3**) — wstrzykiwana do UI jako `APP_VERSION` w `src/lib/version.ts` (z dopiskiem 7-znakowego SHA z `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`). Android: `versionName` w `android/app/build.gradle`. |
| Framework | **Next.js 16.2.4**, React 19.2.4, App Router. |
| Runtime API | Domyślne Vercel Node.js (hasło: **`passwordCrypto`** — domyślnie natywny `bcrypt`, opcjonalnie `bcryptjs` przez `WERKIT_USE_BCRYPTJS`). Tras **edge** brak. |
| Hosting | Vercel + custom domain `https://werkit.cncsolutions.dev/`. |
| Mobilka | Capacitor 8 (`capacitor.config.ts → server.url = 'https://werkit.cncsolutions.dev/'`). WebView ładuje produkcję; natywne wtyczki: `@capacitor/app`, `@capacitor/local-notifications`, `@capacitor-community/background-geolocation`, `@capgo/capacitor-native-biometric`. |
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

**Reguła**: kod w `src/app/**` **nie importuje** `@/db` ani `@/db/schema` — wszystkie zapytania w **`src/services/*`** (w tym wykrywanie konfliktów harmonogramu zleceń: `AdminOrderService.checkScheduleConflict`).

---

## 3. Schemat bazy (`src/db/schema.ts`)

| Tabela | Klucz biznesowy | Najważniejsze kolumny | Relacje (ON DELETE) |
|---|---|---|---|
| `users` | `username_email` (unique, **case-insensitive** w zapytaniu — `lower(...)`) | `id`, `full_name`, `password_hash`, `role` ∈ `admin\|worker\|viewer`, `is_active`, `can_create_own_orders`, `notifications_enabled`, `biometric_login_enabled`, `device_unique_id` | — |
| `resource_categories` | `name` | `icon`, **`show_customer`**, **`show_material`**, **`show_quantity`**, **`show_task_description`** (formularz zlecenia), **`show_resource_name`**, **`show_resource_description`**, **`show_registration_number`** (formularz zasobu w rejestrze), `req_customer`, `req_material`, `req_quantity`, `req_task_description`, `is_global`, `is_stationary`, `color` | — |
| `resources` (= zasoby w rejestrze) | display `name` (składana z widocznych pól + opcjonalnie `description`) | `brand`, `model`, `registration_number`, **`description`**, `image_url`; przypisanie do kategorii **wyłącznie** N↔M przez `resource_to_categories` | — |
| `resource_to_categories` | `(resource_id, category_id)` | wielokrotne kategorie maszyny | cascade z `resources` i `resource_categories` |
| `materials` | `id` | `name` (klasyfikacja przez `material_to_categories`) | — |
| `material_categories` | `id` | `name`, `color` | — |
| `material_to_categories` | PK `(material_id, category_id)` | linki N↔M | cascade z `materials` i `material_categories` |
| `customers` | `id` | `first_name?`, `last_name`, `default_address?`, `latitude?`, `longitude?` | — |
| `work_orders` | `id` | `user_id` (przypisany pracownik), `resource_id`, `category_id`, `material_id?`, `customer_id?`, `task_description?`, `status` ∈ **`PENDING`** (kolejka dyspozycji) **\|`IN_PROGRESS`** (worker zaakceptował; żywa sesja `work_sessions`) **\|`COMPLETED`** **\|`CANCELLED`**, `quantity_tons?`, `expected_duration_hours?`, **`priority` ∈ `URGENT\|HIGH\|NORMAL\|LOW`** (CHECK `work_orders_priority_chk`), `due_date?`, `locked_until?`, `created_by_id?`, `created_at` | `user_id`/`created_by_id → users.id` (cascade/set null), `resource_id → resources.id` (set null), `category_id → resource_categories.id` (set null) |
| `work_sessions` | `id` | `work_order_id?` (powiązanie z dyspozycją), `user_id`, `resource_id`, `category_id?`, `material_id?`, `customer_id?`, `status` ∈ `IN_PROGRESS\|COMPLETED`, `start_time`, `end_time?`, `quantity_tons?`, `task_description?`, `machine_hours_photo_url?`, `signature_url?`, `client_absent?`, `expected_duration_hours?`, `due_date?`, **GPS bookend** `start_latitude?`, `start_longitude?`, `end_latitude?`, `end_longitude?` | `work_order_id → work_orders.id` (set null), `user_id → users.id` (cascade), `resource_id → resources.id` (set null), `material_id`/`customer_id`/`category_id → set null` |
| `session_photos` | `id` | `work_session_id`, `photo_url` (data URL JPEG, kompresja 800px/0.7 po stronie klienta), `photo_type` ∈ `START\|END\|AD_HOC`, `latitude?`, `longitude?`, `created_at` | cascade z `work_sessions` |
| `gps_logs` | `id` | `work_session_id`, `latitude`, `longitude`, `timestamp` | cascade z `work_sessions` |
| `session_notes` | `id` | `work_session_id`, `note`, `latitude?`, `longitude?`, `created_at` | cascade z `work_sessions` |
| `company_settings` | singleton (id=1) | `company_name`, `company_address?`, `zip_code?`, `city?`, `phone?`, `email?`, `base_latitude?`, `base_longitude?`, `cancel_window_minutes`(5), `require_photo_to_finish`(false), `geofence_radius_meters`(500), `time_overrun_reminder`(true), `upcoming_order_reminder_minutes`(120) | — |
| `device_logs` | `id` | `user_id?`, `level` ∈ `INFO\|WARN\|ERROR\|DEBUG`, `message`, `metadata: jsonb`, `created_at` | `user_id → users.id` (cascade) |

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
| `/admin` | RSC | `OrdersClient` | Dyspozycja (Gantt, mapa, zlecenia); `admin/page.tsx` importuje `./orders/OrdersClient` | `admin/layout.tsx` |
| `/admin/orders` | RSC | `OrdersClient` | Alias jak `/admin` (`admin/orders/page.tsx`) pod linki `?open=` z Gantta | jw. |
| `/admin/workers` | RSC | — | `redirect('/admin/users')` — zachowany URL „workers” | admin |
| `/admin/users` | RSC | `UsersClient` | Konta admin/viewer/worker + flagi biometrii (`admin/users/UsersClient.tsx`) | admin |
| `/admin/machines` | RSC | `MachinesClient` | Rejestr zasobów + kategorie zleceń (`admin/machines/MachinesClient.tsx`) | admin |
| `/admin/customers` | RSC | `CustomersClient` | Klienci CRUD + geocode | admin |
| `/admin/materials` | RSC | `MaterialsClient` | Materiały + kategorie materiałów | admin |
| `/admin/reports` | RSC | `ReportsDashboard` | SSR: `AdminReportService.getDashboardSnapshot` → `components/Admin/Reports/ReportsDashboard.tsx` | admin |
| `/admin/settings` | RSC | `SettingsForm` | Singleton ustawień firmy (`admin/settings/SettingsForm.tsx`) | admin |
| `/admin/logs` | RSC | `LogsClient` | Logi urządzeń (`device_logs`; SSR `DEVICE_LOGS_PAGE_LIMIT` + eksport → `/api/admin/logs/export`) | admin |
| `/worker` | RSC | `WorkerClient` | SSR ładuje zlecenia/sesję → aktywna sesja, lista `PENDING`, GPS, notatki, zdjęcia (`worker/WorkerClient.tsx`) | `worker/layout.tsx` |
| `/worker/wizard` | RSC | `WizardClient` | Kreator sesji: `@/features/worker/components/WizardClient` | worker |
| `/worker/history` | RSC | — | Lista zakończonych sesji — logika w `worker/history/page.tsx` + `OrderLabelCard` | worker |
| `/worker/history/[id]` | RSC | `MapWrapper`, `TimelineGalleryClient` | Szczegóły sesji (mapa GPS, galeria); reszta JSX w `page.tsx` | worker |
| `/worker/profile` | RSC | `ProfileSettings` | Profil: notyfikacje + biometria (`worker/profile/ProfileSettings.tsx`) | worker |
| `/worker/help` | RSC | `HelpAccordion` | Akordeon pomocy (`components/HelpAccordion.tsx`) | worker |

### 4.1. Layout `admin`
- `force-dynamic`. Pobiera `companyName` z `DictionaryService.getSettings()`, weryfikuje JWT z cookie i przekazuje `canMutate` (rola=`admin`) przez `AdminAbilityProvider`.
- Sidebar (desktop) + `MobileAdminNav` (mobile). Stopka z ikonką użytkownika i `LogoutButton`.

### 4.2. Layout `worker`
- `force-dynamic`. Pobiera `companyName` + nazwę zalogowanego użytkownika.
- Montuje **`<GlobalErrorHandler />`** (window `error` + `unhandledrejection` → `sendRemoteLog('ERROR', ...)`).
- Hardware back (Android): patrz root `app/layout.tsx` — **`CapacitorBackButton`** (cała aplikacja mobilna).
- Bottom nav: `Sesja / Historia / Profil / Pomoc` z `pb-safe`.

---

## 5. Routing — API (`src/app/api/**/route.ts`)

Klasyfikacja zgodna z `src/proxy.ts`:

- **`/api/auth/*`** — publiczne (sam login/logout).
- **`/api/worker/*`** — wymaga roli `worker` lub `admin` (cookie JWT).
- **`/api/machines`, `/api/materials`, `/api/customers`, `/api/categories`** — `SHARED_API_PREFIXES`. **GET**: `worker|admin|viewer`. **Mutacje** (`POST/PUT/PATCH/DELETE`): tylko `admin` (egzekwowane też przez `guardAdminMutation()` w handlerach).
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
| `/api/worker/work-orders/[id]/accept` | POST `{latitude?,longitude?}` | `WorkerOrderService.acceptOrder` — `work_orders.status='IN_PROGRESS'`, INSERT `work_sessions` (`work_order_id`, bookend GPS opcjonalnie) |
| `/api/worker/session` | GET | `WorkerSessionService.getActiveSessionWithDetails(userId)` — sesja + ustawienia + user (z `notificationsEnabled`/`canCreateOwnOrders`) |
| `/api/worker/session` | POST `{resourceId, categoryId, materialId?, customerId?, quantityTons?, taskDescription?, latitude?, longitude?}` | Wizard — `createWizardSession` (rzuca `session_active` jeśli już trwa) |
| `/api/worker/session` | PUT `{latitude?, longitude?}` | `endActiveSession` — ustawia `COMPLETED` + `end_time` + bookend GPS |
| `/api/worker/session/cancel` | POST | `cancelActiveSession` — przywraca powiązane `workOrder.status='PENDING'`, kasuje sesję |
| `/api/worker/session/notes` | POST `{note, location?:{lat,lng}}` | `addNote` |
| `/api/worker/session/notes` | PUT `{noteId, note}` | `updateNote` (z weryfikacją że nota należy do aktywnej sesji usera) |
| `/api/worker/session/photos` | POST `{photoUrl, location?}` | `addPhoto` (`photo_type='AD_HOC'`) |
| `/api/worker/gps` | GET | `GpsService.getActiveSessionGpsLogs(userId)` — logi po `timestamp` |
| `/api/worker/gps` | POST `Coord \| Coord[]` | `GpsService.saveGpsLogs` — przyjmuje pojedynczy punkt **lub tablicę** (offline sync z `GPSManager.flushQueue`) |
| `/api/worker/profile` | POST `{notificationsEnabled?:bool, biometricLoginEnabled?:bool, password?:string}` | Notyfikacje + włączenie biometrii (wymaga roli `worker` + weryfikacji hasła `bcrypt.compare`) |
| `/api/worker/logs` | POST `{level, message, metadata?}` | `SystemLogService.insertLog` — używane przez `sendRemoteLog` (z `keepalive:true`) |

### 5.3. Admin (deny-by-default → tylko admin/viewer)

| Endpoint | Metoda | Funkcja |
|---|---|---|
| `/api/admin/work-orders` | GET | `AdminOrderService.getActiveWorkOrders` — tylko **`PENDING`** (kolejka dyspozycji) |
| `/api/admin/work-orders` | POST | Tworzy zlecenie + walidacja kategorii (`validateWorkOrderFieldsAgainstCategory`) + `coerceWorkOrderPriority` + `AdminOrderService.checkScheduleConflict` (chyba że `forceSave`). 409 jeśli konflikt. |
| `/api/admin/work-orders/[id]` | PUT | Edycja (sprawdza `not_pending`); jak POST — `AdminOrderService.checkScheduleConflict` (+ `forceSave`); `guardAdminMutation` |
| `/api/admin/work-orders/[id]` | DELETE | Usuwa zlecenie + sesje pochodne (transakcja) |
| `/api/admin/archive` | GET | `AdminOrderService.getArchivedSessions` (limit 500) |
| `/api/admin/logs/export` | GET | `SystemLogService.getRecentLogs(DEVICE_LOGS_EXPORT_MAX)` → JSON z `device_logs`; limity w `src/lib/deviceLogLimits.ts`; GET dla ról admin, viewer |
| `/api/admin/work-sessions/[id]` | GET | `AdminSessionService.getSessionDetails` — logi GPS + zdjęcia + notatki |
| `/api/admin/work-sessions/[id]` | DELETE | `deleteArchivedSession` (sprzątanie + delete `work_orders` jeśli sesja z dyspozycji) |
| `/api/admin/work-sessions/[id]/force-complete` | POST | `forceCompleteSession` — ratunek dla zawieszonej `IN_PROGRESS` |
| `/api/workers` | GET | `AdminUserService.getAllUsers` |
| `/api/workers` | POST | Rejestracja konta + `bcrypt.hash(password, 10)`; `23505 → user_exists` |
| `/api/workers/[id]` | PUT | Edycja konta (z opcjonalnym hash hasła) |
| `/api/workers/[id]` | DELETE | Usunięcie konta |
| `/api/settings` | GET | `DictionaryService.getSettings()` |
| `/api/settings` | POST | `DictionaryService.updateSettings` (upsert id=1) |
| `/api/geocode?q=...` | GET | Proxy do Nominatim (OSM) — `User-Agent: WerkitERP/1.9` |

### 5.4. Słowniki (SHARED — admin pisze, wszyscy zalogowani czytają)

Każda trasa w `categories|customers|materials|machines|material-categories` ma ten sam wzorzec: `GET (DictionaryService.get*) `, `POST (DictionaryService.add*)`, `PUT/DELETE` przez `[id]/route.ts`. Mutacje za `guardAdminMutation()`. Dodatkowo handlery wykrywają **brakujące migracje** (`isMissingResourcesVehicleColumns`, `isMissingMaterialCategoriesTables`, `isMissingResourceCategoriesStationaryColumn`) → 503 z czytelnym kluczem (`migration_required`, `migration_material_categories`).

**Materiały:** `POST/PUT /api/materials` — ciało `{ name, categoryIds }`; **co najmniej jedna** kategoria (`categoryIds.length ≥ 1`), inaczej **400** `missing_material_category`. Kolumna `materials.type` usunięta migracją **0009** (`DictionaryService.addMaterial(name, categoryIds)`).

---

## 6. Warstwa serwisów (`src/services/*`)

Wszystkie metody `static async` (świadomy prosty wzorzec, nie DI). Każdy serwis żyje od `import { db } from '@/db'`.

### `AdminUserService`
- `getAllUsers()` — projekcja kolumn (bez hasła, bez `biometric_login_enabled`).
- `getUserById(userId)`, `getUserByUsername(usernameEmail)` — case-insensitive (`lower(...)`), zwraca pełny rekord.
- `getWorkers()` — pracownicy do dispatchera.
- `createUser({fullName, usernameEmail, passwordHash, role?, canCreateOwnOrders?})`.
- `updateUser(userId, updates: UserUpdatePayload)`.
- `verifyPasswordForUserId(userId, plainPassword) → boolean` (bcrypt, używane przez `/api/worker/profile` przy włączaniu biometrii).
- `deleteUser(userId)`.
- Eksport: `type UserUpdatePayload = Partial<typeof users.$inferInsert>`.

### `WorkerOrderService`
- `getPendingOrders(userId)` — JOIN: resources, materials, customers, creator (alias users), resource_categories. Sort: dueDate asc → createdAt asc. Mapuje `priority` przez `normalizeWorkOrderPriority`.
- `acceptOrder(userId, orderId, startCoord?)` — UPDATE order **`IN_PROGRESS`** + INSERT `workSessions IN_PROGRESS` (`work_order_id` ustawione) z bookend GPS. Po **`WorkerSessionService.endActiveSession`** / **`AdminSessionService.forceCompleteSession`** zlecenie przechodzi na **`COMPLETED`**. Zwraca `sessionId`.

### `WorkerSessionService`
- `getActiveSessionWithDetails(userId)` — sesja IN_PROGRESS + JOIN klient/maszyna/kategoria (z `categoryIsStationary`)/materiał + ustawienia + user (`notificationsEnabled`, `canCreateOwnOrders`) + zdjęcia + notatki.
- `createWizardSession(userId, payload)` — rzuca `session_active` jeśli już trwa.
- `endActiveSession(userId, endCoord?)` — `no_active_session` jeśli brak.
- `addNote/updateNote/addPhoto`.
- `cancelActiveSession(userId)` — jeśli `work_sessions.work_order_id` jest ustawione, **`work_orders.status → PENDING`**; usuwa wiersz sesji (również dla wizarda bez zlecenia).
- `getCompletedSessions(userId, limit=20)`, `getSessionHistoryFull(sessionId, userId)` (GPS + notatki + zdjęcia).

### `AdminOrderService`
- `checkScheduleConflict(userId, resourceId, dueDate, durationHours, excludeOrderId?)` — nakładające się zlecenia **`PENDING`** lub **`IN_PROGRESS`** dla tego pracownika lub zasobu; zwraca komunikat PL albo `null`.
- `getActiveWorkOrders()` — wyłącznie **`PENDING`** z JOIN-ami pod kolejkę dyspozycji.
- `getArchivedSessions(limit=500)` — sesje z JOIN-ami pracownika/maszyny/itp.
- `createOrder(orderData)`.
- `updateOrder(orderId, updates)` — rzuca `not_found` lub `not_pending`.
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
- `getRecentLogs(limit=500)` z LEFT JOIN users (`workerName`). Mapuje `createdAt` na ISO string.
- `insertLog(userId, level, message, metadata)`.

---

## 7. Typy domenowe (`src/types/`)

| Plik | Eksporty kluczowe |
|---|---|
| `worker.ts` | `WorkOrderPriority`, `Session`, `WorkOrder`, `Coord`, `Note`, `AppSettings`, `UserData`, `TimelineItem`, `InitialWorkerData` (kontrakt SSR → `WorkerClient`) |
| `admin.ts` | `UnifiedGanttItem` (zmergowany order/session pod Gantt), `OrderFormState` (formularz dyspozycji), `BaseWorker/Machine/Material/Customer/Category`, `ReportActiveSessionRow`, `ReportsDashboardSnapshot` |
| `wizard.ts` | `WizardCategory` (z `isStationary?`), `WizardMachine`, `WizardMaterial`, `WizardCustomer` |

**Konwencja**: **daty w propsach client → string ISO** (zob. `InitialWorkerData`, `UnifiedGanttItem`). Daty w serwisach na granicy DB → `Date`/`string` z Drizzle.

---

## 8. Worker — moduł UI (`src/features/worker/`)

### Komponenty
| Plik | Rola |
|---|---|
| `components/WizardClient.tsx` | Kreator własnej sesji (kategoria → maszyna → materiał? → klient? → start) — używa `@/components/work-orders/*`, `@/types/wizard`. |
| `components/PendingOrdersList.tsx` | Karty zleceń oczekujących (sortowanie/klasyfikacja w `lib/workOrderPresentation.ts`). |
| `components/ActiveSessionDashboard.tsx` | UI aktywnej sesji: nad `OrderLabelCard` — **`QueuedPendingOrdersDuringSession`** (rozwijana kolejka `PENDING` z `/api/worker/work-orders`); zegar, GPS, akcje. |
| `components/Modals/NotesModal.tsx`, `Modals/GpsWarningModal.tsx` | Modale. |

### Hooki
| Hook | Co robi |
|---|---|
| `useWorkerActions` | `handleEndSession` (PUT), `handleAcceptOrder` (POST), `handleCancelSession`, `handleCheckpoint` (notatka „dotarłem” + geofence-confirm dla niestacjonarnych), `handleSaveNote` (POST/PUT), `handlePhotoUpload` (kompresja `<canvas>` 800px JPEG 0.7 → POST `/api/worker/session/photos`). Każda akcja → `sendRemoteLog`. |
| `useWorkerGPS` | Web: `navigator.geolocation.watchPosition`. Native: `BackgroundGeolocation.addWatcher` (`distanceFilter: 10`, `requestPermissions: true`, `stale: true`). Filtruje punkty z `accuracy > 40m`. Co 30s `GPSManager.flushQueue` (drugi safety-net poza on-loc flush). Dla `categoryIsStationary` — wyłącza watcher, status `active`. |
| `useWorkerNotifications` | Liczy `isTimeOverrun` (przekroczony `expectedDurationHours`), `overdueOrder`, `upcomingOrder` (okno `upcoming_order_reminder_minutes` z ustawień). Schedule przez `LocalNotifications` na natywce; `localStorage 'werkit_notified_orders'` zapobiega duplikatom. |

### Lib
| Plik | Eksport |
|---|---|
| `lib/workOrderPriority.ts` | `normalizeWorkOrderPriority(value)` — mapuje nieznane na `'NORMAL'`, puste na `null`. |
| `lib/workOrderPresentation.ts` | `WORK_ORDER_PRIORITY_WEIGHT`, `sortWorkOrdersByPriorityThenCreated`, `workOrderInteractiveSurfaceClass`, `workOrderPendingListCardClass`, `workOrderCategoryHeadingClass` (Tailwind dla URGENT/HIGH/inne). |

---

## 9. Admin — moduł UI

### Lokalizacja komponentów

`src/components/Admin/**`:
- `AdminSidebarNav.tsx`, `MobileAdminNav.tsx`, `adminNavLinks.ts` (jedna kolejność pozycji menu), `adminNavActive.ts` (aktywna zakładka: `/admin` ≡ `/admin/orders`), `AdminAbilityProvider.tsx` (`useAdminAbility() → {canMutate}`),
- `Modals/OrderFormModal.tsx`, `Modals/SessionDetailsModal.tsx`,
- `Orders/OrdersDispatchTable.tsx`, `Orders/OrdersDispatchToolbar.tsx`, `Orders/OrdersSettingsQuickModal.tsx`,
- `Reports/ReportsDashboard.tsx`, `Reports/ReportStatCard.tsx`.

`src/components/GanttChart/GanttChart.tsx` — wykres Gantta dla `UnifiedGanttItem[]`.

`src/components/Map/LiveMap.tsx`, `SettingsMap.tsx`, `SettingsMapInner.tsx` — Leaflet + react-leaflet (mapy operacyjne i pickers).

### Logika wspólna
`src/features/admin/orders/dispatchPlanning.ts`:
- `formatDueDatetimeLocal(dateString)` — bezpieczny ISO bez TZ pod input `datetime-local`.
- `buildUnifiedDispatchItems(orders, sessions, search)` — scala dwa źródła w `UnifiedGanttItem[]` z grupowaniem statusu i sortowaniem.

---

## 10. Komponenty współdzielone (`src/components/work-orders/`)

| Komponent | Prop kluczowy | Co |
|---|---|---|
| `WorkOrderPriorityRibbon` | `labels: WorkOrderPriorityLabels` (wycinek `worker.client`) | URGENT (red, pulse), HIGH (orange), NORMAL (zinc), LOW (emerald). Tryb `accentOnly` rysuje tylko URGENT/HIGH. |
| `WorkOrderSummaryLines` | `dict` (wycinek), `taskItalic?`, `showDurationCreator?` | Maszyna / materiał (+t) / klient / opis / czas / zlecający. |

---

## 11. Lib (`src/lib/`)

| Plik | Co |
|---|---|
| `auth.ts` | `JWT_SECRET` (TextEncoder), `getAuthSession()` (cookie `auth_token` + `jwtVerify`), `getUserId()`, `getUserRole()`. **Fallback `super-secret-fallback`** jeśli brak `JWT_SECRET` — `console.warn`. **Na produkcji ustaw `JWT_SECRET`!** |
| `passwordCrypto.ts` | `comparePassword` / `hashPassword` — domyślnie natywny **`bcrypt`**; przy **`WERKIT_USE_BCRYPTJS=1`** lub nieudanym imporcie `bcrypt` używa **`bcryptjs`** (login + `/api/workers`, biometria w `AdminUserService`). |
| `parseRouteParams.ts` | `parsePositiveIntFromString` / `parsePositiveIntParam` — walidacja ID z URL i JSON (worker: akceptacja zlecenia, wizard sesji, edycja notatek; zapobiega `NaN` w zapytaniach). |
| `requireAdminMutation.ts` | `guardAdminMutation()` — zwraca `NextResponse 401/403` lub `undefined`. Druga linia obrony za `proxy`. |
| `coordsFromRequestBody.ts` | `coordsFromRequestBody(body) → {lat,lng}\|null` (walidacja zakresu), `coordPairToNumericStrings({lat,lng})` (toFixed(8) pod numeric Postgres). |
| `geolocationOnce.ts` | `getCurrentPositionOnce(timeout=12000)` — jednorazowy odczyt (wizard/end-session). |
| `gpsManager.ts` | `GPSManager` (klasa statyczna): `localStorage 'werkit_gps_queue'`, `enqueue/flushQueue/getDistance` (Haversine). `flushQueue` używa `keepalive:true` + retry przy `online`. |
| `biometricLogin.ts` | Owijka `@capgo/capacitor-native-biometric` (server tag `com.werkit.app.auth`). Funkcje: `isNativeBiometricContext`, `biometricHardwareAvailable`, `hasSavedBiometricCredentials`, `saveBiometricCredentials`, `clearBiometricCredentials`, `fetchCredentialsWithBiometricPrompt`. |
| `remoteLogger.ts` | `sendRemoteLog(level, message, metadata?)` → POST `/api/worker/logs` z `keepalive: true`, błędy są zjadane (`.catch(() => {})`). |
| `version.ts` | `APP_VERSION = ${pkg.version}${gitHash}` (z `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`). |
| `workOrderCategoryValidation.ts` | `validateWorkOrderFieldsAgainstCategory(cat, payload) → 'ok' \| 'invalid_category' \| 'missing_customer' \| 'missing_material' \| 'missing_quantity' \| 'missing_task_description'`; `coerceWorkOrderPriority(value) → URGENT\|HIGH\|NORMAL\|LOW`. |
| `resourceDisplayName.ts` | `buildResourceDisplayName(brand, model, registrationNumber)` — string `BRAND MODEL · REJ`, max 255. `isVehicleIdentityEmpty()` — wszystkie 3 puste. |
| `postgresMigrationHints.ts` | Detektory braku migracji 0006/0007/0005 (`isMissingResourcesVehicleColumns`, `isMissingResourceCategoriesStationaryColumn`, `isMissingMaterialCategoriesTables`). Używane przez handlery do zwracania **503 `migration_required`** zamiast 500. |
| `resolveNeonPostgresUrl.ts` | `resolveNeonPostgresUrl()` + `ensurePostgresUrlForVercelDriver()` — dla skryptów `tsx`, kiedy w `.env.local` jest tylko `DATABASE_URL` (Neon). Patrz `src/db/env.ts`. |

---

## 12. Proxy Edge (`src/proxy.ts`)

```
matcher: ['/admin/:path*', '/worker/:path*', '/login', '/api/:path*']
```

Klasyfikacja → autoryzacja → role:
- **`/login`**: jeśli jest ważne `auth_token` → **redirect** do `/worker` (rola `worker`) lub `/admin` (pozostałe role); nie wolno zwracać `next()` przed tym krokiem — inaczej wstecz z WebView pokazywałby formularz mimo aktywnej sesji.
- **`ADMIN_PANEL_ROLES = ['admin', 'viewer']`** — strony i API admin (czytanie). Mutacje API admin: tylko `admin`.
- **`WORKER_APP_ROLES = ['worker', 'admin']`** — `/worker` i `/api/worker`.
- **`SHARED_READ_ROLES = ['worker', 'admin', 'viewer']`** — `SHARED_API_PREFIXES`. Mutacje: tylko `admin`.
- Nowy publiczny shard API → **dopisz prefix do `SHARED_API_PREFIXES`**, inaczej deny-by-default zakwalifikuje go jako admin API.

Cookie `auth_token`: `HttpOnly, Secure, SameSite=None, 7d` (potrzebne dla Capacitor WebView na innym originie). Niepoprawny token → wyczyszczenie cookie + redirect/`401`.

---

## 13. i18n (`src/i18n/`)

- `locales/pl.ts` — **źródło prawdy** (sterownik kluczy) i runtime fallback.
- `locales/en.ts` — musi spełnić `AppDictionary = typeof pl`.
- `index.ts` → `getDictionary(locale='pl')`. `formatDict(template, vars)` zamienia `{klucz}` placeholdery.
- `constants.ts` → `DEFAULT_UI_LOCALE = 'pl-PL'` (do `Intl.DateTimeFormat`).

Najwyższe sloty (top-level) — używaj zawsze przez `getDictionary().<slot>`:
| Slot | Co tam jest |
|---|---|
| `apiErrors` | Mapa `kod → komunikat`. **Kluczowe** dla `/login` i wszystkich JSON-owych odpowiedzi z błędem (`error: 'xxx'`). |
| `login` | `submit`, `biometricLogin`, `biometricDivider` |
| `admin.sidebar` | Etykiety nawigacji admin |
| `admin.dashboard`, `admin.reports`, `admin.archive`, `admin.orders`, `admin.users`, `admin.workers`, `admin.machines`, `admin.materials`, `admin.customers`, `admin.settings`, `admin.logs`, `admin.modals` | Każdy ekran admina ma swój sub-słownik |
| `worker.client`, `worker.wizard`, `worker.history`, `worker.profile`, `worker.help` | UI mobilki |

Każdy `error` z route handlerów MUSI mieć odpowiednik w `apiErrors`, inaczej UI pokaże surowy kod.

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

**Wszystkie skrypty** używają `loadEnvConfig(cwd)` + `ensurePostgresUrlForVercelDriver()` z `src/lib/resolveNeonPostgresUrl.ts`. Brak `DATABASE_URL`/`POSTGRES_URL` → komunikat instruujący wklejenie connection stringa do `.env.local`.

`src/scripts/migrate_categories.ts` — **noop** po migracji **0014** (komunikat informacyjny); historyczny proces opisany w komentarzu w pliku.

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
5. **Konflikty harmonogramu zleceń** — logika w `AdminOrderService.checkScheduleConflict`; nie dodawaj ponownie zapytań Drizzle do `src/lib/` dla tego case’u.
6. **JWT_SECRET fallback** — `'super-secret-fallback'`. Jeśli kiedykolwiek `console.warn` pojawi się na produkcji, traktuj jako incydent bezpieczeństwa.
7. **GPS bookend** (`workSessions.start_*`/`end_*`) — wymaga migracji 0008. Akceptacja zlecenia (`POST /api/worker/work-orders/:id/accept`) i koniec sesji (`PUT /api/worker/session`) wysyłają `{latitude, longitude}` w body, ale są opcjonalne (urządzenie bez zgody na GPS → po prostu null w bazie).
8. **`/api/worker/gps`** akceptuje **pojedynczy obiekt LUB tablicę** (offline sync). Klient zawsze wysyła tablicę (zob. `GPSManager.flushQueue`), ale serwer toleruje też pojedynczy.
9. **Cookie `SameSite=None, Secure`** — wymagane dla WebView na innym originie (Capacitor). Lokalnie na `http://localhost:3000` przeglądarka odrzuci `Secure` cookie — to **wyłącznie problem dev-przeglądarki**, mobilka działa.
10. **Mutacje admin** — zawsze przez `guardAdminMutation()` (nawet jeśli `proxy` już sprawdza). Druga warstwa obrony chroni przed pominięciem matchera.
11. **Pusta lista kategorii na `/admin/machines` + „Błąd pobierania danych”** — kod jest już wdrożony, ale **baza bez migracji 0010** (`resource_categories.show_*`): dawniej **GET `/api/categories`** padał na `SELECT` przez Drizzle. Serwis robi teraz **fallback** (odczyt bez `show_*`, domyślnie `show* = true`). **Zapis** kategorii nadal wymaga kolumn: uruchom `npm run db:napraw-kategorie-widocznosc` (lub SQL z `drizzle/0010` + `0011`) na bazie produkcyjnej.
12. **`GET /api/geocode`** — `q` min. 3 znaki, **maks. 280** (anty-nadużycie wobec Nominatim); błędy walidacji `short_query` / `query_too_long`. **Brak wyniku Nominatim:** odpowiedź **200** z `{ lat: null, lng: null, error: "not_found" }` (nie HTTP 404), żeby nie zaśmiecać telemetrii i UI.
13. **`POST /api/worker/logs`** — `level` tylko z zestawu `INFO|WARN|ERROR|DEBUG`; długość `message` i `metadata` ograniczona przed zapisem (stabilność + rozmiar wiersza w `device_logs`).

---

## 18. Dług techniczny

**Pełny plan faz, ryzyka i checklistę:** [`TECH_DEBT_ROADMAP.md`](./TECH_DEBT_ROADMAP.md) (tam aktualizuj postęp — nie rozdmuchuj tej sekcji).

Skrót: kolumny legacy usunięte migracją **0014**; pipeline migracji (`db:napraw-wszystko-i-zweryfikuj` + **`npm run db:migrate:pg`** dla journalu Drizzle, w tym **0013/0014**); `passwordCrypto` + `WERKIT_USE_BCRYPTJS`; §4 mapuje trasy admin → komponenty UI. **Fazy A–F roadmapy zamknięte** — patrz [`TECH_DEBT_ROADMAP.md`](./TECH_DEBT_ROADMAP.md).

---

*Ostatnia weryfikacja vs repo: 2026-05-14. Jeśli przypisanie endpoint↔serwis rozjedzie się z kodem — aktualizuj ten plik w tym samym PR.*

---

## 19. CI i formalności repozytorium

| Element | Lokalizacja |
|---|---|
| CI (lint, TypeScript, build Next) | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `main`, PR do `main` |
| Build Android (Capacitor) | [`.github/workflows/android-build.yml`](../.github/workflows/android-build.yml) |
| Licencja (zastrzeżone prawa) | [`LICENSE`](../LICENSE); pole `license` w `package.json`: `UNLICENSED` |
| Raportowanie podatności | [`SECURITY.md`](../SECURITY.md) |

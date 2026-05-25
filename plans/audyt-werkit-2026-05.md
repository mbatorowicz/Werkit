# Audyt aplikacji Werkit — raport końcowy

**Data:** 2026-05-25  
**Wersja aplikacji:** 1.9.4  
**Stack:** Next.js 16.2.4 + React 19.2.4 + Capacitor 8 + Drizzle ORM 0.45.2 + PostgreSQL (Neon)  
**Środowisko docelowe:** PWA + Android (APK)

---

## Spis treści

1. [Architektura i struktura projektu](#1-architektura-i-struktura-projektu)
2. [Baza danych i migracje](#2-baza-danych-i-migracje)
3. [Bezpieczeństwo](#3-bezpieczeństwo)
4. [Jakość kodu — ESLint](#4-jakość-kodu--eslint)
5. [Serwisy i warstwa dostępu do danych](#5-serwisy-i-warstwa-dostępu-do-danych)
6. [Internacjonalizacja (i18n)](#6-internacjonalizacja-i18n)
7. [Konfiguracja mobilna (Capacitor)](#7-konfiguracja-mobilna-capacitor)
8. [Multi-tenant](#8-multi-tenant)
9. [Testy](#9-testy)
10. [Dług techniczny](#10-dług-techniczny)
11. [Podsumowanie i rekomendacje](#11-podsumowanie-i-rekomendacje)

---

## 1. Architektura i struktura projektu

### Stack technologiczny

| Warstwa | Technologia | Uwagi |
|---------|-------------|-------|
| Framework | Next.js 16.2.4 (App Router) | Turbopack w dev |
| Język | TypeScript (strict) | Zakaz `any` |
| UI | Tailwind CSS 4 + lucide-react | Paleta zinc/emerald |
| Baza danych | PostgreSQL (Neon) + Drizzle ORM 0.45.2 | 18 migracji |
| Auth | JWT (jose) w cookie `auth_token` | HttpOnly/Secure/SameSite=None |
| Mobile | Capacitor 8.3.1 | WebView ładuje zewnętrzny URL |
| Mapy | Leaflet (react-leaflet) | Trasy OSRM |
| CI/CD | GitHub Actions | Lint → TS → Test → Build → Android APK |

### Struktura katalogów

```
src/
├── app/                    # Routing Next.js (page.tsx, layout.tsx)
│   ├── admin/              # Panel administratora
│   ├── platform/           # Superadmin (multi-tenant)
│   ├── worker/             # Aplikacja pracownika
│   ├── api/                # API Route Handlers
│   └── login/              # Strona logowania
├── features/
│   ├── worker/             # Moduł pracownika (wizard, GPS, profile, shell)
│   └── admin/              # Moduł admina (machines, materials, categories, orders)
├── components/             # UI współdzielony
│   └── work-orders/        # Prezentacja zleceń (admin + worker)
├── services/               # Warstwa dostępu do DB (SSOT zapytań)
├── db/                     # Schemat Drizzle + połączenie
├── lib/                    # Utility, auth, telemetria, i18n
├── types/                  # Typy domenowe (worker.ts, admin.ts, wizard.ts)
├── i18n/                   # Internacjonalizacja
├── hooks/                  # Hooki UI
└── scripts/                # Skrypty narzędziowe (migracje, weryfikacja)
```

### Ocena architektury: ⭐⭐⭐⭐✩ (4.5/5)

**Mocne strony:**
- Czysta separacja warstw: `app/` (routing) → `services/` (DB) → `lib/` (utilities)
- Serwisy jako SSOT zapytań DB — `app/` nie importuje `@/db/schema` bezpośrednio
- Proxy Edge (`src/proxy.ts`) jako strażnik autoryzacji — rola, matcher, ochrona mutacji
- Modułowa struktura `features/` dla logiki domenowej

**Słabe strony:**
- Niektóre komponenty w `app/admin/*/` przekraczają ~300 linii (np. `OrdersClient.tsx`)
- Mieszanka Server Components i Client Components — nie wszędzie konsekwentnie stosowana
- Brak dedykowanego katalogu `src/lib/map/` (część funkcji mapowych jest w `services/`)

---

## 2. Baza danych i migracje

### Schemat (14 tabel)

| Tabela | Opis |
|--------|------|
| `companies` | Firmy (multi-tenant root) |
| `users` | Użytkownicy (admin/worker/viewer/superadmin) |
| `resource_categories` | Kategorie zasobów (z hierarchią parent_id) |
| `resources` | Zasoby/maszyny |
| `resource_to_categories` | Wiązanie M:N zasobów z kategoriami |
| `materials` | Materiały |
| `material_categories` | Kategorie materiałów (z hierarchią) |
| `material_to_categories` | Wiązanie M:N materiałów z kategoriami |
| `customers` | Klienci |
| `customer_locations` | Lokalizacje klientów (z route waypoints) |
| `work_orders` | Zlecenia |
| `work_sessions` | Sesje robocze |
| `session_photos` | Zdjęcia z sesji |
| `session_notes` | Notatki z sesji |
| `gps_logs` | Logi GPS |
| `company_settings` | Ustawienia firmy |
| `device_logs` | Logi zdalne z urządzeń |

### Migracje: 18 plików SQL (0000–0018)

| # | Nazwa | Opis |
|---|-------|------|
| 0000 | `stormy_dakota_north` | Schemat początkowy |
| 0001 | `whole_infant_terrible` | Rozszerzenie users |
| 0002 | `violet_lord_tyger` | Rozszerzenie sesji |
| 0003 | `work_orders_priority_chk` | Constraint CHECK priorytetu |
| 0004 | `users_biometric_login` | Biometria |
| 0005 | `material_categories` | Kategorie materiałów |
| 0006 | `resources_vehicle_identity` | Tożsamość pojazdu |
| 0007 | `resource_categories_stationary` | Typ stacjonarny |
| 0008 | `work_sessions_bookend_coords` | Współrzędne bookend |
| 0009 | `materials_drop_type` | Usunięcie kolumny type |
| 0010 | `resource_categories_visibility` | Widoczność pól |
| 0011 | `undo_stationary_auto_hide_fields` | Cofnięcie auto-hide |
| 0012 | `resources_description_category_resource_fields` | Rozszerzenie zasobów |
| 0013 | `work_orders_in_progress_status` | Status IN_PROGRESS |
| 0014 | `drop_legacy_session_type_resource_category` | Legacy cleanup |
| 0015 | `customer_locations_planned_route` | Trasy klientów |
| 0016 | `category_hierarchy` | Hierarchia kategorii |
| 0017 | `multi_company` | Multi-tenant |
| 0018 | `users_can_create_customers` | Uprawnienie tworzenia klientów |

### Pipeline migracji

- **Główny:** `npm run db:migrate:pg` — Drizzle migrate przez TCP
- **Idempotentne skrypty:** `npm run db:napraw-wszystko` (lub `db:napraw-*`)
- **Weryfikacja:** `npm run db:verify-schema` — porównuje `schema.ts` z rzeczywistą bazą
- **Fallback:** `DictionaryService.getCategoriesLegacyColumnsOnly()` dla baz przed migracją 0010

### Ocena: ⭐⭐⭐⭐⭐ (5/5)

- Kompletny schemat z relacjami Drizzle
- Wszystkie migracje zdefiniowane w `drizzle/meta/_journal.json`
- Idempotentne skrypty naprawcze
- Weryfikacja schematu po zmianach
- Multi-tenant przez `company_id` na wszystkich tabelach operacyjnych

---

## 3. Bezpieczeństwo

### Autoryzacja (proxy.ts)

| Aspekt | Status |
|--------|--------|
| JWT w cookie `auth_token` | ✅ HttpOnly, Secure, SameSite=None |
| Weryfikacja przez `jose` | ✅ |
| Role: superadmin/admin/worker/viewer | ✅ |
| Ochrona mutacji dla viewer | ✅ (blokada POST/PUT/PATCH/DELETE) |
| Shared API prefixes | ✅ (`/api/machines`, `/api/materials`, `/api/customers`, `/api/categories`) |
| Superadmin → /platform | ✅ (blokada dostępu do /admin, /worker) |

### Hasła

- **bcrypt** (native) z fallbackiem do **bcryptjs** (pure JS) przez `WERKIT_USE_BCRYPTJS=1`
- Lazy loading implementacji (singleton)
- `comparePassword()` i `hashPassword()` — poprawne użycie

### 🔴 Zagrożenia / uwagi

1. **JWT_SECRET fallback** — [`src/lib/auth.ts:6-10`](src/lib/auth.ts:6)  
   `const getJwtSecret = () => process.env.JWT_SECRET || 'super-secret-fallback'`  
   W produkcji brak zmiennej `JWT_SECRET` powoduje użycie fallbacka (console.warn).  
   **Ryzyko:** każdy, kto zna kod, może podpisać token JWT.

2. **Brak rate limitera** — endpointy logowania i API nie mają ochrony przed brute-force.

3. **Brak CSRF** — cookie `auth_token` jest podatne na CSRF, jeśli nie jest chronione przez `SameSite=Strict` lub osobny token CSRF.

4. **`any` w API routes** — wiele handlerów API używa `as any` do rzutowania odpowiedzi, co omija TypeScript strict.

### Ocena: ⭐⭐⭐✩✩ (3.5/5)

Bezpieczeństwo jest solidne w warstwie autoryzacji, ale ma krytyczne luki (JWT_SECRET fallback, brak rate limitingu).

---

## 4. Jakość kodu — ESLint

### Konfiguracja (`eslint.config.mjs`)

- `@typescript-eslint/no-explicit-any`: **error**
- `react/no-unescaped-entities`: **warn**
- `react-hooks/set-state-in-effect`: **warn**
- `no-console`: **warn** (z wyjątkiem `src/scripts/`)

### 🔴 Znalezione problemy (z `lint_output.txt`)

#### Krytyczne (błędy)

| Plik | Problem | Linia |
|------|---------|-------|
| [`src/app/admin/orders/OrdersClient.tsx`](src/app/admin/orders/OrdersClient.tsx:211) | `Date.now()` podczas renderu (impure function) | 211 |
| [`src/app/admin/orders/OrdersClient.tsx`](src/app/admin/orders/OrdersClient.tsx:10-14) | `any` type (5 wystąpień) | 10-14 |
| [`src/app/admin/orders/SessionDetailsModal.tsx`](src/app/admin/orders/SessionDetailsModal.tsx:13-16) | `any` type (4 wystąpienia) | 13-16, 22 |
| [`src/app/admin/orders/SessionDetailsModal.tsx`](src/app/admin/orders/SessionDetailsModal.tsx:111) | `<img>` zamiast `next/image` | 111 |
| Wiele API route handlerów | `any` type w catch/err | ~30+ plików |

#### Ostrzeżenia

| Wzorzec | Wystąpienia | Pliki |
|---------|-------------|-------|
| `setState` w `useEffect` (brak zależności) | ~6 | `*Client.tsx` (Orders, Machines, Materials, Customers, Workers) |
| Nieużywane importy (lucide-react) | ~10+ | `admin/layout.tsx`, `MachinesClient.tsx` |
| Nieużywane parametry (`err`, `e`, `index`) | ~30+ | Większość API route handlerów |
| Nieużywany `request` | ~2 | `auth/logout/route.ts`, `worker/session/route.ts` |

### Ocena: ⭐⭐⭐✩✩ (3/5)

Projekt ma skonfigurowany ESLint z ostrymi regułami, ale rzeczywista zgodność z nimi jest niska. Wiele plików zawiera `any`, nieużywane zmienne i importy.

---

## 5. Serwisy i warstwa dostępu do danych

### Lista serwisów (11 klas)

| Serwis | Odpowiedzialność |
|--------|-----------------|
| `AdminOrderService` | CRUD zleceń, schedule conflict, archiwum |
| `AdminSessionService` | Szczegóły sesji, force complete, usuwanie |
| `AdminUserService` | CRUD użytkowników, weryfikacja hasła |
| `AdminReportService` | Dashboard raportów (metryki, aktywne sesje) |
| `DictionaryService` | Słowniki (kategorie, klienci, materiały, zasoby, ustawienia) |
| `CustomerLocationService` | Lokalizacje klientów, waypoints, sync legacy |
| `GpsService` | Zapis i odczyt logów GPS |
| `ScheduleConflictService` | Wykrywanie konfliktów harmonogramu |
| `PlatformCompanyService` | CRUD firm (superadmin) |
| `PlatformAnalyticsService` | Usage overview (superadmin) |
| `categoryHierarchyValidation` | Walidacja hierarchii kategorii |

### Wzorce

- **Statyczne metody** — wszystkie serwisy używają `static async`
- **Brak DI** — serwisy importują `db` bezpośrednio
- **Typy eksportowane** — `UserUpdatePayload`, `ResourceCategoryUpdateInput`, `MaterialCategoryUpdateInput`
- **Fallback na legacy** — `DictionaryService.getCategoriesLegacyColumnsOnly()` dla baz przed migracją 0010

### Ocena: ⭐⭐⭐⭐✩ (4/5)

Serwisy są dobrze zorganizowane i stanowią SSOT zapytań DB. Brak DI to świadomy wybór (Next.js Edge), ale utrudnia testowanie jednostkowe.

---

## 6. Internacjonalizacja (i18n)

### Architektura

- **Source of truth:** [`src/i18n/locales/pl.ts`](src/i18n/locales/pl.ts) (940 linii)
- **Angielski:** [`src/i18n/locales/en.ts`](src/i18n/locales/en.ts) (942 linie) — mirror struktury PL
- **Typ:** `AppDictionary = typeof pl` — PL definiuje kształt
- **Funkcje:** `getDictionary(locale)`, `formatDict(template, vars)`, `formatUiDateOnly()`, `formatUiTimeHm()`, `formatUiDateTimeShort()`
- **Locale domyślny:** `pl-PL`, strefa czasowa: `Europe/Warsaw`

### Struktura słowników

```
apiErrors (~50 kodów błędów)
workOrdersSchedule
routeLoading
login
admin:
  sidebar, categories, ui, dashboard, reports, archive, orders,
  gantt, orderFields, map, workers, machines, materials, customers,
  settings, logs
worker:
  client, alarms, profile, history, help
platform:
  organizations (CRUD)
```

### Ocena: ⭐⭐⭐⭐⭐ (5/5)

- Pełne pokrycie PL i EN
- PL jako source of truth — spójność typów
- `formatDict()` z placeholderami `{key}`
- Spójne formatowanie dat (pl-PL, Europe/Warsaw)

---

## 7. Konfiguracja mobilna (Capacitor)

### `capacitor.config.ts`

```typescript
server: { url: 'https://werkit.cncsolutions.dev/' }
```

- **App ID:** `com.werkit.app`
- **WebDir:** `public`
- **Tryb:** WebView ładuje zewnętrzny URL (Next.js wymaga serwera Node)

### Funkcjonalności mobilne

| Funkcja | Status |
|---------|--------|
| Logowanie biometryczne | ✅ (`@capgo/capacitor-native-biometric`) |
| Background geolocation | ✅ (fetch z `keepalive: true`) |
| Lokalne notyfikacje | ✅ (alarmy dźwiękowe) |
| Hardware back button | ✅ (`CapacitorBackButton`) |
| Sync wersji web ↔ APK | ✅ (`AppDownloadCard`, `werkit-apk-meta.json`) |

### Ocena: ⭐⭐⭐⭐✩ (4/5)

Capacitor jest dobrze zintegrowany, ale WebView ładujący zewnętrzny URL oznacza, że aplikacja wymaga stałego połączenia z internetem. Brak offline-first.

---

## 8. Multi-tenant

### Implementacja

- **Root:** tabela `companies`
- **Scope:** `company_id` na wszystkich tabelach operacyjnych
- **Context:** [`src/lib/tenantContext.ts`](src/lib/tenantContext.ts) — `getTenantCompanyId()`, `resolveTenantCompanyId()`
- **Superadmin:** rola `superadmin` → panel `/platform`
- **Legacy JWT:** fallback do DB dla tokenów bez `companyId`

### Serwisy tenant

- `PlatformCompanyService` — CRUD firm
- `PlatformAnalyticsService` — usage overview
- `requireCompanyScopedSession()` — guard dla API
- `requireServerCompanyId()` — guard dla Server Components

### Ocena: ⭐⭐⭐⭐✩ (4/5)

Multi-tenant jest dobrze zaimplementowany, ale legacy JWT bez `companyId` wymagają dodatkowego zapytania do DB.

---

## 9. Testy

### Framework: Vitest v3.2.4

### Istniejące testy

| Plik testu | Testowany plik |
|------------|---------------|
| `clientRateLimit.test.ts` | `clientRateLimit.ts` |
| `filterResourcesForCategory.test.ts` | `filterResourcesForCategory.ts` |
| `floatingPanelPosition.test.ts` | `floatingPanelPosition.ts` |
| `narrowApiListRows.test.ts` | `narrowApiListRows.ts` |
| `parseJsonArray.test.ts` | `parseJsonArray.ts` |
| `resolveNeonPostgresUrl.test.ts` | `resolveNeonPostgresUrl.ts` |
| `tenantContext.test.ts` | `tenantContext.ts` |
| `workerUserPermissions.test.ts` | `workerUserPermissions.ts` |
| `AdminUserService.test.ts` | `AdminUserService.ts` |
| `PlatformCompanyService.test.ts` | `PlatformCompanyService.ts` |

### Ocena: ⭐⭐✩✩✩ (2/5)

- Testy pokrywają głównie utility `lib/` i 2 serwisy
- Brak testów dla komponentów React, API route handlerów, komponentów worker
- Brak testów integracyjnych z bazą danych
- Tech debt D-02 (test expansion) oznaczony jako `in_progress`

---

## 10. Dług techniczny

### Stan z [`docs/TECH_DEBT_ROADMAP.md`](docs/TECH_DEBT_ROADMAP.md)

| Faza | Opis | Status |
|------|------|--------|
| A | Harmonogram w serwisach | ✅ Zamknięta |
| B | Pipeline migracji | ✅ Zamknięta |
| C | Legacy kolumny DB | ✅ Zamknięta |
| D | Semantyka statusu zlecenia | ✅ Zamknięta |
| E | bcrypt / bcryptjs | ✅ Zamknięta |
| F | Dokumentacja routingu admin | ✅ Zamknięta |

### Aktualne pozycje

| ID | Opis | Status |
|----|------|--------|
| D-01 | Unifikacja date/time | ✅ Done |
| D-02 | Rozszerzenie testów | 🔄 In progress |
| D-03 | Okna czasowe telemetrii | ✅ Done |
| D-04 | Abstrakcja providera tras mapy | ✅ Done |

### Dodatkowy dług zidentyfikowany w audycie

1. **JWT_SECRET fallback** — krytyczny
2. **`any` type w ~30+ plikach** — średni
3. **`setState` w `useEffect` bez zależności** — średni
4. **`Date.now()` podczas renderu** — krytyczny (niestabilny output)
5. **Nieużywane importy/zmienne** — niski
6. **Brak testów komponentów** — średni
7. **Brak rate limitingu** — średni
8. **`<img>` zamiast `next/image`** — niski

---

## 11. Podsumowanie i rekomendacje

### Ogólna ocena: ⭐⭐⭐⭐ (4/5)

Werkit to dojrzała aplikacja logistyczna z dobrze zaprojektowaną architekturą, solidnym systemem autoryzacji i kompletnym pokryciem i18n. Projekt ma jednak kilka obszarów wymagających pilnej uwagi.

### 🔴 Pilne (do natychmiastowej naprawy)

1. **JWT_SECRET fallback** — usunąć fallback `'super-secret-fallback'` i wymusić ustawienie zmiennej środowiskowej
2. **`Date.now()` w renderze** — przenieść do `useEffect` w [`OrdersClient.tsx`](src/app/admin/orders/OrdersClient.tsx:211)
3. **`any` type w API routes** — zastąpić konkretnymi typami lub type guards

### 🟡 Zalecane (w ciągu 2-4 tygodni)

4. **Rate limiting** — dodać na endpointy logowania i API
5. **Testy komponentów** — rozszerzyć pokrycie testowe (D-02)
6. **`setState` w `useEffect`** — dodać brakujące zależności w `*Client.tsx`
7. **CSRF protection** — rozważyć `SameSite=Strict` lub osobny token
8. **Nieużywane importy** — wyczyścić (głównie lucide-react)

### 🟢 Opcjonalne (przy okazji)

9. **`<img>` → `next/image`** — w [`SessionDetailsModal.tsx`](src/app/admin/orders/SessionDetailsModal.tsx:111)
10. **Refaktoryzacja komponentów >300 linii** — podzielić na mniejsze
11. **Offline-first** — rozważyć Service Workery dla PWA
12. **Dodanie `src/lib/map/`** — wydzielenie funkcji mapowych z serwisów

---

*Raport wygenerowany na podstawie audytu kodu źródłowego Werkit v1.9.4 w dniu 2026-05-25.*

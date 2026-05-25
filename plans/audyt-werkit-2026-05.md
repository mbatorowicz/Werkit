# Audyt spójności — Werkit (2026-05)

## Zakres

Przegląd całego kodu pod kątem **spójności architektury, kodu i stylu** — zgodnie z regułami z [`AGENTS.md`](../AGENTS.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/SYSTEM_MAP.md`](../docs/SYSTEM_MAP.md).

---

## 1. Architektura — warstwy i granice modułów

### 1.1. `src/app/` nie importuje `@/db` ✅

**Reguła z ARCHITECTURE.md §4:** `src/app/` nie może importować `@/db` ani `@/db/schema`.

- **Wynik:** 0 importów `@/db` w `src/app/api/**/*.ts` — reguła w pełni respektowana.
- Wszystkie zapytania DB przechodzą przez `src/services/`.

### 1.2. Serwisy — tylko `src/services/` ma dostęp do DB ✅

- **20 plików** w `src/services/` (w tym `dictionary/` sub-moduł) importuje `@/db` — to jedyne miejsce w aplikacji.
- Wzorzec **static class** (np. [`AdminOrderService`](../src/services/AdminOrderService.ts), [`WorkerOrderService`](../src/services/WorkerOrderService.ts), [`ScheduleConflictService`](../src/services/ScheduleConflictService.ts)) — spójny.
- [`DictionaryService`](../src/services/DictionaryService.ts) to **barrel re-export** delegujący do `src/services/dictionary/` — poprawny wzorzec fasady.

### 1.3. Routing (`src/app/`) — cienkie wrappery ✅

- Wszystkie route handlery w `src/app/api/` są cienkie: walidacja JWT → delegacja do serwisu → odpowiedź.
- Używają [`withApiErrorHandling`](../src/lib/apiRoute.ts:99) — spójny wzorzec obsługi błędów.
- [`guardAdminMutation`](../src/lib/requireAdminMutation.ts:5) — druga warstwa auth dla mutacji admina.

### 1.4. Katalog `src/app/api/settings/` — **pusty (orphan)** ⚠️

- `src/app/api/settings/` istnieje ale **nie zawiera `route.ts`** — jest pusty.
- Rzeczywisty settings API: [`src/app/api/admin/settings/route.ts`](../src/app/api/admin/settings/route.ts).
- **Zalecenie:** usunąć pusty katalog, aby uniknąć 404 lub konfuzji.

---

## 2. Typy i `any`

### 2.1. Użycie `any` — minimalne ✅

- **1 wystąpienie** `as any` w całym audytowanym kodzie:
  - [`src/lib/apiRoute.ts:23`](../src/lib/apiRoute.ts:23) — `(this as any).cause = opts.cause` z adnotacją `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TS < 5.6 compatibility`
  - Jest to uzasadnione (TS < 5.6 nie wspiera `Error.cause` w klasie).
- **Brak** luźnych `any` w serwisach, route handlerach, narrow modułach.

### 2.2. Type narrowing — wzorcowe ✅

- Moduł [`src/lib/narrow/`](../src/lib/narrow/index.ts) zawiera kompletne zawężacze typów dla odpowiedzi API:
  - [`shared.ts`](../src/lib/narrow/shared.ts) — helpery (`isRecord`, `readBool`, `narrowPriority`)
  - [`base.ts`](../src/lib/narrow/base.ts) — typy bazowe (worker, machine, material, customer, category)
  - [`admin.ts`](../src/lib/narrow/admin.ts) — panel admina (użytkownicy, klienci, Gantt)
  - [`worker.ts`](../src/lib/narrow/worker.ts) — moduł pracownika (zlecenia, wizard)
  - [`machines.ts`](../src/lib/narrow/machines.ts) — maszyny i materiały
- [`narrowApiListRows.ts`](../src/lib/narrowApiListRows.ts) — deprecated barrel re-export → poprawny wzorzec migracji.

### 2.3. `Array.isArray` przed `.map()`/`.filter()` ✅

- Wszystkie narrow funkcje używają `for...of` z `isRecord(row)` guard — bezpieczne przed 500/obiektem.
- Reguła z AGENTS.md §4.1 spełniona.

---

## 3. i18n — internacjonalizacja

### 3.1. Struktura słowników — zgodna PL ↔ EN ✅

- [`pl.ts`](../src/i18n/locales/pl.ts) (940 linii) i [`en.ts`](../src/i18n/locales/en.ts) (942 linie) mają **identyczną strukturę kluczy**:
  - 34 top-level slotów: `apiErrors`, `workOrdersSchedule`, `routeLoading`, `login`, `admin` (18 sub-slotów), `worker` (6 sub-slotów), `platform`
- `en.ts` jest typowany jako `AppDictionary = typeof pl` ([`types.ts`](../src/i18n/types.ts:3)) — PL jest SSOT struktury.

### 3.2. Wzorzec użycia — `getDictionary()` ✅

- Wszystkie stringi UI przez [`getDictionary()`](../src/i18n/index.ts) / sloty `worker.*`, `admin.*`, `apiErrors`.
- Placeholdery przez `formatDict`.
- Domyślny locale: [`DEFAULT_UI_LOCALE`](../src/i18n/constants.ts).

---

## 4. Serwisy — spójność wzorca

### 4.1. Static class pattern ✅

Wszystkie serwisy używają spójnego wzorca:

```typescript
export class SomeService {
  static async methodName(...) { ... }
}
```

Lista serwisów (20 plików):
- `AdminOrderService`, `AdminReportService`, `AdminSessionService`, `AdminUserService`
- `WorkerOrderService`, `WorkerSessionService`
- `ScheduleConflictService`, `GpsService`, `SystemLogService`, `CustomerLocationService`
- `PlatformAnalyticsService`, `PlatformCompanyService`
- `DictionaryService` (fasada) → `CategoryService`, `MaterialService`, `MaterialCategoryService`, `CustomerService`, `ResourceService`, `SettingsService`
- `categoryHierarchyValidation` (helper, nie klasa)

### 4.2. `DictionaryService` jako fasada ✅

- [`DictionaryService`](../src/services/DictionaryService.ts) re-eksportuje typy i deleguje do sub-serwisów w `src/services/dictionary/`.
- [`src/services/dictionary/index.ts`](../src/services/dictionary/index.ts) — barrel re-export wszystkich serwisów słownikowych.

### 4.3. `console.warn` tylko w `CategoryService.ts` ✅

- 1 wystąpienie: [`CategoryService.ts:44`](../src/services/dictionary/CategoryService.ts:44) — ostrzeżenie o legacy kolumnach przed migracją 0010. Akceptowalne.

---

## 5. Komponenty UI

### 5.1. Dialogi — tylko `useAppDialog()` ✅

- **Brak** `window.alert` / `window.confirm` w `src/features/` i `src/components/`.
- Wszystkie dialogi przez [`AppDialogProvider`](../src/components/AppDialogProvider.tsx) → `useAppDialog()`.
- Wzorzec z AGENTS.md §6 w pełni respektowany.

### 5.2. Modale — spójna obudowa ✅

- [`AdminModalShell`](../src/components/Admin/AdminModalShell.tsx) — obudowa modali edycji.
- [`FormModalFooter`](../src/components/FormModalFooter.tsx) — stopka Anuluj + Zapisz.
- [`AdminPasswordConfirmModal`](../src/components/Admin/AdminPasswordConfirmModal.tsx) — potwierdzenie hasłem przy usuwaniu sesji.

### 5.3. `console.log` — tylko w skryptach CLI ✅

- **0** `console.log` w `src/app/api/`, `src/features/`, `src/components/`.
- Wszystkie `console.log` w `src/scripts/` — skrypty CLI (migracje, weryfikacja, generowanie dźwięków). Akceptowalne.

---

## 6. Proxy (Edge Middleware)

### 6.1. [`src/proxy.ts`](../src/proxy.ts) — spójna ochrona tras ✅

- JWT weryfikacja przez `jose`.
- Role: `admin`/`viewer` → panel admina, `worker`/`admin` → aplikacja worker.
- `SHARED_API_PREFIXES` dla współdzielonych API (`/api/machines`, `/api/materials`, `/api/customers`, `/api/categories`).
- Specjalny przypadek: worker z `can_create_customers` może POST `/api/customers`.
- Matcher: `/admin/:path*`, `/worker/:path*`, `/platform/:path*`, `/login`, `/api/:path*`.

### 6.2. Auth helpers ✅

- [`getAuthSession()`](../src/lib/auth.ts:25) — odczyt JWT z cookie.
- [`guardAdminMutation()`](../src/lib/requireAdminMutation.ts:5) — druga warstwa dla mutacji.
- [`requireCompanyScopedSession()`](../src/lib/apiTenant.ts:30) — tenant-aware sesja.

---

## 7. Baza danych i migracje

### 7.1. Schema vs verify_schema_alignment — zgodne ✅

- [`src/db/schema.ts`](../src/db/schema.ts) (298 linii) — 15 tabel z relacjami.
- [`src/scripts/verify_schema_alignment.ts`](../src/scripts/verify_schema_alignment.ts) (245 linii) — zawiera kompletne EXPECTED column sets dla 17 tabel (w tym legacy).
- Oba są utrzymywane równolegle zgodnie z AGENTS.md §1a.

### 7.2. Priorytet zleceń — CHECK constraint ✅

- `work_orders.priority` z CHECK: `URGENT | HIGH | NORMAL | LOW`.
- Migracja [`0003_work_orders_priority_chk.sql`](../drizzle/0003_work_orders_priority_chk.sql).
- Normalizacja przez [`normalizeWorkOrderPriority`] — spójna.

### 7.3. Hierarchia kategorii ✅

- `resource_categories` / `material_categories`: `parent_id`, `is_group`, `sort_order`.
- API: `GET /api/categories?leavesOnly=1`.
- Logika drzewa: [`src/lib/categoryTree.ts`](../src/lib/categoryTree.ts).
- Walidacja: [`src/services/categoryHierarchyValidation.ts`](../src/services/categoryHierarchyValidation.ts).

---

## 8. Znalezione problemy

| # | Problem | Lokalizacja | Zalecenie |
|---|---------|-------------|-----------|
| 1 | **Pusty katalog API** | [`src/app/api/settings/`](../src/app/api/settings/) | Usunąć — nie zawiera `route.ts`, rzeczywisty endpoint w `src/app/api/admin/settings/` |
| 2 | **`narrowApiListRows.ts`** — deprecated re-export | [`src/lib/narrowApiListRows.ts`](../src/lib/narrowApiListRows.ts) | Stan przejściowy OK, ale warto sprawdzić czy wszystkie call-site'y już używają `@/lib/narrow` |
| 3 | **`ScheduleConflictService.checkScheduleConflict()`** — oznaczony jako deprecated | [`src/services/AdminOrderService.ts:61`](../src/services/AdminOrderService.ts:61) | Upewnić się że wszystkie call-site'y używają nowej ścieżki przez `ScheduleConflictService` |

---

## 9. Podsumowanie

### ✅ Co jest spójne

1. **Architektura warstwowa** — `app/` → `services/` → `db/`, brak przecieków.
2. **Typowanie** — strict TypeScript, minimalne `any` (1 uzasadnione), type narrowing w osobnych modułach.
3. **i18n** — PL jako SSOT, EN typowany, struktura kluczy identyczna.
4. **Serwisy** — static class pattern, fasada DictionaryService, delegacja do sub-modułów.
5. **Dialogi** — tylko `useAppDialog()`, brak `window.alert`/`confirm`.
6. **Proxy** — JWT + role, tenant-aware, deny-by-default dla admin API.
7. **Migracje** — schema.ts ↔ verify_schema_alignment.ts zgodne, CHECK constraint na priorytecie.
8. **Brak `console.log`** w kodzie produkcyjnym — tylko skrypty CLI.

### ⚠️ Drobne uwagi

1. **Pusty katalog** `src/app/api/settings/` do usunięcia.
2. **Deprecated re-export** `narrowApiListRows.ts` — do monitorowania przy okazji refactoringu.
3. **Deprecated metoda** `AdminOrderService.checkScheduleConflict()` — do usunięcia po migracji wszystkich call-site'ów.

### Ogólna ocena

Kod jest **bardzo spójny** — architektura, typowanie, wzorce serwisów, i18n i UI są utrzymane w ryzach. Nie znaleziono naruszeń twardych reguł z AGENTS.md. Projekt utrzymuje wysoki standard inżynierii oprogramowania.

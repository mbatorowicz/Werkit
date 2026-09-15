# Werkit — przewodnik dla agentów AI i deweloperów

Ten dokument jest **operacyjnym SSOT** (single source of truth) dla każdego, kto modyfikuje kod Werkit — w tym agentów AI. Ma pierwszeństwo przed „domysłami z sieci”: najpierw tu sprawdzasz fakty o repo, potem dopisujesz kod.

**Towarzyszy mu:**

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — warstwy, przepływ żądania, wzorce (bez duplikowania długiej listy API).
- [`docs/SYSTEM_MAP.md`](./docs/SYSTEM_MAP.md) — **inwentaryzacja**: tabele DB, endpointy ↔ serwisy, hooki, `i18n`, pułapki. **Czytaj zanim ruszysz większą zmianę.**
- [`docs/TECH_DEBT_ROADMAP.md`](./docs/TECH_DEBT_ROADMAP.md) — **plan redukcji długu technicznego** (fazy, ryzyko); nie rozdmuchuj SYSTEM_MAP o osobne checklisty długu — tam krótki odsyłacz. Program alignmentu domeny: [`plans/architecture-alignment-2026-09.md`](./plans/architecture-alignment-2026-09.md) (fazy 0–7 zamknięte).

---

## 1. Produkt i stawka błędu

Werkit to **dyspozycja terenowa (field-ops)** z warstwą **MRO** (PWA + Capacitor): **ludzie + zasoby + dwa magazyny + GPS w sesji transportu**. Błąd w sesji pracy, zleceniu lub GPS może realnie zatrzymać lub zmąc wybrane procesy w terenie. Zanim zmienisz API odpowiedzi, typ tablicy → obiekt, lub pole bazy — **przejrzyj call-site’y i serwisy**.

**Kontrakt (faza 0, 2026-09 — nie łam przy „dociągnięciu architektury”):**

| Zostaje | Nie mieszaj / nie dokładaj w tym programie |
|---------|--------------------------------------------|
| 1 materiał na zlecenie `machine_work` (ładunek) | Scalanie tabel `materials` i `spare_parts` |
| N części na zlecenie `machine_repair` (BOM) | Plany PM, motogodziny jako dane, zgłoszenie awarii poza dyspozycją |
| GPS tylko przy aktywnej, niestacjonarnej sesji (`gps_logs` → `work_sessions`) | Tracker pojazdu / zasobu 24/7 bez sesji |

Pełny program faz 1–7: [`plans/architecture-alignment-2026-09.md`](./plans/architecture-alignment-2026-09.md). Warstwy i uzasadnienie: [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1a.

---

## 1a. Agenci AI — autonomia (bez przerzucania pracy na człowieka)

1. **Zrób sam**, co da się zrobić w tym workspace: migracje na bazę podłączoną przez **`.env.local`** (`DATABASE_URL` / `POSTGRES_URL` — **nigdy nie loguj ani nie commituj** wartości, nie cytuj connection stringów w odpowiedziach).
2. Po zmianie **`src/db/schema.ts`** lub nowego wpisu w **`drizzle/meta/_journal.json`** + pliku **`drizzle/*.sql`**: na docelowej bazie uruchom **`npm run db:migrate:pg`** (journal Drizzle przez TCP; patrz SYSTEM_MAP §15), a dla skryptów idempotentnych poza journal **`npm run db:napraw-wszystko`** (albo właściwy **`npm run db:napraw-*`**) oraz lokalnie **`npm run db:verify-schema`** (`verify_schema_alignment.ts` ↔ `schema.ts`).
3. **Nie kończ** zdania w stylu „musisz uruchomić migrację” — jeśli środowisko ma połączenie do bazy, **wykonaj migrację/weryfikację w ramach sesji**.
4. Szczegółowa mapa tabel i migracji: **`docs/SYSTEM_MAP.md`** §3; porównanie kanoniczne jest utrzymywane **równolegle** w skrypcie `db:verify-schema` (przy rozszerzeniu schematu **zaktualizuj oba**: `schema.ts` + `verify_schema_alignment.ts`).
5. **GitHub:** domyślny model pracy — **agent** kończy zlecenie przez **`git commit` + `git push`** na bieżącą gałąź (zwykle `main`), o ile użytkownik nie poprosi o wyłączenie pusha / sam staging. **Nie commituj** sekretów (np. `.env.local`). Szczegóły: [`.cursor/rules/werkit-git-workflow.mdc`](./.cursor/rules/werkit-git-workflow.mdc).
6. **Logi urządzenia (`device_logs`):** do podglądu z bazy bez panelu admina uruchom **`npm run logs:device`** (opcje: `--limit`, `--minutes`, `--level`, `--user`, `--category`, `--full`, `--json`, `--help`). Wymaga działającego `DATABASE_URL` / `POSTGRES_URL` w `.env.local`.

---

## 2. Stack (fakty z repo)

| Obszar | Technologia / konwencja |
|--------|---------------------------|
| Framework | **Next.js 16** (App Router). Preferuj **Server Components**; `"use client"` tylko przy stanie, efektach, listenerach. |
| Auth | **JWT w cookie** (`auth_token`), weryfikacja **`jose`** — nie używamy NextAuth w tym projekcie. |
| Baza | **Vercel Postgres** + **Drizzle ORM**. SSOT schematu: [`src/db/schema.ts`](./src/db/schema.ts). Migracje SQL: katalog [`drizzle/`](./drizzle/). |
| Mobilka | **Capacitor** + PWA; tło i zgaszony ekran = throttle JS i GPS — patrz sekcja 8. |
| UI | **Tailwind CSS**. Paleta bazowa: **zinc** + akcent **emerald**; spójne animacje (CSS / utility), bez „losowych” palet. |
| ESLint | Flat config (`eslint.config.mjs`): `eslint-config-next` + `@typescript-eslint/no-explicit-any: error` + `varsIgnorePattern: "^_"` dla `no-unused-vars`. `no-console: warn` (dozwolone `warn`/`error`), wyłączone w `src/scripts/`. |
| Typy | **Strict TypeScript**, zakaz luźnego **`any`**. Typy domenowe: [`src/types/worker.ts`](./src/types/worker.ts), [`src/types/admin.ts`](./src/types/admin.ts), [`src/types/wizard.ts`](./src/types/wizard.ts). |
| Wersja aplikacji | Z [`package.json`](./package.json) (`version` — jedyna akceptowana wartość w tekście docs). |

---

## 3. Mapa katalogów (gdzie co żyje)

```
src/
├── app/                    # Trasy Next: page.tsx, layout.tsx, cienkie wrappery; **bez** logiki UI > ~300 linii
│   ├── api/                # Route Handlery (75 endpointów)
│   │   ├── admin/          #   API panelu admina (work-orders, users, sessions, settings, …)
│   │   ├── worker/         #   API aplikacji pracownika (session, gps, logs, work-orders, …)
│   │   ├── platform/       #   API superadmin (companies, analytics)
│   │   ├── auth/           #   Login / logout
│   │   └── …               #   API współdzielone (categories, customers, machines, materials, …)
│   ├── admin/              # import *Client z features/admin lub lokalnie (docelowo tylko features)
│   ├── platform/           # superadmin (multi-tenant)
│   └── worker/             # routing; WorkerClient importuje z features/worker
├── features/worker/        # Moduł aplikacji pracownika
│   ├── components/         # wizard/, profile/, shell/ (dashboard sesji), Modals, …
│   ├── gps/
│   ├── hooks/              # useWorkerActions, useWorkerGPS, useWorkerNotifications, useWorkerAlarmSound, …
│   └── lib/                # alarmy, dźwięki (workerNotificationPrefs, workerAlarmSoundPlayer), prezentacja zleceń
├── features/admin/         # Panele i formularze admina (machines, materials, categories, orders)
├── components/             # UI współdzielony (Admin shell, work-orders, customers, Map, …)
├── hooks/                  # generyczne hooki UI (floating panel, dismiss outside) — używane przez comboboxy
├── services/               # Drizzle + logika domenowa (SSOT zapytań DB)
│   ├── dictionary/         # Sub-moduł słowników (CategoryService, MaterialService, CustomerService, …)
│   ├── warehouse/          # Jądro magazynu (ilość, upsert, PZ/WZ) + adaptery materials / spare_parts
│   └── dur/                # Sub-moduł DUR (SparePartService, WorkOrderSparePartService, InventoryService, StockMovementService, …)
├── db/
├── types/
├── i18n/
├── lib/
│   └── narrow/             # Type narrowing — bezpieczne parsowanie odpowiedzi API (shared.ts, base.ts, admin.ts, worker.ts, machines.ts, dur.ts)
├── scripts/                # migracje tsx, verify_schema, generate_notification_sounds
└── proxy.ts                # JWT + role (admin, worker, platform/superadmin)
```

**Gdzie nowy kod:** `app/**` = routing; logika worker → `features/worker/`; logika admin → `features/admin/` + `components/Admin/`; współdzielone zlecenia → `components/work-orders/`. Multi-tenant i `/platform` → [`docs/SYSTEM_MAP.md`](./docs/SYSTEM_MAP.md). Moduł DUR (części zamienne) → `services/dur/`. **Reguła stanu magazynu** (materiały i części) → `services/warehouse/`; serwisy SKU zostają w `services/materials/` i `services/dur/`.

---

## 4. Twarde zasady (checklista przed merge)

1. **Tablice z API** — zanim wywołasz `.map()` / `.filter()` na odpowiedzi `fetch`, sprawdź **`Array.isArray(data)`** (albo bezpieczny fallback `[]`). Błąd 500 może zwrócić obiekt → crash na mobilce.
2. **`any`** — nie dodawaj. Nieznane JSON → zwężanie przez **type guards** / jawne typy / walidację.
3. **Priorytet zlecenia** — wartości domenowe: `URGENT` \| `HIGH` \| `NORMAL` \| `LOW`. W bazie egzekwuje to migracja **CHECK** `work_orders_priority_chk` (patrz `drizzle/`). Po stronie klienta walidacja przez **`narrowPriority`** z [`src/lib/narrow/shared.ts`](./src/lib/narrow/shared.ts).
3a. **Hierarchia kategorii** (`resource_categories` / `material_categories`): `parent_id`, `is_group`, `sort_order`. Grupy — tylko organizacja w adminie; liście — zlecenia, wizard, przypisania. API: `GET /api/categories?leavesOnly=1` (materiały analogicznie). UI admin: `src/features/admin/categories/`, `src/lib/categoryTree.ts`, i18n `admin.categories`.
3b. **Nazewnictwo w UI (i18n):** **typ** = tylko typ zasobu (`resource_groups`); **kategoria** = zlecenie / materiał / część DUR; **rodzaj zlecenia** = `orderType` (praca vs naprawa). Nie mieszaj „typ zlecenia” z kategorią — patrz [`docs/SYSTEM_MAP.md`](./docs/SYSTEM_MAP.md) §13.1.
3c. **Dwa magazyny i GPS (kontrakt produktu):** `materials` ≠ `spare_parts` (dwa SKU). Zlecenie pracy = 1 materiał; naprawa = N części. GPS = ślad **sesji**, nie floty. Nie dodawaj PM / liczników / trackera 24/7 w PR-ach alignmentu — patrz §1 i [`plans/architecture-alignment-2026-09.md`](./plans/architecture-alignment-2026-09.md).
4. **Nowy kod DB** — **wyłącznie `src/services/`** (Drizzle); **`src/app/`** nie importuje `@/db` / `@/db/schema`. Szczegóły: **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**.
5. **Teksty UI** — stringi widoczne dla użytkownika przez **`getDictionary()`** / sloty `worker.client`, `admin.*`, `apiErrors`. Placeholdery `{klucz}` przez **`formatDict`**. Domyślny locale formatów dat: **`DEFAULT_UI_LOCALE`** (`src/i18n/constants.ts`), dopóki nie ma wyboru języka użytkownika.
6. **Proxy (Edge)** — strażnik tras to **`src/proxy.ts`** z eksportem **`proxy`** (Next.js 16; dawniej `middleware.ts`). Ta sama rola: JWT, role, matcher — bez zmian logiki nie psuj ochrony `/admin`, `/worker`, `/api`.
7. **Type narrowing** — odpowiedzi API (zwłaszcza listy) parsuj przez funkcje `narrow*` z [`src/lib/narrow/`](./src/lib/narrow/) (np. `narrowWorkOrders`, `narrowAdminUserRows`, `narrowBaseCustomers`). Nie ufaj surowym `unknown[]` — narrow functions zwracają bezpieczną, przefiltrowaną tablicę nawet gdy API zwróci obiekt (błąd 500).

---

## 5. Warstwa serwisów (`src/services/`)

Serwisy to docelowe miejsce na **`db.select` / `insert` / `update`** i mapowanie na typy domenowe.

Przykłady klas (pełna lista w [`docs/SYSTEM_MAP.md`](./docs/SYSTEM_MAP.md)):
`WorkerOrderService`, `WorkerSessionService`, `AdminOrderService`, `AdminSessionService`, `AdminUserService`, `AuthPrincipalService`, `LoginRateLimitService`, `DeviceLogRateLimitService`, `AdminReportService`, `DictionaryService`, `SystemLogService`, `GpsService`, `ScheduleConflictService`, `CustomerLocationService`, `PlatformCompanyService`, `PlatformTenantUserService`, `PlatformAuditService`, `PlatformAnalyticsService`, `PlatformFeatureFlagService`, `WorkOrderSparePartService`, `InventoryService`, `StockMovementService`, jądro `services/warehouse/`.

**Zasada:** Admin i Worker korzystają z **tych samych reguł biznesowych** tam, gdzie to możliwe (np. lista / akceptacja zleceń przez serwis worker).

---

## 6. UI — podział odpowiedzialności

| Co dodajesz | Gdzie |
|---|---|
| Trasa URL (`page.tsx`, `layout.tsx`) | `src/app/**` — **cienki** import komponentu feature |
| Ekran / orkiestracja admina (`*Client.tsx`, panele CRUD) | `src/features/admin/{moduł}/` |
| Ekran / orkiestracja workera | `src/features/worker/` (`components/shell/` = dashboard sesji) |
| Shell admina (sidebar, modale wspólne, combobox) | `src/components/Admin/` |
| Prezentacja zlecenia worker ↔ admin | `src/components/work-orders/` |
| Kanoniczne ścieżki admin UI + admin API | `src/lib/appRoutes.ts` (`adminRoutes`, `adminApi`, `adminDispatchOpenUrl`) |
| Panel superadmin (multi-tenant) | `src/app/platform/` + `src/components/Platform/` + `src/services/Platform*.ts` |

- **`src/features/worker/`** — ekrany i logika stanu **tylko modułu pracownika**.
- **`src/components/work-orders/`** — prezentacja **zlecenia** współdzielona z panelem **admin** (spójne badge priorytetu itd.).
- **SRP** — pliki Client Components **> ~300 linii** dziel na podkomponenty w tym samym obszarze funkcji (feature lub folder komponentu).

Design: **zinc / emerald**, motion lekkie (CSS), bez blokowania głównego wątku ciężkimi pętlami w renderze.

### Design tokens (SSOT stylów)

| Plik | Zakres |
|------|--------|
| [`src/lib/uiTokens.ts`](./src/lib/uiTokens.ts) | Powierzchnie mint, karty, `INPUT_BASE` / `SELECT_BASE` / `TEXTAREA_BASE` |
| [`src/lib/uiButtons.ts`](./src/lib/uiButtons.ts) + [`UiButton`](./src/components/UiButton.tsx) | Primary / secondary / danger / CTA — emerald, nie indigo |
| [`src/lib/uiChrome.ts`](./src/lib/uiChrome.ts) | Modal, overlay, nav, chipy, alerty, wordmark chrome |
| [`src/lib/uiTypography.ts`](./src/lib/uiTypography.ts) | Tytuły, etykiety pól, wordmark |
| [`src/lib/uiStatus.ts`](./src/lib/uiStatus.ts) | Status zlecenia (planned/active/done), poziomy logów, GPS dots |
| [`src/lib/uiTable.ts`](./src/lib/uiTable.ts) | Wrapper, nagłówek i komórki tabel |
| [`src/lib/uiRadius.ts`](./src/lib/uiRadius.ts) | Zaokrąglenia kart i kontrolek |
| [`src/lib/cn.ts`](./src/lib/cn.ts) | `cn()` — łączenie klas Tailwind |
| [`src/components/searchFieldStyles.ts`](./src/components/searchFieldStyles.ts) | Pola wyszukiwania/combobox |
| [`src/components/datetimeFieldStyles.ts`](./src/components/datetimeFieldStyles.ts) | Pola daty (admin = worker) |

**Zasady:** nie dodawaj ad-hoc kolorów akcentu (indigo) — używaj `uiButtons` / `uiTokens`. Worker i admin mają **ten sam** mint surface. Teksty UI przez **`common.*`** w i18n + `LocaleSwitcher` w shellach; SSR: `getServerLocale()` + `getDictionary(locale)`; client: `useDictionary()`.


### Modale formularzy i komunikaty (SSOT — admin + worker)

| Komponent | Rola |
|-----------|------|
| [`AdminModalShell`](./src/components/Admin/AdminModalShell.tsx) | Obudowa modali edycji: `scrollableBody`, `footer`, `closeOnBackdropClick={false}` domyślnie, opcjonalny `zIndexClass`. |
| [`FormModalFooter`](./src/components/FormModalFooter.tsx) | Stopka Anuluj + Zapisz (lub `FormModalFooterActions`) — jeden wzorzec przycisków w formularzach. |
| [`AppDialogProvider`](./src/components/AppDialogProvider.tsx) | Globalne **`alert`** / **`confirm`** (Promise API) — podpięty w root [`src/app/layout.tsx`](./src/app/layout.tsx). **Zakaz** `window.alert` / `window.confirm`. |
| [`AdminPasswordConfirmModal`](./src/components/Admin/AdminPasswordConfirmModal.tsx) | Potwierdzenie hasłem przy trwałym usuwaniu zakończonej sesji z ewidencji. |

**Wzorzec w Client Component / hooku:**

```ts
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";

const { alert: appAlert, confirm: appConfirm } = useAppDialog();
await appAlert({ message: appDialogApiMessage(apiErrors, code, fallback) });
if (!(await appConfirm({ message: dict.deleteConfirm, variant: "danger" }))) return;
```

Tytuły i etykiety przycisków dialogów: `admin.ui.dialogAlertTitle`, `dialogConfirmTitle`, `dialogOk`, `dialogConfirm` (i18n). Usunięcie archiwum sesji: `DELETE /api/admin/work-sessions/[id]` z ciałem `{ password }` — weryfikacja `AdminUserService.verifyPasswordForUserId` (kody: `admin_password_required`, `invalid_credentials`).

---

## 7. Mobilność, GPS, tło

- **`setInterval` / `setTimeout`** na frontcie **nie są niezawodne** przy zablokowanym ekranie.
- Bufforowanie GPS / wysyłka na backend: **fetch od razu**, **`keepalive: true`** tam, gdzie już przyjęto ten wzorzec — nie polegaj na „kolejce co N sekund” w JS w tle.
- **Hardware back (Android):** **`CapacitorBackButton`** w root `app/layout.tsx` — własny stos ścieżek: stos > 1 → `history.back()`, inaczej `App.minimizeApp()` (pierwszy ekran); nie rozrzucaj własnych listenerów `backButton`.

### Sync wersji web ↔ APK

- **Wersja panelu (web):** `WEB_PACKAGE_VERSION` / `APP_VERSION` z [`src/lib/version.ts`](./src/lib/version.ts) (= `package.json` + opcjonalny hash deployu Vercel).
- **Wersja APK:** metadane z GitHub Release `android-latest` — asset **`werkit-apk-meta.json`** (generowany w [`.github/workflows/android-build.yml`](./.github/workflows/android-build.yml)); SSOT typu: [`src/lib/apkMeta.ts`](./src/lib/apkMeta.ts).
- **Google Play:** AAB z CI + klucz uploadu (GitHub Secrets). Procedura: [`docs/GOOGLE_PLAY.md`](./docs/GOOGLE_PLAY.md).
- **UI:** [`AppDownloadCard`](./src/components/Admin/AppDownloadCard.tsx) na `/admin/settings` — pokazuje wersję web i APK, badge **debug**, ostrzeżenie gdy `inSync === false`.
- **Pobieranie:** `GET /api/app/android`; metadane: `GET /api/app/android/info` — logika w [`src/lib/androidAppDownload.ts`](./src/lib/androidAppDownload.ts) (źródła: `WERKIT_ANDROID_APK_URL` → `public/downloads/werkit.apk` + opcjonalny meta → GitHub release).
- **CI Android** uruchamia się przy pushu do `main` gdy zmienią się `android/**`, `capacitor.config.ts`, `package.json`, `src/features/worker/gps/**`, `src/lib/biometricLogin.ts` lub sam workflow. Po innych zmianach mostka natywnego — **ręcznie** `workflow_dispatch`. GitHub Release `android-latest` publikuje **release** APK (nie debug).
- **Dźwięki alarmów:** pliki WAV w `public/sounds/` i `android/app/src/main/res/raw/` — regeneracja: **`npm run sounds:generate`** (`src/scripts/generate_notification_sounds.ts`).

---

## 8. Logowanie zdalne

Krytyczne zdarzenia po stronie worker/PWA: **`sendRemoteLog`** → **`/api/worker/logs`** → tabela **`device_logs`**, przegląd w **`/admin/logs`**.

---

## 9. Migracje i produkcja

- Zmiana **`schema.ts`** wymaga **skryptu migracji** w `drizzle/` + aktualizacji **`drizzle/meta/_journal.json`** (jeśli dodajesz ręcznie) albo wygenerowania przez **`drizzle-kit`** zgodnie z workflow zespołu.
- Po zmianie schematu agent uruchamia **`npm run db:napraw-*`** / **`db:napraw-wszystko`** na bazie z `.env.local` oraz **`npm run db:verify-schema`** (patrz §1a).
- **Wdrożenie na Vercel:** migracja musi zostać **uruchomiona na bazie produkcyjnej** zgodnie z procedurą firmy (jedna pusta migracja lub duplikat constraintta na DB = błąd operacyjny — sprawdzaj idempotentność).

---

## 10. Workflow zmian (produktywny minimalizm)

1. **Zrozum kontekst** — typy, serwis, istniejący kontrakt API i mobilki.
2. **Minimalny diff** — nie refaktoryzuj „przy okazji” całych modułów bez prośby.
3. **Bez debug `console.log`** w kodzie produkcyjnym (wyjątek: krótkotrwały debug za zgodą).
4. Pełna refaktoryzacja na żądanie: **SOLID, DRY**, ale nadal zgodnie z architekturą modułów.

---

## 11. Kiedy czytać ARCHITECTURE.md i roadmap długu

Przed większymi zmianami w: **API admin/worker**, **sesjach**, **zleceniach**, **mapie**, **schemacie DB**, **`proxy.ts`** — **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** (diagram, lista serwisów, „app bez Drizzle”). Planowany refactoring architektury lub usuwanie legacy — **[`docs/TECH_DEBT_ROADMAP.md`](./docs/TECH_DEBT_ROADMAP.md)**. Dociągnięcie domeny (GPS, dwa magazyny, typ floty) — **[`plans/architecture-alignment-2026-09.md`](./plans/architecture-alignment-2026-09.md)** (fazy 0–7 zamknięte). Hartowanie sesji JWT, logowania i limitów — **[`plans/security-hardening-2026-09.md`](./plans/security-hardening-2026-09.md)** (fazy S0–S4 zamknięte). Izolacja między firmami (IDOR organizacji) — **[`plans/tenant-isolation-2026-09.md`](./plans/tenant-isolation-2026-09.md)** (fazy T0–T3 zamknięte; RLS poza programem).

---

*Ostatnia zsynchronizowana z codebase struktura: kontrakt produktu §1 (field-ops + MRO, fazy 0–7 alignmentu 2026-09), żywy principal `AuthPrincipalService` + `livePrincipal.ts` (P-SEC-0), logowanie S1 (`passwordPolicy`, `LoginRateLimitService`, `login_attempts`), limity nadużyć S2 (GPS 200/bbox, foto 4 MiB + MIME, throttle `device_logs`, notatki 4000), obrona w głąb S3 (geocode auth+limit, last-admin, `authCookie`, CSP), CSRF Origin + magazyn materiałów poza shared + `platform_resume` 30 min (P-SEC-4), moduł `features/worker`, `components/work-orders`, i18n `locales/` (pl/en/de), `proxy.ts`, constraint priorytetu zleceń, **`npm run db:verify-schema`**, spójne modale (`AdminModalShell`, `AppDialogProvider`), roadmap długu w **`docs/TECH_DEBT_ROADMAP.md`**, ESLint flat config z `varsIgnorePattern: "^_"`, OSRM turn-by-turn navigation w `components/Map/`, niezależne flagi GPS (`isGpsModuleEnabled` = śledzenie, nie AND pięciu), jądro magazynu `services/warehouse/` (dwa adaptery SKU, bez scalania tabel), polityka kategorii `lib/categoryPolicy.ts` (`gpsPolicy` / `orderKind` / `fieldVisibility`), moduł DUR — `services/dur/`, `components/Admin/Modals/WorkOrderSparePartsSection.tsx`, `features/worker/components/WorkerSparePartsPanel.tsx`, izolacja tenantów T0–T3 (`plans/tenant-isolation-2026-09.md`), control plane `/platform` PL0–PL3 (`PlatformTenantUserService`, `PlatformAuditService` + UI `/platform/audit`, impersonacja `/admin` przez `platform_resume` — superadmin bez stałego `company_id`; `lifecycle_status` + presety pakietu GPS/DUR; zdrowie tenanta w overview), publikacja Google Play (`docs/GOOGLE_PLAY.md`, AAB + klucz uploadu). Jeśli coś tu przestaje pasować do kodu — **aktualizuj ten plik w tym samym PR** co zmianę struktury.*

---

## Cursor Cloud specific instructions

### Środowisko i serwisy

- **Jedyny serwis:** monolityczna aplikacja Next.js 16 (`npm run dev` → `http://localhost:3000`).
- **Jedyna zależność zewnętrzna:** PostgreSQL (connection string w `.env.local` jako `DATABASE_URL` lub `POSTGRES_URL`). Bez bazy: dev server startuje, ale strony wymagające danych zwracają błędy runtime.
- **JWT_SECRET:** wymagany w `.env.local` — bez niego auth middleware nie działa. W Cloud VM generuj losowy: `openssl rand -base64 32`.
- **WERKIT_USE_BCRYPTJS=1** w `.env.local` — wymusza pure-JS bcrypt (brak problemów z natywnym `bcrypt` na niestandardowych środowiskach).

### Komendy CI (odwzorowują pipeline GitHub Actions)

| Krok | Komenda | Uwagi |
|------|---------|-------|
| Lint | `npm run lint` | 0 errors wymagane, warnings OK |
| TypeScript | `npx tsc --noEmit` | strict mode, musi przejść bez błędów |
| Testy | `npm test` | Vitest (unit + UI), nie wymaga bazy danych |
| Testy integracyjne | `npm run test:integration` | Vitest na żywej bazie z `.env.local`; poza CI |
| Build | `npm run build` | wymaga `JWT_SECRET` w env |
| Dev server | `npm run dev` | Turbopack, start < 1s |

### Gotchas

- Dev server Next.js 16 używa Turbopack — pierwszy request po starcie kompiluje trasę (może trwać 1–2s).
- Brak `.env.local` z `JWT_SECRET` powoduje crash proxy (Edge middleware) przy każdym route — upewnij się, że plik istnieje.
- Testy Vitest (`npm test`) nie potrzebują bazy ani żadnych sekretów — można je uruchomić zawsze.
- Testy integracyjne (`npm run test:integration`, pliki `*.int.test.ts`) wymagają `DATABASE_URL` / `POSTGRES_URL` w `.env.local`; tworzą i usuwają firmy z prefiksem `__ITEST`.
- Natywny moduł `bcrypt` może nie skompilować się w niestandardowych kontenerach — `WERKIT_USE_BCRYPTJS=1` to bezpieczny fallback.

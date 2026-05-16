# Werkit — przewodnik dla agentów AI i deweloperów

Ten dokument jest **operacyjnym SSOT** (single source of truth) dla każdego, kto modyfikuje kod Werkit — w tym agentów AI. Ma pierwszeństwo przed „domysłami z sieci”: najpierw tu sprawdzasz fakty o repo, potem dopisujesz kod.

**Towarzyszy mu:**

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — warstwy, przepływ żądania, wzorce (bez duplikowania długiej listy API).
- [`docs/SYSTEM_MAP.md`](./docs/SYSTEM_MAP.md) — **inwentaryzacja**: tabele DB, endpointy ↔ serwisy, hooki, `i18n`, pułapki. **Czytaj zanim ruszysz większą zmianę.**
- [`docs/TECH_DEBT_ROADMAP.md`](./docs/TECH_DEBT_ROADMAP.md) — **plan redukcji długu technicznego** (fazy, ryzyko); nie rozdmuchuj SYSTEM_MAP o osobne checklisty długu — tam krótki odsyłacz.

---

## 1. Produkt i stawka błędu

Werkit to **system logistyczny dla floty** (PWA + Capacitor). Błąd w sesji pracy, zleceniu lub GPS może realnie zatrzymać lub zmąc wybrane procesy w terenie. Zanim zmienisz API odpowiedzi, typ tablicy → obiekt, lub pole bazy — **przejrzyj call-site’y i serwisy**.

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
| Typy | **Strict TypeScript**, zakaz luźnego **`any`**. Typy domenowe: [`src/types/worker.ts`](./src/types/worker.ts), [`src/types/admin.ts`](./src/types/admin.ts), [`src/types/wizard.ts`](./src/types/wizard.ts). |
| Wersja aplikacji | Z [`package.json`](./package.json) (`version` — jedyna akceptowana wartość w tekście docs). |

---

## 3. Mapa katalogów (gdzie co żyje)

```
src/
├── app/                    # Trasy Next (pages, layouts), Route Handlers api/**/route.ts
├── features/worker/        # Moduł aplikacji pracownika (komponenty, hooki, lib prezentacji zleceń)
│   ├── components/         # m.in. WizardClient, PendingOrdersList, ActiveSessionDashboard, Modals
│   ├── gps/                # stałe + singleton BackgroundGeolocation + mapowanie odczytu natywnego
│   ├── hooks/              # useWorkerActions, useWorkerGPS, useWorkerNotifications, useWorkerSessionSync
│   └── lib/                # workOrderPresentation, workOrderPriority, workerSessionTimeline
├── components/
│   ├── work-orders/        # UI **współdzielony** worker ↔ admin (WorkOrderPriorityRibbon, WorkOrderSummaryLines)
│   ├── Admin/, Map/, GanttChart/, …
├── services/               # Warstwa domenowa + Drizzle — preferowane miejsce na zapytania DB
├── db/                     # Klient DB + schema Drizzle
├── types/                  # Kontrakty TS dla worker / admin / wizard
├── i18n/                   # locales/pl.ts, locales/en.ts, types.ts, format.ts, constants.ts (DEFAULT_UI_LOCALE)
├── lib/                    # auth, gpsManager, remoteLogger, helpers bez UI
└── proxy.ts                # Strażnik JWT i ról na Edge (konwencja Next.js 16 „proxy”)
```

Routing worker nadal w **`src/app/worker/**`** — komponenty biznesowe są **importowane** z `@/features/worker/...`.

---

## 4. Twarde zasady (checklista przed merge)

1. **Tablice z API** — zanim wywołasz `.map()` / `.filter()` na odpowiedzi `fetch`, sprawdź **`Array.isArray(data)`** (albo bezpieczny fallback `[]`). Błąd 500 może zwrócić obiekt → crash na mobilce.
2. **`any`** — nie dodawaj. Nieznane JSON → zwężanie przez **type guards** / jawne typy / walidację.
3. **Priorytet zlecenia** — wartości domenowe: `URGENT` \| `HIGH` \| `NORMAL` \| `LOW`. Normalizacja po stronie serwera tam, gdzie już jest (`normalizeWorkOrderPriority`). W bazie egzekwuje to migracja **CHECK** `work_orders_priority_chk` (patrz `drizzle/`).
3a. **Hierarchia kategorii** (`resource_categories` / `material_categories`): `parent_id`, `is_group`, `sort_order`. Grupy — tylko organizacja w adminie; liście — zlecenia, wizard, przypisania. API: `GET /api/categories?leavesOnly=1` (materiały analogicznie). Drzewo: `src/lib/categoryTree.ts`, `CategoryTreePanel`.
4. **Nowy kod DB** — **wyłącznie `src/services/`** (Drizzle); **`src/app/`** nie importuje `@/db` / `@/db/schema`. Szczegóły: **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**.
5. **Teksty UI** — stringi widoczne dla użytkownika przez **`getDictionary()`** / sloty `worker.client`, `admin.*`, `apiErrors`. Placeholdery `{klucz}` przez **`formatDict`**. Domyślny locale formatów dat: **`DEFAULT_UI_LOCALE`** (`src/i18n/constants.ts`), dopóki nie ma wyboru języka użytkownika.
6. **Proxy (Edge)** — strażnik tras to **`src/proxy.ts`** z eksportem **`proxy`** (Next.js 16; dawniej `middleware.ts`). Ta sama rola: JWT, role, matcher — bez zmian logiki nie psuj ochrony `/admin`, `/worker`, `/api`.

---

## 5. Warstwa serwisów (`src/services/`)

Serwisy to docelowe miejsce na **`db.select` / `insert` / `update`** i mapowanie na typy domenowe.

Przykłady klas (aktualna lista w repo):  
`WorkerOrderService`, `WorkerSessionService`, `AdminOrderService`, `AdminSessionService`, `AdminUserService`, `AdminReportService`, `DictionaryService`, `SystemLogService`, `GpsService`.

**Zasada:** Admin i Worker korzystają z **tych samych reguł biznesowych** tam, gdzie to możliwe (np. lista / akceptacja zleceń przez serwis worker).

---

## 6. UI — podział odpowiedzialności

- **`src/features/worker/`** — ekrany i logika stanu **tylko modułu pracownika**.
- **`src/components/work-orders/`** — prezentacja **zlecenia** współdzielona z panelem **admin** (spójne badge priorytetu itd.).
- **SRP** — pliki Client Components **> ~300 linii** dziel na podkomponenty w tym samym obszarze funkcji (feature lub folder komponentu).

Design: **zinc / emerald**, motion lekkie (CSS), bez blokowania głównego wątku ciężkimi pętlami w renderze.

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
- **Hardware back (Android):** **`CapacitorBackButton`** w root `app/layout.tsx` — `history.length > 1` → `router.back()`, inaczej `App.minimizeApp()` (pierwszy ekran); nie rozrzucaj własnych listenerów `backButton`.

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

Przed większymi zmianami w: **API admin/worker**, **sesjach**, **zleceniach**, **mapie**, **schemacie DB**, **`proxy.ts`** — **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** (diagram, lista serwisów, „app bez Drizzle”). Planowany refactoring architektury lub usuwanie legacy — **[`docs/TECH_DEBT_ROADMAP.md`](./docs/TECH_DEBT_ROADMAP.md)**.

---

*Ostatnia zsynchronizowana z codebase struktura: moduł `features/worker`, `components/work-orders`, i18n `locales/`, `proxy.ts`, constraint priorytetu zleceń, **`npm run db:verify-schema`**, spójne modale (`AdminModalShell`, `AppDialogProvider`), roadmap długu w **`docs/TECH_DEBT_ROADMAP.md`**. Jeśli coś tu przestaje pasować do kodu — **aktualizuj ten plik w tym samym PR** co zmianę struktury.*

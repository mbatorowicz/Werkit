# Architektura Werkit — przegląd techniczny

Dokument opisuje **aktualny kształt** aplikacji (stan około **v1.9.x**, Next **16**, modularny worker pod `features/worker`) oraz zasady warstwy serwisów.

**Powiązane dokumenty:**

- **[`AGENTS.md`](./AGENTS.md)** — skrót operacyjny i zasady codziennej pracy.
- **[`docs/SYSTEM_MAP.md`](./docs/SYSTEM_MAP.md)** — pełna inwentaryzacja: wszystkie tabele DB, endpointy API, serwisy z metodami, hooki, sloty i18n, pułapki i dług techniczny. **Otwórz przed większą zmianą** — szybciej znajdziesz odpowiedź niż grepem.

---

## 1. Cel dokumentu

| Dla kogo | Co znajdzie |
|----------|-------------|
| Deweloper / agent AI | Gdzie w codebase mieszka która warstwa, jakie są kontrakty typów i jak **nie** psuć mobilki ani DB |
| Refactoring | **`src/app/`** nie importuje `@/db` ani `@/db/schema`; zapytania Drizzle mieszkają w **`src/services/`** — nowy kod trzymaj w tej konwencji |

Architektura **warstwowa z serwisami** (od **v1.6.6**, utrwalona m.in. w **v1.9**) jest **obowiązującym** wzorcem dla tras API i danych ładowanych w Server Components.

---

## 2. Przepływ żądania (uproszczony)

```
[Klient: przeglądarka / WebView Capacitor]
        │
        ▼
[src/middleware.ts] — JWT (jose), rola admin/worker, segmentacja tras API
        │
        ├──► Route Handler src/app/api/.../route.ts → src/services/* → db (Drizzle)
        │
        └──► Server Component page.tsx → JSX (dane z serwisów lub props z rodzica)
                   │
                   └── Client Component ("use client") — stan UI, fetch do API
```

**Worker UI:** komponenty głównie z **`src/features/worker/components/`**, hooki z **`src/features/worker/hooks/`**.

**Współdzielenie worker ↔ admin (prezentacja zlecenia):** **`src/components/work-orders/`** (`WorkOrderPriorityRibbon`, `WorkOrderSummaryLines`).

---

## 3. Typy domenowe (`src/types/`)

| Plik | Zakres |
|------|--------|
| `worker.ts` | `Session`, `WorkOrder`, `WorkOrderPriority`, `InitialWorkerData`, `TimelineItem`, GPS/settings |
| `admin.ts` | Formularze, listy bazowe (`BaseWorker`, …), `UnifiedGanttItem`, stan zamówień w panelu |
| `wizard.ts` | Dane pomocnicze API kreatora własnego zlecenia (kategorie, maszyny, materiały, klienci) |

**Zasady:**

- Komponent importuje **`WorkOrder`**, **`Session`** itd. stąd — nie duplikuje 15-powej struktury inline w propsach.
- Po zmianie kolumny w DB: **`schema.ts` → typ w `types/` → serwis / mapper**.
- Serializacja do klienta: daty jako **`string` ISO** tam, gdzie kontrakty (`InitialWorkerData`) tego wymagają.

---

## 4. Warstwa serwisów (`src/services/`)

Centralne miejsce na zapytania Drizzle, transakcje (w przyszłości) i **jeden punkt prawdy** dla logiki „lista zleceń”, „sesja”, „archiwum” itd.

| Serwis (klasa) | Typowe obowiązki |
|----------------|------------------|
| `WorkerOrderService` | Lista oczekujących zleceń workerów, akceptacja, normalizacja `priority` |
| `WorkerSessionService` | Sesja robocza, GPS/notatki/zdjęcia po stronie worker API |
| `AdminOrderService` | Lista/edycja zleceń w panelu |
| `AdminSessionService` | Sesje / archiwum w zakresie admin |
| `AdminUserService` | Pracownicy / konta |
| `DictionaryService` | Kategorie, maszyny, materiały, klienci — słowniki |
| `AdminReportService` | Raporty |
| `SystemLogService` | Agregacja `device_logs` |
| `GpsService` | Logika ścieżek GPS |

**Uwaga:** Część klas ma wyłącznie metody **`static`** — to świadomy, prosty wzorzec w repozytorium (nie mylić z DI kontenerem).

---

## 5. Kontrolery Next (`route.ts`) i Server Components

### Docelowy wzorzec kontrolera

1. Autoryzacja (uzupełnienie middleware, jeśli potrzebne).
2. Parsowanie wejścia / kodów odpowiedzi HTTP.
3. **Wywołanie metody serwisu**.
4. `NextResponse.json(...)` lub delegacja błędu.

### Konwencja po refaktoryzacji (v1.9+)

**`src/app/`** (wszystkie `page.tsx`, `layout.tsx`, `route.ts`) nie powinien importować **`@/db`**, **`@/db/schema`** ani **`drizzle-orm`**. Kontrolery parsują wejście i wołają **`src/services/*`**; typy „jak INSERT bez schema w route” eksportuj z serwisu (np. `ResourceCategoryUpdateInput`, `UserUpdatePayload`).

### Server Components

Strony typu **`worker/history`** korzystają z **`WorkerSessionService`** / **`DictionaryService`** itd. — bez duplikowania zapytań w warstwie widoku.

---

## 6. Moduł worker (`src/features/worker/`)

| Ścieżka | Zawartość |
|---------|-----------|
| `components/` | `WizardClient`, `PendingOrdersList`, `ActiveSessionDashboard`, `Modals/*` |
| `hooks/` | `useWorkerActions`, `useWorkerGPS`, `useWorkerNotifications` |
| `lib/` | `workOrderPresentation` (sortowanie, klasy Tailwind kart), `workOrderPriority` (`normalizeWorkOrderPriority`) |

Trasy URL pozostają w **`src/app/worker/`** — strony importują komponenty z `@/features/worker/...`.

---

## 7. Spójna prezentacja zlecenia (`src/components/work-orders/`)

Komponenty nie są „pod workerem”, żeby **admin** mógł użyć **tych samych** znaczników priorytetu i opisu bez forkowania klas CSS.

- `WorkOrderPriorityRibbon` — prop `labels` (typowo wycinek `getDictionary().worker.client` dla dosłownych tłumaczeń priorytetu).
- `WorkOrderSummaryLines` — blok maszyna / materiał / klient / opis / czas / zlecający (worker).

---

## 8. Internacjonalizacja (`src/i18n/`)

- **`locales/pl.ts`**, **`locales/en.ts`** — pełne drzewo stringów.
- **`types.ts`** — `AppDictionary` (= `typeof pl`), angielski musi spełniać **`AppDictionary`** (TS wymusza zestaw kluczy).
- **`format.ts`** — `formatDict` dla `{placeholderów}`.
- **`constants.ts`** — `DEFAULT_UI_LOCALE` (format dat/czasu do czasu wyboru języka użytkownika).
- **`getDictionary(locale?)`** — domyślnie `'pl'`.

---

## 9. Baza danych i migracje

- **Schemat:** `src/db/schema.ts` (Postgres via Drizzle).
- **Migracje wygenerowane / śledzone:** [`drizzle/`](./drizzle/), meta [`drizzle/meta/_journal.json`](./drizzle/meta/_journal.json).
- **Priorytet zlecenia:** wartości wyłącznie z zestawu **URGENT | HIGH | NORMAL | LOW** — constraint **`work_orders_priority_chk`** (migracja m.in. **`0003_work_orders_priority_chk.sql`**): najpierw UPDATE niepoprawnych wierszy, potem `CHECK`.

### 9.1. Pipeline migracji (rzeczywistość)

W repo **nie ma** automatycznej migracji w `next build` ani w starcie aplikacji. Wdrożenie idzie ręcznie:

1. Lokalnie: zmiana w `schema.ts` + nowy plik `drizzle/000X_<nazwa>.sql` (idempotentny: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`) + wpis w `drizzle/meta/_journal.json`.
2. Na bazę produkcyjną: skrypt `npm run db:napraw-*` (gotowe runnery `tsx` w `src/scripts/apply_*.ts`) **albo** `psql` z wklejonym SQL-em.
3. Deploy aplikacji.

Pełna lista skryptów i mapowanie do migracji — patrz **[`docs/SYSTEM_MAP.md` §15](./docs/SYSTEM_MAP.md)**.

### 9.2. Status migracji na bazie produkcyjnej (2026-05-10)

Wszystkie migracje **0000-0008 są zaaplikowane** na Neon (`ep-rough-sea-al7ogqfl`). Migracja **0004_users_biometric_login** została chwilowo pominięta (kolumna `biometric_login_enabled` brakowała → `Failed query: select … from users` → frontend „Wewnętrzny Błąd Serwera"). Naprawione punktowo `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. Lekcja: **nawet idempotentne migracje muszą trafić na produkcję — `IF NOT EXISTS` chroni przed re-runem, nie przed pominięciem.**

Przy zmianach schematu **nie zakładaj**, że migracja „jakoś się na produkcji sama zrobi" — procedura wdrożenia zespołu musi ją uruchomić, a **handler API powinien wykrywać brak migracji** (`src/lib/postgresMigrationHints.ts` + sprawdzenie po `column .*does not exist`/`relation .*does not exist`/`Failed query`/`NeonDbError`) i zwracać czytelny `503` z kluczem i18n (`migration_required`, `migration_material_categories` itp.) zamiast suchego `500`.

---

## 10. Uwierzytelnienie i middleware

- Cookie **`auth_token`**, weryfikacja **`jose`** (`jwtVerify`).
- **`src/middleware.ts`** — matcher dla `/admin`, `/worker`, `/login`, `/api`.
- **API współdzielone** (worker + ewentualnie konfiguracja offline urządzeń): prefiksy zdefiniowane jako **`SHARED_API_PREFIXES`** w middleware (`/api/machines`, `/api/materials`, `/api/customers`, `/api/categories`). Nowy publiczny shard API → **dopisz prefiks tam**, inaczej trafi pod domyślne reguły **admin API**.

**Next.js 16** może wyświetlać ostrzeżenie o deprecacji nazwy „middleware” na rzecz „proxy” — zmiana nazwy pliku bez pełnej migracji **wyłączy ochronę** tras.

---

## 11. Next.js App Router — dynamiczne segmenty

W komponentach strony oraz tam, gdzie framework tego wymaga, **`params` jest `Promise`**:

```ts
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

Reguła nadal obowiązuje w **Next 16** dla dynamicznych tras — nie polegaj na synchronicznym `params.id` w typach sprzed kilku lat tutoriali.

---

## 12. PWA / Capacitor

- **`CapacitorBackButton`** — pojedyncze miejsce obsługi wstecz na Androidzie.
- **`sendRemoteLog`** — ścieżka diagnostyczna na urządzeniach w terenie; persystencja w **`device_logs`**.
- **`GlobalErrorHandler`** — listener `window.error` + `unhandledrejection` w `worker/layout.tsx`; każdy nieobsłużony wyjątek leci do `device_logs`.
- **GPS bookend** — `work_sessions.start_*` / `end_*` zapisywane przy akceptacji zlecenia (`POST /api/worker/work-orders/:id/accept`) i przy kończeniu sesji (`PUT /api/worker/session`). Body opcjonalne — bez zgody na GPS po prostu `null`.
- **`isStationary`** (warsztat / plac) — kategoria z tym flagiem ⇒ `useWorkerGPS` **wyłącza watcher**, a `handleCheckpoint` pomija geofence-confirm.

Pełna mapa modułu mobilnego (hooki, konfig Capacitor, biometria, kolejka GPS) — **[`docs/SYSTEM_MAP.md` §14](./docs/SYSTEM_MAP.md)**.

---

## 13. Checklista „co sprawdzić przed dużym PR”

- [ ] Czy nowe pola są w **`schema.ts`** + migracji + typach **`types/`**?
- [ ] Czy odpowiedź JSON dla mobilki pozostaje tablicą tam, gdzie klient robi `.map`?
- [ ] Czy teksty są w **i18n**, a nie na sztywno po polsku w adminie?
- [ ] Czy nie dodajesz **`any`**?
- [ ] Czy nowy lub zmieniany **`route.ts`** / **`page.tsx`** nie wprowadza z powrotem **Drizzle w `src/app/`** — tylko woła **serwis**?

---

*Ten dokument ma odzwierciedlać repo; jeśli struktura się zmieni — aktualizuj **ARCHITECTURE.md** i **AGENTS.md** w jednym zestawie zmian.*

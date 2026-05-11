# Werkit — roadmap redukcji długu technicznego

> **Cel:** jedno miejsce na *plan* i priorytety. Szczegółowa inwentaryzacja endpointów / DB nadal w [`SYSTEM_MAP.md`](./SYSTEM_MAP.md); zasady pracy w [`../AGENTS.md`](../AGENTS.md).

---

## 1. Czy AGENTS / ARCHITECTURE / SYSTEM_MAP są „złe”?

Nie — ale **nakładają się funkcjonalnie**, więc bez dyscypliny szybko się **rozjeżdżają** (np. wersja aplikacji w kilku zdaniach, ten sam wyjątek opisany dwukrotnie).

| Dokument | Optymalna rola (docelowy kontrakt) |
|----------|-------------------------------------|
| **[`AGENTS.md`](../AGENTS.md)** | Krótki **operacyjny SSOT** dla agentów i PR: stack, twarde zasady, autonomia migracji, linki „gdzie szukać głębiej”. **Bez** długich list endpointów. |
| **[`ARCHITECTURE.md`](../ARCHITECTURE.md)** | **Dlaczego** tak jest zbudowane: warstwy, przepływ żądania, wyjątki od reguł (krótko), link do roadmapu długu. |
| **[`SYSTEM_MAP.md`](./SYSTEM_MAP.md)** | **Co** jest w systemie: tabele, API, serwisy, i18n, pułapki — **inwentaryzacja**, aktualizowana w tym samym PR co zmiana kodu. |
| **Ten plik (`TECH_DEBT_ROADMAP.md`)** | **Kiedy i jak** coś naprawiamy: fazy, ryzyko, kryteria ukończenia. |

**Zasada utrzymania:** zmiana planu długu → **ten plik**; zmiana faktu „jak działa endpoint X” → **SYSTEM_MAP**; zmiana zasady dla deweloperów → **AGENTS**.

Opcjonalnie później: generowanie fragmentów SYSTEM_MAP ze skryptu (np. lista `route.ts`) — tylko jeśli koszt utrzymania ręcznej tabeli przewyższy koszt skryptu.

---

## 2. Fazy prac (od najniższego ryzyka)

### Faza A — `schedule.ts` → warstwa serwisów ✅ priorytet 1

| | |
|---|---|
| **Problem** | `src/lib/schedule.ts` używa Drizzle poza `src/services/`, łamie konwencję „DB tylko w serwisach”. |
| **Działanie** | Przenieść `checkScheduleConflict` do np. `AdminOrderService` (lub `SchedulingService` jeśli wytniesz zależność od admin-only). Call-site’y: route handlery / komponenty serwerowe importują serwis. |
| **Ryzyko** | Niskie — czysty refactor ścieżki importu + ten sam SQL. |
| **Done when** | `checkScheduleConflict` żyje w warstwie serwisów (`AdminOrderService`); **`src/lib/schedule.ts` usunięty**. |

### Faza B — jeden opowiadany pipeline migracji ✅ priorytet 2

| | |
|---|---|
| **Problem** | Równolegle: `drizzle-kit migrate`, skrypty `apply_*.ts`, `db:verify-schema`. Na Windows `db:migrate` bywa mało czytelny wsadowo. |
| **Działanie** | (1) Utrzymać **`db:napraw-wszystko`** jako kanoniczny „push schematu” na Neon. (2) W SYSTEM_MAP §9 opisać **jedną** procedurę wdrożenia (bez sprzecznych ścieżek). (3) Opcjonalnie: `apply_pending_migrations.ts` wołający kolejno istniejące `apply_*` — bez magii `information_schema` w pierwszej iteracji. |
| **Ryzyko** | Średnie — zmiana procesu zespołu, nie kodu aplikacji. |
| **Done when** | Jedna sekcja „jak wdrażamy migracje na prod” + wszyscy używają tego samego polecenia po zmianie `schema.ts`. |

### Faza C — kolumny legacy w DB (`session_type`, `resources.category_id`) ⚠️ priorytet 3

| | |
|---|---|
| **Problem** | Martwy lub mylący model: `session_type` = `'MIGRATED'`, `resources.category_id` przy istnieniu `resource_to_categories`. |
| **Działanie** | (1) `grep` całego repo + raporty SQL na prod (czy coś jeszcze filtruje po `session_type` / `category_id`). (2) Migracja SQL: `UPDATE` backfill jeśli trzeba. (3) `DROP COLUMN` w osobnej migracji po deployu kodu bez odczytu tych pól. (4) Uprościć `schema.ts` i `verify_schema_alignment.ts`. |
| **Ryzyko** | **Wysokie** — Core logistyki; wymaga okna deploy + backup. |
| **Done when** | Kolumn usuniętych lub nullable bez użycia w kodzie; `db:verify-schema` zielony. |

### Faza D — semantyka `acceptOrder` / status zlecenia ⚠️ priorytet 3 (produkt + tech)

| | |
|---|---|
| **Problem** | Zlecenie przy akceptacji może mieć status „techniczny” (`COMPLETED` jako marker) — mylące dla raportów i nowych deweloperów. |
| **Działanie** | Decyzja produktowa: np. status `ACCEPTED` / `IN_PROGRESS` na `work_orders` albo rozdzielenie „dyspozycja vs realizacja” wyłącznie przez `work_sessions`. Potem migracja danych + aktualizacja zapytań (`WorkerOrderService`, admin, raporty). |
| **Ryzyko** | Wysokie — zmiana widoczna w terenie i panelu. |
| **Done when** | Jedna spójna maszyna stanów (`PENDING` → `IN_PROGRESS` → `COMPLETED`) udokumentowana w SYSTEM_MAP + migracja **0013** na bazach ze starymi stanami + regresja ścieżki worker/admin. |

### Faza E — `bcrypt` vs serverless (opcjonalnie) 🔧 priorytet 4

| | |
|---|---|
| **Problem** | Natywny `bcrypt` czasem jest problematyczny na niektórych runtime’ach. |
| **Działanie** | Warunkowy fallback `bcryptjs` w `login`/hash path **tylko** po wykryciu błędu ładowania lub feature flag. |
| **Ryzyko** | Średnie — bezpieczeństwo i spójność algorytmu hashowania. |
| **Done when** | `passwordCrypto` w ścieżkach hash/compare; dokumentacja zmiennej w SYSTEM_MAP §16; domyślnie nadal natywny `bcrypt`. |

### Faza F — dokumentacja admin `page.tsx` 🔧 priorytet 5

| | |
|---|---|
| **Problem** | SYSTEM_MAP §4 nie opisuje szczegółowo montowania każdego ekranu admina. |
| **Działanie** | Krótka tabela „route → główny client component” lub link do struktury folderów — bez dublowania ARCHITECTURE. |
| **Ryzyko** | Niskie. |

---

## 3. Metryki „jest lepiej”

1. Brak wyjątków Drizzle poza `src/services/` (poza `src/db/`).
2. Jedna udokumentowana ścieżka migracji na produkcję.
3. Schemat DB bez usuniętych kolumn legacy (**0014**): `session_type`, `resources.category_id` — kod i `verify_schema` zsynchronizowane.
4. Roadmap ten zaktualizowany w PR zamykającym każdą fazę (checkbox poniżej).

---

## 4. Checklist postępu (edytuj w PR)

- [x] **Faza A** — `schedule.ts` w serwisie (`AdminOrderService.checkScheduleConflict`, plik `src/lib/schedule.ts` usunięty)
- [x] **Faza B** — procedura migracji: `npm run db:napraw-wszystko-i-zweryfikuj` + opis w SYSTEM_MAP §3.3 / §15
- [x] **Faza C** — kod bez `session_type` / `resources.category_id`; migracja **`0014_drop_legacy_session_type_resource_category.sql`**; `verify_schema_alignment` + `schema.ts`; skrypt `migrate_categories.ts` → noop dokumentacyjny
- [x] **Faza D** — semantyka statusów: `acceptOrder` → `work_orders.IN_PROGRESS`; domknięcie sesji / force-complete → `COMPLETED`; `cancelActiveSession` przez `work_order_id` → `PENDING`; GET dyspozycji tylko `PENDING`; konflikt harmonogramu `PENDING|IN_PROGRESS`; migracja **`0013_work_orders_in_progress_status.sql`** (backfill).
- [x] **Faza E** — `src/lib/passwordCrypto.ts` (`comparePassword`/`hashPassword`), zmienna **`WERKIT_USE_BCRYPTJS`**, zależność **`bcryptjs`**; login + CRUD workers + `AdminUserService.verifyPassword`
- [x] **Faza F** — SYSTEM_MAP §4: kolumny „Główny komponent UI” + „Opis” dla `/admin/*`

---

*Ostatnia aktualizacja struktury roadmapu: 2026-05-11.*

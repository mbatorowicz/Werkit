# Werkit — roadmap redukcji długu technicznego

> **Cel:** jedno miejsce na *plan* i priorytety. Szczegółowa inwentaryzacja endpointów / DB nadal w [`SYSTEM_MAP.md`](./SYSTEM_MAP.md); zasady pracy w [`../AGENTS.md`](../AGENTS.md).

> **Status dokumentu:** fazy **A–F** są **zamknięte** (checklista §4 — wszystkie `[x]`). Sekcja **§2** to **archiwum decyzji** (co było, co zrobiono). **Nowy dług** dopisuj w **§5** albo nowym dokumencie po ustaleniu z zespołem — nie podpinaj pod zamknięte litery A–F.

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

## 2. Zamknięte fazy A–F (archiwum — nie edytuj jako „otwarte zadania”)

### Faza A — harmonogram w serwisach ✅ zamknięta

| | |
|---|---|
| **Było** | `src/lib/schedule.ts` — Drizzle poza `src/services/`. |
| **Jest** | `AdminOrderService.checkScheduleConflict`; plik `schedule.ts` **usunięty**; handlery admin importują serwis. |

### Faza B — jeden czytelny pipeline migracji ✅ zamknięta

| | |
|---|---|
| **Było** | `drizzle-kit migrate` + WebSocket na części hostów, równolegle `apply_*.ts`, `db:verify-schema`. |
| **Jest** | **`npm run db:napraw-wszystko-i-zweryfikuj`** (skrypty idempotentne); **`npm run db:migrate:pg`** — migracje z `drizzle/` przez TCP (`pg`), z baseline dla baz bez historii `drizzle.__drizzle_migrations`; opis w **SYSTEM_MAP** §3.3 / §15. |
| **Odroczone** | Pojedynczy runner `apply_pending_migrations.ts` łączący wszystkie `apply_*` — **nie wdrożone** (koszt utrzymania > korzyść przy obecnym `db:migrate:pg` + `apply_*`). |

### Faza C — legacy kolumny DB ✅ zamknięta

| | |
|---|---|
| **Było** | `session_type` na `work_orders` / `work_sessions`, `resources.category_id` obok N↔M. |
| **Jest** | Migracja **`0014_drop_legacy_session_type_resource_category.sql`**; `schema.ts` + **`verify_schema_alignment`** zsynchronizowane. |

### Faza D — semantyka statusu zlecenia ✅ zamknięta

| | |
|---|---|
| **Było** | `COMPLETED` na zleceniu zaraz po akceptacji (marker mylący). |
| **Jest** | `PENDING` → **`IN_PROGRESS`** po akceptacji → **`COMPLETED`** po domknięciu sesji / force-complete; anulowanie sesji przez `work_order_id` → `PENDING`; lista dyspozycji tylko `PENDING`; konflikt harmonogramu `PENDING` \| `IN_PROGRESS`; migracja **`0013`**. |

### Faza E — bcrypt / bcryptjs ✅ zamknięta

| | |
|---|---|
| **Było** | Twardy import `bcrypt` wszędzie. |
| **Jest** | `src/lib/passwordCrypto.ts` — `comparePassword` / `hashPassword`; **`WERKIT_USE_BCRYPTJS=1`** wymusza `bcryptjs`; przy błędzie importu natywnego `bcrypt` automatyczny fallback do `bcryptjs`; ścieżki login, workers, `AdminUserService.verifyPassword`. |

### Faza F — dokumentacja routingu admin ✅ zamknięta

| | |
|---|---|
| **Było** | SYSTEM_MAP §4 bez mapowania na komponenty. |
| **Jest** | Tabela §4: ścieżka → główny komponent UI → opis (admin + worker). |

---

## 3. Metryki „jest lepiej” — stan spełniony

1. Brak wyjątków Drizzle poza `src/services/` (poza `src/db/`).
2. Jedna udokumentowana ścieżka migracji na produkcję: **`db:napraw-wszystko-i-zweryfikuj`** + **`db:migrate:pg`** dla journalu Drizzle (szczegóły SYSTEM_MAP §15).
3. Schemat DB bez usuniętych kolumn legacy (**0014**); kod i `verify_schema` zsynchronizowane.
4. Roadmap: checklista §4 zamknięta; §2 trzyma archiwum decyzji.

---

## 4. Checklist postępu (zamknięty pakiet A–F)

- [x] **Faza A** — `schedule.ts` w serwisie (`AdminOrderService.checkScheduleConflict`, plik `src/lib/schedule.ts` usunięty)
- [x] **Faza B** — `db:napraw-wszystko-i-zweryfikuj` + SYSTEM_MAP §3.3 / §15 + **`db:migrate:pg`**
- [x] **Faza C** — migracja **0014**; schema + `verify_schema_alignment`
- [x] **Faza D** — statusy zleceń + migracja **0013**
- [x] **Faza E** — `passwordCrypto` + `bcryptjs` + `WERKIT_USE_BCRYPTJS`
- [x] **Faza F** — SYSTEM_MAP §4 (komponenty / opisy tras)

**Brak otwartych pozycji A–F.** Kolejny dług: **§5** lub nowy ticket — nie rozszerzaj checklisty §4 bez uzasadnienia.

---

## 5. Następny dług

| ID | Temat | Status |
|----|--------|--------|
| D-01 | Ujednolicenie dat/czasu w panelu admin (`formatUi*` / strefa jak worker) | done |
| D-02 | Rozszerzenie testów: krytyczne ścieżki (Vitest w CI; `lib` + serwisy mapowania błędów/tenant + route waypoints; dalej sesja/GPS) | done |
| D-03 | Wspólny moduł okien czasowych dla telemetrii (dedupe + throttle fetch) | done |
| D-04 | Abstrakcja providera trasy mapy (OSRM / ewentualna wymiana backendu) | done |
| D-05 | Architektura: przeniesienie logiki DB z route handlera do serwisu (foto) | done |
| D-06 | Rozszerzenie testów: AdminSessionService, GpsService, SystemLogService | done |

### D-02 — co zrobiono

- [`AdminUserService.test.ts`](../src/services/AdminUserService.test.ts): rozszerzono z 2 → 17 testów pokrywających wszystkie metody (`getAllUsers`, `getUserById`, `getUserByIdForCompany`, `getUserByUsername`, `getWorkers`, `createUser`, `updateUser`, `userCanEditRoute`, `verifyPasswordForUserId`, `deleteUser`).

### D-04 — co zrobiono

- [`RouteGeometryProvider`](../src/lib/map/routeGeometryProvider.ts): dodano interfejs `parseRouteResponse(data: unknown): ParsedRouteResponse` oraz domyślną implementację w `projectOsrmPublicRouteGeometryProvider`. Typy OSRM (`OsrmStep`, `OsrmRoute`, `NavigationInstruction`) przeniesione z hooka do providera.
- [`useOsrmNavigation`](../src/components/Map/useOsrmNavigation.ts): usunięto inline parsowanie odpowiedzi OSRM — hook deleguje do `routeGeometryProvider.parseRouteResponse()`. Hook zawiera tylko logikę pozycjonowania (Haversine, `findCurrentInstructionIndex`, `calculateRemainingDistance`).
- Re-eksport `NavigationInstruction` z hooka dla kompatybilności wstecznej.

### D-05 — co zrobiono

- [`WorkerSessionService`](../src/services/WorkerSessionService.ts): dodano metodę `uploadAndAddPhoto(userId, companyId, base64DataUrl, location?)`, która łączy upload do Vercel Blob Storage (`uploadPhotoBase64`) z zapisem URL-a w tabeli `sessionPhotos`.
- [`photos/route.ts`](../src/app/api/worker/session/photos/route.ts): usunięto bezpośrednie importy `@/db` i `@/db/schema` — handler deleguje do `WorkerSessionService.uploadAndAddPhoto()`. Zgodność z regułą AGENTS.md §4: `src/app/**` nie importuje `@/db`.
- Weryfikacja: TypeScript 0 errors, ESLint 0 errors.

### D-06 — co zrobiono

- [`AdminSessionService.test.ts`](../src/services/AdminSessionService.test.ts): 8 testów pokrywających 3 metody (`getSessionDetails`, `forceCompleteSession`, `deleteArchivedSession`) — w tym przypadki brzegowe (sesja nie istnieje, zły status, aktywna sesja przy usuwaniu).
- [`GpsService.test.ts`](../src/services/GpsService.test.ts): 6 testów pokrywających 2 metody (`getActiveSessionGpsLogs`, `saveGpsLogs`) — w tym pusta tablica, brak aktywnej sesji, filtrowanie nieprawidłowych punktów.
- [`SystemLogService.test.ts`](../src/services/SystemLogService.test.ts): 6 testów pokrywających 2 metody (`getRecentLogs`, `insertLog`) — w tym domyślne wartości, przycinanie długich stringów, pusty wynik.
- Łączna liczba testów: **118** (wzrost z 98).

### Inne naprawione

- [`useLocale.ts`](../src/hooks/useLocale.ts): usunięto duplikację logiki między `useState` init a `useEffect` na mount. Stan inicjalizowany leniwie przez `buildLocaleConfigFromCookies()`. Usunięto zbędny `useEffect` i związany z nim `eslint-disable`.

---

*Ostatnia aktualizacja roadmapu: 2026-05-26.*

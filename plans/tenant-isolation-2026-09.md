# Plan izolacji tenantów — organizacja, FK, obrona w głąb

> **Status:** otwarty (2026-09-14). T0–T3 do zrobienia.  
> **Źródło:** audyt izolacji multi-firm (czat „Audyt izolacji tenantów”).  
> **SSOT postępu:** ten plik + [`docs/TECH_DEBT_ROADMAP.md`](../docs/TECH_DEBT_ROADMAP.md) §5 (`P-TENANT-*`).  
> **Poza zakresem:** tracker floty 24/7, scalanie magazynów, PM — kontrakt produktu bez zmian ([`AGENTS.md`](../AGENTS.md) §1). Nie ruszamy modelu logowania bez sluga firmy (globalny `username_email`) poza T3 (komunikat `user_exists`).

Werkit trzyma wiele firm w **jednej** bazie Postgres. Izolacja jest warstwą aplikacyjną (`company_id` + żywy principal), **nie** RLS. Rdzeń operacyjny (zlecenia, sesje, GPS, magazyny, użytkownicy, klienci, kategorie) filtruje po firmie z DB. Luka jest w module **organizacji** i w jednym FK maszyn.

Każda faza jest merdżowalna sama. Kolejność = ryzyko (T0 zamyka odczyt/zapis obcej firmy).

| Faza | Nazwa | Blokuje | Ryzyko wdrożenia |
|------|--------|---------|------------------|
| T0 | `OrganizationService` + API org: zawsze `companyId` | nic | Niskie — zmiana sygnatur + testów unitu |
| T1 | `resourceGroupId` maszyny = ta sama firma | nic | Niskie |
| T2 | Testy dwóch tenantów (org + grupa maszyn) | T0, T1 | Niskie — `*.int.test.ts` na żywej DB |
| T3 | Obrona w głąb (wyrocznia loginu, martwy helper JWT, listing łączeń) | T0 | Niskie |

**Świadomie zostaje w T0–T2:** brak PostgreSQL RLS (osobna decyzja, T3-opcjonalnie). Tabele podrzędne bez `company_id` (`gps_logs`, `session_photos`, `session_notes`, `customer_locations`, `team_members`) zostają — izolacja przez FK do encji z `company_id`, o ile rodzic jest zawsze sprawdzany w tenancie.

**Werdykt audytu:** rdzeń field-ops izoluje firmy. Moduł organizacji — nie.

---

## T0 — IDOR organizacji (Critical / High)

**Problem:** handlery `/api/admin/organization/**` wymagają sesji firmowej, ale potem wołają serwis **tylko po `id`**. Viewer firmy A czyta zespoły i loginy firmy B. Admin A zmienia i usuwa działy/zespoły ofiary. Dodatkowo POST wstrzykuje relacje (`parentId`, `departmentId`, `managerId`, `leaderId`, `userId`) bez asercji tenanta.

Wzorzec w reszcie kodu: `ResourceGroupService.getGroup(companyId, id)` + `WHERE id AND company_id`. Tu go brak.

Obce ID → **404 `not_found`** (albo 400 `invalid_parent` / `invalid_team` / `invalid_user` przy polach relacyjnych). **Nie** zwracaj `cross_tenant` — to wyrocznia istnienia rekordu w innej firmie.

### Zrób — serwis

[`src/services/OrganizationService.ts`](../src/services/OrganizationService.ts): każda metoda czytająca/mutująca po ID dostaje `companyId` i filtruje (join do `departments`/`teams`/`users` z `eq(..., companyId)`).

| Metoda dziś | Zmiana |
|-------------|--------|
| `getDepartment(companyId, id)` | zostaje (już OK) |
| `updateDepartment(id, data)` | `(companyId, id, data)`; `WHERE id AND company_id`; asercja `parentId` / `managerId` w tej firmie |
| `deleteDepartment(id)` | `(companyId, id)` |
| `getTeamsByDepartment(departmentId)` | `(companyId, departmentId)` — najpierw departament należy do firmy, inaczej `[]` albo `not_found` w API |
| `getTeam(id)` | `(companyId, id)` |
| `createDepartment(companyId, data)` | asercja `parentId` (dział tej firmy, grupa) i `managerId` (`getUserByIdForCompany`) |
| `createTeam(companyId, data)` | asercja `departmentId` + opcjonalny `leaderId` w firmie |
| `updateTeam(id, data)` | `(companyId, id, data)` + asercja `leaderId` |
| `deleteTeam(id)` | `(companyId, id)` |
| `getTeamMembersWithUsers(teamId)` | `(companyId, teamId)` |
| `addTeamMember({ teamId, userId })` | `(companyId, { teamId, userId, role })` — zespół i user w tej firmie |
| `updateTeamMember(id, data)` | `(companyId, id, data)` — member przez join `teams.companyId` |
| `removeTeamMember(id)` | `(companyId, id)` |
| `getUserTeams(userId)` | `(companyId, userId)` albo zostaw jeśli tylko wewnętrzne; nie eksponuj bez firmy |
| `replaceUserTeamAssignment` | już ma `companyId`; po T0 `addTeamMember` też dostaje `companyId` |

Prywatny helper np. `assertDepartmentInCompany` / `assertTeamInCompany` / `assertUserInCompany` — DRY, jeden komunikat błędu.

`role` przy `addTeamMember`: allowlista `member` \| `leader` (dziś dowolny string).

### Zrób — API

Na **mutacjach** (`POST`/`PATCH`/`DELETE`): `guardAdminMutation()` **przed** serwisem (dziś tylko `requireCompanyScopedSession` — viewer jest cięty przez proxy, nie przez handler).

| Plik | Zmiana |
|------|--------|
| `src/app/api/admin/organization/departments/route.ts` | POST: guard; serwis już dostaje `companyId` |
| `src/app/api/admin/organization/departments/[id]/route.ts` | PATCH/DELETE: guard + `companyId` w serwisie |
| `src/app/api/admin/organization/teams/route.ts` | GET `?departmentId=`: `getTeamsByDepartment(companyId, …)`; POST: guard |
| `src/app/api/admin/organization/teams/[id]/route.ts` | GET: `getTeam(companyId, id)` + członkowie z `companyId`; PATCH/DELETE: guard |
| `src/app/api/admin/organization/team-members/route.ts` | POST: guard + `addTeamMember(companyId, …)` |
| `src/app/api/admin/organization/team-members/[id]/route.ts` | PATCH/DELETE: guard + `companyId` |

GET listy/drzewa (`/tree`, GET departments, GET teams bez query) już filtrują po `companyId` — bez zmiany kontraktu JSON.

### Testy (unit w T0)

[`src/services/OrganizationService.test.ts`](../src/services/OrganizationService.test.ts): zaktualizować sygnatury. Dodać przypadki: update/delete/getTeam z `companyId` obcej firmy → brak wiersza; `createTeam` z `departmentId` spoza firmy → błąd; `addTeamMember` z `userId` spoza firmy → błąd.

### Kryterium ukończenia

Żaden handler org nie woła `db.update/delete/select` po samym `id`. Zgadnięcie sekwencyjnego ID innej firmy daje 404, nie JSON z e-mailami i nie kasuje działu.

### Pliki

`src/services/OrganizationService.ts`, `src/services/OrganizationService.test.ts`, sześć route handlerów `src/app/api/admin/organization/**`.

---

## T1 — grupa maszyn przy zapisie zasobu (High)

**Problem:** DUR waliduje `resourceGroupIds` (`assertResourceGroupsAssignable`). Maszyny nie: `ResourceService.addResource` / `updateResource` zapisują `resourceGroupId` bez `companyId`. Maszyna firmy A może wskazać grupę firmy B. `ResourceGroupService.getGroup` zlicza `resources` po samym `resourceGroupId` — licznik ofiary puchnie.

### Zrób

1. Przed insert/update zasobu: jeśli `resourceGroupId != null`, ta sama asercja co DUR (`assertResourceGroupsAssignable([id], companyId)` albo cienki `assertResourceGroupBelongsToCompany` w `tenantContext.ts` — jeden SSOT).
2. `ResourceGroupService.getGroups` / `getGroup`: `count` z `and(eq(resources.resourceGroupId, id), eq(resources.companyId, companyId))` (obrona w głąb na stare, już skośne wiersze).
3. Call-site API maszyn (`src/app/api/machines/route.ts`, `[id]/route.ts`) mapuje błąd na 400 `invalid_resource_group` (jak DUR).

### Testy

Unit `ResourceService`: groupId obcej firmy → throw. `ResourceGroupService.getGroup`: nie zlicza maszyn z innym `companyId`.

### Kryterium ukończenia

Nie da się zapisać maszyny z `resourceGroupId` spoza tenanta. Licznik grupy patrzy tylko na własne `company_id`.

### Pliki

`src/services/dictionary/ResourceService.ts`, `src/services/dictionary/ResourceGroupService.ts`, ewentualnie `src/lib/tenantContext.ts` / `src/services/dur/categoryValidation.ts` (reuse), route maszyn, testy.

---

## T2 — testy dwóch tenantów (High, regresja)

**Problem:** [`src/services/tenantIsolation.int.test.ts`](../src/services/tenantIsolation.int.test.ts) pokrywa userów, kategorie, klientów, materiały, zlecenia i `invalid_parent` kategorii. **Nie** pokrywa organizacji ani `resourceGroupId`.

### Zrób

Nowy (lub rozszerzony) `*.int.test.ts` z dwiema firmami `__ITEST`:

1. `getTeam(A, teamB.id)` → `null`.
2. `updateDepartment` / `deleteDepartment` / `deleteTeam` z `companyId=A` i id z B → brak mutacji w B.
3. `createTeam(A, { departmentId: deptB })` → błąd; drzewo B bez obcego zespołu.
4. `addTeamMember(A, { teamId: teamB, userId: userA })` oraz `{ teamId: teamA, userId: userB }` → błąd.
5. `ResourceService` + grupa B → throw; `getGroup(B)` nie zwiększa `resourceCount` o maszynę A.

Po T0 same unitu nie wystarczą — IDOR wychodzi na joinach z żywą bazą.

### Kryterium ukończenia

`npm run test:integration` obejmuje te przypadki. Padający test = regresja izolacji org.

---

## T3 — obrona w głąb (Medium / Low)

Robić **po** T0, żeby nie mieszać z IDOR.

| # | Temat | Działanie | Waga |
|---|--------|-----------|------|
| 1 | Wyrocznia loginu | `POST /api/admin/users`: unique violation (`23505`) → ten sam kształt co błąd walidacji, **nie** `user_exists` + 500. Login globalny zostaje (produkt). | Średnie |
| 2 | Martwy helper JWT | `resolveTenantCompanyId` / `getTenantCompanyId` ufają `session.companyId` z JWT. Handlery ich nie wołają (żywy principal). Albo usunąć, albo przerobić na alias `principal.companyId` i ostrzeżenie w teście, żeby nikt nie podpiął tego z powrotem pod API. | Niskie |
| 3 | `getResources` | `ResourceService.getResources` ładuje **całą** `resource_to_categories`. Zmienić na join/`inArray` po ID maszyn tej firmy (sąsiad hałasuje; ID są globalnie unikalne, więc lista nie miesza tenantów). | Niskie |
| 4 | Prefiks Blob | `werkit-photos/{sessionId}/` bez `companyId`. Store prywatny + presign. Opcja: `werkit-photos/{companyId}/{sessionId}/` przy **nowych** uploadach (stare URL-e zostają). Nie blokuje T0. | Niskie |
| 5 | RLS (opcjonalnie, osobna decyzja) | `FORCE ROW LEVEL SECURITY` na tabelach z `company_id` + `SET app.company_id` w połączeniu. Duży koszt operacyjny (pool, superadmin). Nie w tym PR-ze T0–T2. | Plan |

JWT 7 dni + Edge ufa roli z tokena: po degradacji admin→worker proxy wpuszcza `GET /api/admin/*` do czasu wygaśnięcia; handler bierze rolę z DB, więc **mutacje** padają. To eskalacja **wewnątrz** firmy, nie między firmami — nie mieszamy z T0. Ewentualny follow-up: Edge nie wystarczy na GET admin po demotion (krótszy TTL albo rewalidacja roli na Edge bez Drizzle — trudne).

### Kryterium ukończenia T3.1–T3.3

Tworzenie usera z zajętym loginem nie zdradza innego tenanta osobnym kodem. Nikt nie buduje nowego API na `resolveTenantCompanyId`. Lista maszyn nie skanuje całej tabeli łączącej.

---

## Kolejność wdrożenia

1. **T0** na `main` jako pierwszy PR — zamyka Critical IDOR (odczyt PII + destrukcja org).
2. **T1** zaraz potem (albo w tym samym PR, jeśli diff T0 jest mały — oba są lokalne).
3. **T2** w tym samym PR co T0 albo natychmiast po; bez T2 luka wraca przy kolejnym CRUD.
4. **T3** na końcu (komunikaty, porządki, RLS osobno).

Weryfikacja każdej fazy: `npm run lint`, `npx tsc --noEmit`, `npm test`; T2: `npm run test:integration`.

## Checklista

- [ ] **T0** — `OrganizationService` + API org zawsze z `companyId`; `guardAdminMutation` na mutacjach; 404 na obce ID
- [ ] **T1** — `resourceGroupId` maszyny w tenancie; `resourceCount` po `company_id`
- [ ] **T2** — integracja dwóch firm: org + grupa maszyn
- [ ] **T3.1** — unique login bez `user_exists` 500
- [ ] **T3.2** — `resolveTenantCompanyId` usunięty albo nieufający JWT
- [ ] **T3.3** — `getResources` nie ładuje całej `resource_to_categories`
- [ ] SYSTEM_MAP / AGENTS: krótka wzmianka po T0 (org = ten sam wzorzec co słowniki)
- [ ] i18n tylko jeśli dojdą nowe kody (`invalid_resource_group` już jest po DUR)

## Świadomie nie w tym programie

- Login per `slug` firmy (breaking change dla APK / biometrii).
- Dodawanie `company_id` na `gps_logs` / `session_photos` / `team_members` (redundantne przy poprawnym rodzicu).
- Rotacja JWT / lista `jti` (P-SEC S0 już rewaliduje principal).
- Naprawa danych już skośnych w produkcji (T1.2 tylko licznik; skrypt backfill FK org — tylko jeśli audyt DB pokaże śmieci).

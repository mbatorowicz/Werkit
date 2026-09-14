# Plan panelu platformy — control plane multi-tenant

> **Status:** otwarty (2026-09-14). PL0–PL3 do wdrożenia.  
> **Źródło:** czat „Panel superadmina multi-tenant”.  
> **SSOT postępu:** ten plik + [`docs/TECH_DEBT_ROADMAP.md`](../docs/TECH_DEBT_ROADMAP.md) §5 (`P-PLAT-*`).  
> **Poza zakresem:** tracker floty 24/7, scalanie magazynów, PM — kontrakt produktu bez zmian ([`AGENTS.md`](../AGENTS.md) §1). Billing, SSO, trial-daty, PostgreSQL RLS, kasowanie firmy z UI — **nie w PL0–PL3**.

`/platform` to **płaszczyzna sterowania** (onboarding, pakiet, wsparcie, zdrowie tenanta).  
`/admin` to **płaszczyzna operacji** (zlecenia, sesje, GPS sesji, dwa magazyny). Superadmin **nie** dostaje stałego `company_id` i **nie** ogląda mapy GPS ani magazynu klienta, poza krótkotrwałą impersonacją (PL1).

Stan wyjściowy (już jest): lista firm, create + pierwszy admin, `isActive` (blokuje login), dopisanie admina (bez listy), flagi GPS/DUR, KPI (userzy, workerzy, sesje 30d, pending, logi 7d). Proxy tnie superadmina z `/admin`, `/worker` i API firmowego.

Każda faza jest merdżowalna sama. Kolejność = zależności (PL1 potrzebuje listy kont z PL0 i tabeli audytu).

| Faza | Nazwa | Blokuje | Ryzyko wdrożenia |
|------|--------|---------|------------------|
| PL0 | Konta firmy + audyt zapisu | nic | Niskie — CRUD w `/api/platform` |
| PL1 | Impersonacja `/admin` | PL0 | Średnie — JWT, cookie resume, `AuthPrincipalService` |
| PL2 | Cykl życia + szablony pakietów | nic (równolegle do PL1 po PL0) | Niskie |
| PL3 | Zdrowie tenanta + UI audytu | PL0 (`last_login_at`); UI audytu po PL0 | Niskie |

**Świadomie zostaje:** login bez sluga firmy (globalny `username_email`); izolacja aplikacyjna (T0–T3), nie RLS; GPS tylko w sesji workera.

---

## Model ról (nie psuć)

| Kto | Gdzie | Czego nie robi |
|-----|-------|----------------|
| Superadmin | `/platform`, `/api/platform/*` | Na co dzień nie ma `company_id`. Nie wchodzi na `/worker`. |
| Admin firmy | `/admin` | Nie widzi innych firm, nie zmienia flag pakietu (GPS/DUR). |
| Viewer firmy | `/admin` (odczyt) | Mutacje API admin cięte przez proxy / `guardAdminMutation`. |
| Impersonacja (PL1) | tymczasowo `/admin` jako **wybrane konto firmy** | TTL krótki; powrót na `/platform`; wpis audytu. |

Admin firmy **konfiguruje** (promień geofence, baza, uprawnienia workerów). Superadmin **nadaje pakiet** (flagi).

---

## PL0 — konta firmy + audyt zapisu (High)

**Problem:** zakładka „Administratorzy” tylko *dodaje* konto. Brak listy, resetu hasła, deaktywacji. Każde zgłoszenie „nie mogę się zalogować” kończy się SQL. Brak śladu, kto zmienił firmę / flagi.

### Zrób — schemat

Migracja **0034** (kolejny wolny idx w `drizzle/meta/_journal.json`):

1. `users.last_login_at timestamptz NULL` — zapis przy udanym `POST /api/auth/login` (wszystkie role, w tym superadmin).
2. Tabela **`platform_audit_events`** (nie mylić z `device_logs`):

| Kolumna | Typ | Uwagi |
|---------|-----|--------|
| `id` | serial PK | |
| `actor_user_id` | int NOT NULL | superadmin; FK `users.id` RESTRICT |
| `company_id` | int NULL | FK `companies.id` SET NULL — zdarzenia globalne bez firmy |
| `action` | varchar(64) NOT NULL | allowlista, patrz niżej |
| `target_type` | varchar(32) | `company` \| `user` \| `flags` \| `impersonation` |
| `target_id` | int NULL | id firmy albo usera |
| `metadata` | jsonb NULL | bez haseł; np. `{ from: false, to: true }` |
| `created_at` | timestamptz NOT NULL default now | |

Indeks: `(company_id, created_at DESC)`, `(actor_user_id, created_at DESC)`.

Allowlista `action` (CHECK albo walidacja w serwisie — serwis wystarczy w PL0):

`company.create` · `company.update` · `company.activate` · `company.deactivate` · `company.archive` (PL2) · `admin.create` · `admin.reset_password` · `admin.activate` · `admin.deactivate` · `flags.update` · `impersonation.start` · `impersonation.end` (PL1)

`schema.ts` + `verify_schema_alignment.ts` w **tym samym** PR. Po migracji: `npm run db:migrate:pg` i `npm run db:verify-schema`.

### Zrób — serwis i API

Nowy **`PlatformTenantUserService`** (nie pchać tego do `AdminUserService` — tam zawsze jest `companyId` z sesji firmy).

| Metoda | Zachowanie |
|--------|------------|
| `listCompanyUsers(companyId, { roles?: ('admin'\|'viewer')[] })` | id, fullName, usernameEmail, role, isActive, lastLoginAt. **Bez** `passwordHash`. Domyślnie `admin` + `viewer`. |
| `setUserActive(companyId, userId, isActive, actorId)` | Tylko `admin`/`viewer` tej firmy. Deaktywacja ostatniego **aktywnego** admina → błąd `last_admin` (jak `AdminUserService.deleteUser`). |
| `resetPassword(companyId, userId, passwordHash, actorId)` | Polityka `isPasswordPolicyOk`. Nie zwracaj hash. |

**`PlatformAuditService.insert({ actorUserId, companyId, action, targetType, targetId, metadata })`** — jedyny zapis do `platform_audit_events`. Wołać z handlerów platformy po udanej mutacji (create company, PATCH company, POST admin, PUT flags — **dopisać do istniejących** endpointów).

Nowe trasy (wszystkie: `requireSuperadminSession`):

| Metoda | Ścieżka | Kontrakt |
|--------|---------|----------|
| GET | `/api/platform/companies/[id]/users` | `{ users: PlatformTenantUserRow[] }` |
| PATCH | `/api/platform/companies/[id]/users/[userId]` | body `{ isActive: boolean }` — 409 `last_admin` |
| POST | `/api/platform/companies/[id]/users/[userId]/password` | body `{ password }` — 400 `weak_password`; **nie** loguj hasła |

Istniejące POST `/api/platform/companies/[id]/admin` zostaje (create). Po sukcesie: audyt `admin.create`.

Login: w `authenticateLoginCredentials` / po sukcesie — `AdminUserService.touchLastLogin(userId)` (albo cienka metoda w serwisie userów). Porażka logowania **nie** rusza `last_login_at`.

### Zrób — UI

Zakładka **Administratorzy** w `PlatformCompanyDetailsModal`:

- tabela: nazwa, login, rola, aktywny, ostatnie logowanie (albo „nigdy”)
- akcje: deaktywuj / aktywuj (`AppDialogProvider.confirm`, variant danger przy deaktywacji)
- reset hasła: mały formularz (nowe hasło) + confirm; komunikat sukcesu **bez** echo hasła
- istniejący formularz „dodaj admina” pod tabelą
- puste: jak dziś `noAdminYet`

i18n `platform.*` pl/en/de. Kody: `last_admin`, `weak_password`, `not_found` — przez `apiErrors`.

### Testy

- Unit: `last_admin` przy deaktywacji jedynego aktywnego admina; reset nie rusza obcej firmy; lista bez hash.
- Integracja `__ITEST`: dwie firmy — GET users B z id usera A nie zwraca obcych; PATCH A na userze B → 404.
- Login zapisuje `last_login_at` (int. albo unit z mockiem czasu).
- Mutacja company/flags woła audyt (unit z mockiem `PlatformAuditService` albo int. SELECT 1 wiersza).

### Kryterium ukończenia

Superadmin widzi adminów firmy, resetuje hasło i wyłącza konto bez SQL. Ostatniego admina nie da się zgasić. Każda mutacja platformy z tej fazy ma wiersz w `platform_audit_events`. Hasła nigdy nie lądują w audycie ani w logach.

### Pliki

`drizzle/0034_*.sql`, `schema.ts`, `verify_schema_alignment.ts`, `src/services/PlatformTenantUserService.ts`, `src/services/PlatformAuditService.ts`, `src/app/api/platform/companies/[id]/users/**`, login route, `PlatformCompanyDetailsModal.tsx`, i18n, testy, SYSTEM_MAP §5.3.

---

## PL1 — impersonacja panelu admina (High)

**Problem:** wdrożenie i zgłoszenia wymagają „zobacz jak klient”. Dziś superadmin jest wycinany z `/admin` (to jest **dobrze** — zostaje jako default). Brak kontrolowanego wyjątku.

### Zasada

Impersonacja = **zalogowanie się jako istniejące konto firmy** (`admin` albo `viewer`), nie syntetyczny user i nie `company_id` na koncie superadmina.

- Domyślnie **viewer** (odczyt `/admin`, mutacje 403) — jeśli w firmie jest viewer; w przeciwnym razie superadmin **wybiera** konkretnego admina z listy PL0.
- Opcja „pełny dostęp” = wejście jako wybrany `admin` + drugie confirm (`variant: danger`).
- **Zakaz** `/worker` i `/api/worker/*` nawet gdy cel ma rolę worker — picker w UI tylko `admin` \| `viewer`.
- Firma `isActive=false` (oraz `archived` w PL2) → 403 `company_inactive`.
- Cel `isActive=false` → 403 `user_inactive`.

### Sesja (dwa cookie)

Nie nadpisuj tożsamości superadmina w DB.

1. Przy starcie: skopiuj obecny `auth_token` (JWT superadmina) do HttpOnly **`platform_resume`** (te same atrybuty co `authCookie`: Path `/`, Secure/SameSite jak login).
2. Ustaw `auth_token` na JWT celu: `{ userId, role, companyId }` **identycznie** jak zwykły login admina/viewera. TTL **30 min** (`exp`), nie 7 dni.
3. Dodatkowy claim **`impersonatorUserId`** (int, superadmin) — Edge go ignoruje; Node weryfikuje.
4. Koniec: `POST /api/platform/impersonation/end` — przywróć `auth_token` z `platform_resume`, skasuj `platform_resume`. Działa też po wygaśnięciu support JWT (resume wciąż żywy).

`JwtPayload` w `src/lib/auth.ts`: opcjonalne `impersonatorUserId?: number`.

### `AuthPrincipalService.resolve`

Jeśli JWT ma `impersonatorUserId`:

1. Aktor: istnieje, `isActive`, rola `superadmin` w DB (nie ufaj claimowi `role`).
2. Cel: `session.userId` istnieje, aktywny, rola `admin`\|`viewer`, `companyId` JWT === `users.company_id`.
3. Firma celu `isActive`.
4. Zwróć principal **celu** (userId/role/companyId z DB celu) — layout admin działa bez forka na każdy ekran.
5. Porażka → 401 + clear `auth_token` (resume zostaw — user wraca przez `/login` albo endpoint end jeśli resume żyje).

Bez claimu impersonacji: zachowanie jak dziś. Superadmin nadal `companyId: null`.

### Proxy

Dziś tnie `role === superadmin` z tras firmowych. Po podmianie cookie JWT ma `role=admin|viewer` → Edge wpuszcza `/admin`. **Nie** zmiękczaj `authorizeSuperadminRestrictions` dla czystego superadmina.

Opcjonalnie (warto w tym PR): jeśli JWT ma `impersonatorUserId`, **zablokuj** `/worker` i `/api/worker/*` nawet gdyby ktoś ręcznie wstawił workerowi claim (defense in depth — picker i tak nie pozwala).

### UI

- Przycisk w zakładce adminów: „Wejdź jako podgląd” / „Wejdź jako admin”.
- Confirm + opcjonalne pole **powód** (string, max 200, w `metadata` audytu; nie wymagane).
- Po starcie: `window.location = /admin`.
- W **`src/app/admin/layout.tsx`**: jeśli principal z impersonacji (endpoint `GET /api/platform/impersonation/status` albo claim wystawiony przez cienki RSC helper) — **banner** na całej szerokości: „Wsparcie platformy — firma {name}. Działasz jako {user}. [Zakończ]”.
- Zakończ → POST end → redirect `/platform` (w PL2: `/platform/companies/[id]` jeśli strona szczegółów już jest; w PL1 wystarczy `/platform`).
- Banner nie używa `window.alert`.

Audyt: `impersonation.start` (metadata: `targetUserId`, `targetRole`, `reason`) i `impersonation.end`.

### Testy

- Unit principal: brak aktora superadmin → null; firma nieaktywna → null; cel worker → null.
- Integracja: start → GET `/api/admin/users` 200 w tenancie celu; GET firmy B → 404/pusta (izolacja T0 nadal działa, bo principal ma companyId celu).
- Worker API podczas impersonacji → 403.
- End przywraca rolę superadmin; GET `/api/platform/analytics` 200.
- TTL: token z `exp` w przeszłości nie przechodzi `jwtVerify`.

### Kryterium ukończenia

Superadmin wchodzi w `/admin` wybranej firmy na max 30 min, widzi banner, wraca na platformę. Ślad w audycie. Brak dostępu do aplikacji workera. Czysty superadmin nadal nie wejdzie na `/admin` bez impersonacji.

### Pliki

`src/lib/auth.ts`, `src/lib/authCookie.ts` (nazwa `PLATFORM_RESUME_COOKIE`), `src/services/AuthPrincipalService.ts`, `src/lib/livePrincipal.ts`, `src/proxy.ts`, `src/app/api/platform/impersonation/route.ts` (POST start/end; GET status), layout admin (banner), `PlatformCompanyDetailsModal`, i18n, testy principal + proxy + int.

**Nie** rób: stałego `company_id` na superadminie; impersonacji workera; podmiany `created_by` na superadmina (zlecenia i tak idą jako user celu — stąd audyt platformy jest obowiązkowy).

---

## PL2 — cykl życia firmy + szablony pakietów (Medium)

**Problem:** `isActive` to jeden bit. Offboarding = „wyłącz i módl się”. Flagi GPS/DUR to 6 kliknięć przy każdym onboardingu.

### Cykl życia

Nie wyłączaj `companies.is_active` — S0/login już na nim stoi. Dodaj **`companies.lifecycle_status`**.

Wartości: `trial` \| `active` \| `suspended` \| `archived`. Default `active`. CHECK w SQL.

Synchronizacja (jeden helper `lifecycleToIsActive(status): boolean`):

| Status | `is_active` | Login | Impersonacja | Nowe konta admin |
|--------|-------------|-------|--------------|------------------|
| `trial` | true | tak | tak | tak |
| `active` | true | tak | tak | tak |
| `suspended` | false | nie (ten sam `invalid_credentials`) | nie | nie |
| `archived` | false | nie | nie | nie |

PATCH `/api/platform/companies/[id]`: przyjmuje `lifecycleStatus`. Zapis **zawsze** ustawia `isActive` z helpera (nie da się rozjechać). Istniejący toggle w tabeli mapuje: active↔suspended (nie skacz do archived jednym kliknięciem).

Archiwizacja: osobny przycisk + confirm danger. **Nie** kasuj wierszy firmy, sesji, GPS, magazynu.

Dodatkowe kolumny (nullable, bez UI-wymuszania):

- `companies.internal_note` text — notatka wsparcia (max 2000, trim)
- `companies.plan_key` varchar(32) — `field_ops` \| `field_ops_mro` \| `yard` \| `custom`

Zakładka **Dane**: status, notatka, zapisz. Lista firm: filtr „ukryj zarchiwizowane” (domyślnie on).

### Szablony pakietów

Bez nowego silnika flag. Presety wołają istniejący `PUT /api/platform/feature-flags/:companyId`.

| `plan_key` | GPS tracking | mapa | geofence | trasa | nawigacja | DUR |
|------------|--------------|------|----------|-------|-----------|-----|
| `field_ops` | on | on | on | on | on | off |
| `field_ops_mro` | on | on | on | on | on | on |
| `yard` | off | off | off | off | off | on |
| `custom` | ręczne przełączniki (stan obecny) | | | | | |

UI zakładki **Funkcje**: 3 przyciski preset + obecne togle. Ręczne kliknięcie toggle → `plan_key = custom`. Preset → zapis flag + `plan_key`. Audyt `flags.update` z `{ planKey, flags }`.

Admin firmy nadal **nie** edytuje tych flag.

### Testy

- Helper lifecycle ↔ isActive.
- PATCH archived → login admina firmy = `invalid_credentials` (int.).
- Preset `yard` zapisuje DUR on i GPS off.
- Archiwum nie pojawia się na liście przy domyślnym filtrze.

### Kryterium ukończenia

Offboarding = `archived` bez DELETE. Onboarding = jeden preset zamiast sześciu flag. `is_active` i status nigdy się nie rozjeżdżają.

### Pliki

migracja **0035**, `PlatformCompanyService.updateCompany`, PATCH companies, `FeatureFlagsSection`, zakładka danych, analytics (filtr archived), i18n, SYSTEM_MAP.

Opcjonalnie w tym PR: trasa **`/platform/companies/[id]`** (RSC + te same taby) zamiast wyłącznie modala — ułatwia powrót z impersonacji. Jeśli diff za duży, zostaw modal i zrób stronę w PL3.

---

## PL3 — zdrowie tenanta + przeglądarka audytu (Medium)

**Problem:** KPI z `PlatformAnalyticsService` mówią o skali, nie o tym, czy firma „żyje”. Audyt z PL0 jest tylko w DB.

### Rozszerz overview (bez nowych tabel)

`CompanyUsageRow` dopisać:

| Pole | Źródło |
|------|--------|
| `lifecycleStatus` | `companies` (PL2) |
| `planKey` | `companies` (PL2) |
| `lastAdminLoginAt` | max `users.last_login_at` gdzie role=admin |
| `lastWorkerLoginAt` | max dla worker |
| `activeSessionsNow` | `work_sessions.end_time IS NULL` |
| `errorLogsLast24h` | `device_logs` level ERROR, 24h |

Lista: sortowanie po ostatnim logowaniu; chip „cicha” gdy 0 sesji 30d i `active`. Nie otwieraj `device_logs` w UI platformy (to dane tenanta) — tylko **licznik**.

Wersja APK per firma: **nie buduj** inwentarza. Jeśli w `device_logs.metadata` już jest wersja apki — opcjonalny chip; w przeciwnym razie pomiń (źródło prawdy APK zostaje `AppDownloadCard` na `/admin/settings`).

### UI audytu

Nowa trasa **`/platform/audit`** (albo zakładka na szczegółach firmy):

- GET `/api/platform/audit?companyId=&action=&limit=100`
- kolumny: czas, aktor (imię superadmina), firma, action, target
- bez edycji, bez usuwania
- `platformRoutes.audit`

Nawigacja w headerze `/platform`: Rejestr firm · Dziennik (dwa linki). Nie buduj drugiego sidebara admina.

### Limity (tylko odczyt)

Nie implementuj per-tenant silnika limitów GPS/foto w PL3. Na szczegółach firmy pokaż **stałe produktu** (GPS 200, foto 4 MiB, throttle logów) jako tekst pomocy + liczby użycia z overview. Seats / billing = faza późniejsza (poniżej).

### Testy

- Overview: firma bez logowań → `lastAdminLoginAt: null`.
- Audit GET: superadmin 200; session admin firmy 403.
- Filtr companyId nie wycieka wierszy innej firmy (tu audyt jest globalny dla superadmina — OK; nie wystawiaj tego API poza `requireSuperadminSession`).

### Kryterium ukończenia

Na liście widać, która firma zamilkła i która sypie errorami. Superadmin przegląda własny ślad działań. Nadal nie ma mapy GPS ani listy zleceń na `/platform`.

### Pliki

`PlatformAnalyticsService`, `PlatformDashboard` / wiersz tabeli, `PlatformAuditService.list`, `src/app/platform/audit/page.tsx`, `appRoutes.platformRoutes`, i18n, SYSTEM_MAP, krótka wzmianka w AGENTS (panel platformy = control plane + impersonacja).

---

## Świadomie nie w PL0–PL3

- Billing, faktury, trial z datą końca, limity seats z twardym 403 przy tworzeniu workera.
- SSO / SAML / SCIM.
- PostgreSQL RLS (T3.5).
- Impersonacja aplikacji **workera** i podgląd `gps_logs` na mapie platformy.
- Twarde DELETE firmy i cascade z UI.
- Login per slug firmy (breaking change APK / biometria).
- Druga pełna kopia paneli `/admin` pod `/platform/companies/.../orders`.
- Zmiana kontraktu produktu (PM, motogodziny, tracker 24/7, merge SKU).

To osobny program, gdy pojawi się sprzedaż na skalę albo wymóg korporacyjny.

---

## Kolejność wdrożenia

1. **PL0** na `main` jako pierwszy PR — odblokowuje wsparcie bez SQL i daje audyt pod PL1.
2. **PL1** zaraz potem — nie łącz z PL2 (diff JWT/proxy ma być czytelny w review).
3. **PL2** może iść równolegle do PL1 po scaleniu PL0 (nie zależy od cookie).
4. **PL3** na końcu (czyta `last_login_at`, status, audyt).

Weryfikacja każdej fazy: `npm run lint`, `npx tsc --noEmit`, `npm test`; tam gdzie DB: `npm run test:integration`, `npm run db:verify-schema`.

Po PL1: ręcznie w przeglądarce — start impersonacji → banner → jedna mutacja w `/admin` (jako admin) vs 403 (jako viewer) → zakończ → `/platform`.

---

## Checklista

- [ ] **PL0** — lista adminów/viewerów, reset hasła, deaktywacja + `last_admin`; `last_login_at`; `platform_audit_events` + zapis na mutacjach platformy
- [ ] **PL1** — impersonacja admin/viewer, cookie `platform_resume`, TTL 30 min, banner, zakaz `/worker`, audyt start/end
- [ ] **PL2** — `lifecycle_status` + notatka; presety `field_ops` / `field_ops_mro` / `yard`; `is_active` zsynchronizowane
- [ ] **PL3** — overview zdrowia; `/platform/audit`; bez silnika seats
- [ ] SYSTEM_MAP §4.3 / §5.3 + i18n pl/en/de w każdym PR
- [ ] AGENTS: jedna linia po PL1 (impersonacja = wyjątek, nie stały tenant superadmina)

## Pomocnicze (nie fazy)

- Help `/platform/help`: dopisać strony po PL1 (jak wejść jako wsparcie, jak archiwizować).
- Bootstrap superadmina (`npm run db:bootstrap-superadmin`) bez zmian — lista superadminów w UI **nie** jest w PL0–PL3.

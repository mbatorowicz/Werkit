# Plan hartowania bezpieczeństwa — sesja, logowanie, limity

> **Status:** w toku (2026-09-14). S0–S1 zrobione; S2–S3 otwarte.  
> **Źródło:** audyt podatności (czat „Przegląd podatności Werkit”).  
> **SSOT postępu:** ten plik + [`docs/TECH_DEBT_ROADMAP.md`](../docs/TECH_DEBT_ROADMAP.md) §5 (`P-SEC-*`).  
> **Poza zakresem:** tracker floty 24/7, scalanie magazynów, PM — kontrakt produktu bez zmian ([`AGENTS.md`](../AGENTS.md) §1).

JWT w cookie zostaje. Nie wprowadzamy NextAuth. Cel: **token sam nie wystarcza**, gdy konto albo firma są wyłączone; logowanie i uploady nie dadzą się tanio zalać.

Każda faza jest merdżowalna sama. Kolejność = zależności (S0 odblokowuje spokojne 7-dniowe cookie).

| Faza | Nazwa | Blokuje | Ryzyko wdrożenia |
|------|--------|---------|------------------|
| S0 | Żywy principal przy każdym API/layout | nic | Średnie — extra SELECT user+firma |
| S1 | Logowanie: PIN, enumeracja, limit w Postgres | nic | Średnie — UX PIN-ów w terenie |
| S2 | Limity GPS / zdjęć / `device_logs` | nic | Niskie |
| S3 | Obrona w głąb (geocode, deleteUser, CSP, logout) | S0 (layout spójny z API) | Niskie |

**Świadomie zostaje:** `SameSite=None` + `Secure` na HTTPS (Capacitor WebView na innym originie). CSRF łagodzi wymóg `Content-Type: application/json`. Nie dodajemy tokenów CSRF w S0–S2, dopóki nie pojawi się mutacja GET albo CORS `*`.

---

## S0 — żywy principal (High)

**Problem:** `getAuthSession()` i `proxy.ts` ufają tylko podpisowi JWT (rola, `companyId`, `userId`) przez **7 dni**. Skasowane konto, zmiana roli, `users.isActive=false` albo `companies.isActive=false` **nie zamykają sesji**.

`proxy.ts` zostaje na Edge **bez Drizzle** (jose + cookie). Rewalidacja żyje w Node: helpery sesji + layouty.

### Zrób

1. Nowy helper **`assertLivePrincipal(session)`** w `src/lib/livePrincipal.ts` (albo `src/services/AuthPrincipalService.ts`, jeśli ma czytać DB — wtedy serwis).
   - User istnieje, `isActive === true`.
   - Rola z DB (nie z JWT) — demotion działa od razu.
   - Dla ról firmowych: `users.company_id` zgadza się z JWT **albo** nadpisuje JWT (źródło prawdy = DB).
   - Firma istnieje i `companies.isActive === true` (superadmin bez firmy — pominąć).
   - Porażka → `401` + skasowanie `auth_token` (path `/`).
2. Podpiąć w:
   - `requireCompanyScopedSession` / `requireWorkerCompanySession` (`src/lib/apiTenant.ts`)
   - `requireSuperadminSession` (`src/lib/apiPlatform.ts`) — user aktywny + rola `superadmin` z DB
   - `guardAdminMutation` / `guardDispatchMutation` — po asercji używać **roli z DB**
3. Layouty (`src/app/admin/layout.tsx`, `src/app/worker/layout.tsx`, `src/app/platform/…`): nie tylko `jwtVerify`. Po userze z DB: brak / nieaktywny / zła firma → redirect `/login?reason=session` i delete cookie. Admin layout już woła `getUserById` po imię — tam odrzucić martwe konto zamiast rysować shell.
4. Login (`POST /api/auth/login`): po udanym haśle sprawdzić `companies.isActive` (join albo `PlatformCompanyService.getCompanyById`). Nieaktywna firma = ten sam błąd co złe hasło (patrz S1), **nie** osobny `company_blocked` (enumeracja tenantów).
5. **Nie** skracaj TTL 7d w tej fazie — worker w terenie + biometria. S0 sprawia, że 7d jest akceptowalne.

### Testy

- Unit: principal nieaktywny / skasowany / zła firma / zmiana roli → 401.
- Integracja (`*.int.test.ts`): login → deaktywacja usera lub firmy → następne `GET` API 401.
- Layout: nie renderuje shella dla nieaktywnego usera.

### Kryterium ukończenia

Żadne API firmowe ani layout nie ufa samemu JWT. `proxy.ts` nadal tnie nieautoryzowane ścieżki po roli z tokena (szybki 403); fałszywy „admin” z nieaktualnym JWT odpada na helperze.

### Pliki

`src/lib/apiTenant.ts`, `src/lib/apiPlatform.ts`, `src/lib/requireAdminMutation.ts`, `src/lib/requireDispatchMutation.ts`, `src/app/api/auth/login/route.ts`, layouty admin/worker/platform, nowy serwis/helper, testy.

---

## S1 — logowanie (High)

**Problem:** hasło może być `"1"`; UI sugeruje PIN (`1234`); limit 5/15 min jest `Map` w RAM instancji Vercel; `account_blocked` vs `invalid_credentials` + brak dummy bcrypt przy nieistniejącym userze = enumeracja.

### Zrób

1. **Polityka hasła (API = SSOT):**
   - Minimum **6 znaków** dla każdego konta (worker PIN i admin).
   - Odrzuć trywialne: `123456`, `000000`, `111111`, `1234`, login==hasło.
   - Walidacja w `hashPassword` path: `src/lib/passwordPolicy.ts` + wywołanie z `POST /api/admin/users`, `PUT .../users/[id]`, `POST /api/platform/companies` (admin firmy).
   - Login **nie** zdradza „hasło za słabe” dla istniejących kont.
2. UI: `UserFormFields` — `minLength={6}`, zmień placeholder z `1234`; i18n pl/en/de (`admin.users.passwordHint`).
3. **Jeden kod błędu logowania:** zawsze `invalid_credentials` (401) dla: brak usera, złe hasło, `users.isActive=false`, `companies.isActive=false`. Zostaw `too_many_attempts` (429) i `missing_credentials` (400).
4. **Timing:** jeśli user nie istnieje, `comparePassword` z dummy hashem bcrypt (stała w kodzie, nie z env).
5. **Limit w Postgres** (działa między instancjami Vercel):
   - Tabela `login_attempts` (`key` text PK = `ip + ':' + username`, `count`, `reset_at`).
   - Klucz jak dziś: `x-forwarded-for` pierwszy hop + znormalizowany login.
   - 5 nieudanych / 15 min; sukces → delete wiersza.
   - `src/lib/serverRateLimit.ts` przestaje być źródłem prawdy (może zostać cienkim wrapperem albo zniknąć).
   - Migracja Drizzle + `schema.ts` + `verify_schema_alignment.ts`.
6. Po S0+S1: zablokowane konto **nie loguje się** i **nie korzysta** z ważnego cookie.

### Testy

- Polityka: za krótkie / trywialne → 400 `weak_password` przy tworzeniu/zmianie.
- Login: nieistniejący user vs złe hasło — ten sam status i body; czas porównywalny (test nie musi być timing-safe w CI).
- Rate limit: 6. próba 429; druga instancja procesu widzi ten sam licznik (int. test na żywej DB).

### Kryterium ukończenia

Nie da się utworzyć PIN-u `1234`. Limit logowań przeżywa cold start funkcji. Brak `account_blocked` w odpowiedzi logowania.

### Pliki

`src/lib/passwordPolicy.ts`, `src/lib/serverRateLimit.ts` (lub `src/services/LoginRateLimitService.ts`), `src/db/schema.ts`, `drizzle/*.sql`, `src/app/api/auth/login/route.ts`, users/platform routes, `UserFormFields.tsx`, i18n, testy.

---

## S2 — limity nadużyć (Medium)

**Problem:** `POST /api/worker/gps` wstawia całą tablicę; zdjęcie base64 bez limitu bajtów i z MIME od klienta; `POST /api/worker/logs` bez throttlingu.

### Zrób

1. **GPS** (`GpsService.saveGpsLogs`):
   - Max **200 punktów** na request (nadmiar → 400 `payload_too_large`, nic nie zapisuj).
   - `lat` ∈ [-90, 90], `lng` ∈ [-180, 180], skończone liczby.
   - `timestamp` odrzuć jeśli poza oknem np. −24 h … +5 min względem `now` (albo clamp do `now`).
2. **Zdjęcia** (`uploadPhotoBase64`):
   - Max zdekodowane **4 MiB**.
   - Allowlista MIME: `image/jpeg`, `image/png`, `image/webp` (bez SVG).
   - Opcjonalnie: magic bytes (`FF D8` / PNG / RIFF WEBP) — jeśli tanio, w tej samej fazie.
3. **Logi urządzenia:**
   - Przytnij `message` jak dziś; dodatkowo limit np. **30 INSERT / min / user** (ta sama tabela co login albo `device_log_rate`).
   - Prostszy wariant bez nowej tabeli: sliding window w `login_attempts` z prefiksem `logs:` — tylko jeśli nie zaciemni S1; inaczej osobna kolumna `kind`.
4. Notatki sesji: twardy max długości (np. 4000 znaków) w `WorkerSessionService.addNote` / `updateNote`.

### Testy

- GPS: 201 punktów → błąd; `lat: 999` odfiltrowane/odrzucone.
- Foto: za duży string / `image/svg` → `invalid_photo_data`.
- Logi: 31. request w minucie → 429.

### Kryterium ukończenia

Worker nie zapełni `gps_logs` / Blob / `device_logs` jednym requestem.

### Pliki

`src/services/GpsService.ts`, `src/app/api/worker/gps/route.ts`, `src/lib/photoUpload.ts`, `src/app/api/worker/logs/route.ts`, `src/services/WorkerSessionService.ts`, testy istniejących serwisów.

---

## S3 — obrona w głąb (Medium / Low)

Robić **po** S0, żeby layout i API mówiły tym samym językiem sesji.

| # | Temat | Działanie |
|---|--------|-----------|
| 1 | `GET /api/geocode` | `requireCompanyScopedSession()` w handlerze (nie tylko `proxy.ts`). Limit: np. 30/min/firmę. |
| 2 | `deleteUser` | Nie wolno usunąć `userId === actorId`. Nie wolno usunąć ostatniego `role=admin` w firmie. 409 `cannot_delete_self` / `last_admin`. |
| 3 | Logout | `cookies.delete` z tymi samymi atrybutami co set: `path: "/"`, `secure`, `sameSite` — inaczej WebView zostawia sesję. |
| 4 | CSP | `Content-Security-Policy` w `next.config.ts` `headers()`. Start: `default-src 'self'`; `img-src` self + blob + `*.tile.openstreetmap.org` + Vercel Blob; `connect-src` self + Nominatim/OSRM/Blob; `script-src 'self'` (+ `'unsafe-inline'` tylko jeśli bez tego padnie Leaflet — wtedy udokumentuj wyjątek). Najpierw środowisko preview, potem produkcja. |
| 5 | `X-Forwarded-For` | Na Vercel zostaje pierwszy hop. W komentarzu `serverRateLimit`: poza Vercel nagłówek jest spoofowalny — nie budować na nim autoryzacji. |

### Testy

- Geocode bez cookie → 401 nawet przy mocku proxy.
- deleteUser: self i last admin.
- Logout: Set-Cookie Max-Age=0 z `Path=/`.

### Kryterium ukończenia

Brak handlera API, który polega wyłącznie na Edge. Panel nie pozwala wyciąć ostatniego admina. CSP nie psuje mapy (Leaflet + OSRM) ani zdjęć sesji.

---

## Kolejność wdrożenia

1. **S0** na `main` jako pierwszy PR — zamyka High „martwy JWT”.
2. **S1** zaraz potem (migracja `login_attempts` + polityka PIN).
3. **S2** może iść równolegle z S1 (brak zależności schematu, chyba że wspólna tabela limitów — wtedy po S1).
4. **S3** na końcu (CSP najłatwiej zepsuć UI).

Weryfikacja każdej fazy: `npm run lint`, `npx tsc --noEmit`, `npm test`; przy migracji S1: `npm run db:migrate:pg` + `npm run db:verify-schema`.

## Świadomie nie w tym programie

- Redis/Upstash (Postgres wystarczy na login + logi).
- Token CSRF (JSON + same-origin fetch; wrócić, jeśli pojawi się CORS albo mutujący GET).
- Rotacja JWT / refresh token / lista `jti` — zbędne po S0, o ile TTL zostaje 7d.
- Wymuszanie resetu wszystkich istniejących słabych PIN-ów przy logowaniu (osobna decyzja produktu; S1 tnie tylko **nowe** i zmianę hasła).

## Checklista

- [x] **S0** — `assertLivePrincipal` w API + layoutach; login honoruje `companies.isActive`
- [x] **S1** — polityka 6+ znaków; jeden 401; dummy bcrypt; limit w Postgres
- [ ] **S2** — GPS cap + bbox; foto 4 MiB + allowlista; throttle logów
- [ ] **S3** — geocode auth; deleteUser; logout cookie; CSP
- [x] SYSTEM_MAP § auth (cookie, kody logowania, brak `account_blocked` na loginie)
- [x] i18n: `weak_password`, hint PIN (`admin.workers.passwordHint`), `too_many_attempts`
- [ ] i18n: błędy deleteUser (S3)

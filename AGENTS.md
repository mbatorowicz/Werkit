# Werkit — przewodnik dla agentów AI i deweloperów

Ten dokument jest **operacyjnym SSOT** (single source of truth) dla każdego, kto modyfikuje kod Werkit — w tym agentów AI. Ma pierwszeństwo przed „domysłami z sieci”: najpierw tu sprawdzasz fakty o repo, potem dopisujesz kod.

**Towarzyszy mu:**

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — głębszy opis warstw, modułów i długu technicznego.
- [`docs/SYSTEM_MAP.md`](./docs/SYSTEM_MAP.md) — **brutalna inwentaryzacja**: wszystkie tabele DB z kolumnami, wszystkie endpointy API z metodą i serwisem za nimi, wszystkie hooki, sloty `i18n`, status migracji na produkcji, częste pułapki i debug-recipes. **Czytaj zanim ruszysz większą zmianę.**

---

## 1. Produkt i stawka błędu

Werkit to **system logistyczny dla floty** (PWA + Capacitor). Błąd w sesji pracy, zleceniu lub GPS może realnie zatrzymać lub zmąc wybrane procesy w terenie. Zanim zmienisz API odpowiedzi, typ tablicy → obiekt, lub pole bazy — **przejrzyj call-site’y i serwisy**.

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
| Wersja aplikacji | Z [`package.json`](./package.json) (np. `1.8.x`). |

---

## 3. Mapa katalogów (gdzie co żyje)

```
src/
├── app/                    # Trasy Next (pages, layouts), Route Handlers api/**/route.ts
├── features/worker/        # Moduł aplikacji pracownika (komponenty, hooki, lib prezentacji zleceń)
│   ├── components/         # m.in. WizardClient, PendingOrdersList, ActiveSessionDashboard, Modals
│   ├── hooks/              # useWorkerActions, useWorkerGPS, useWorkerNotifications
│   └── lib/                # workOrderPresentation, workOrderPriority (normalizacja priorytetu)
├── components/
│   ├── work-orders/        # UI **współdzielony** worker ↔ admin (WorkOrderPriorityRibbon, WorkOrderSummaryLines)
│   ├── Admin/, Map/, GanttChart/, …
├── services/               # Warstwa domenowa + Drizzle — preferowane miejsce na zapytania DB
├── db/                     # Klient DB + schema Drizzle
├── types/                  # Kontrakty TS dla worker / admin / wizard
├── i18n/                   # locales/pl.ts, locales/en.ts, types.ts, format.ts, constants.ts (DEFAULT_UI_LOCALE)
├── lib/                    # auth, gpsManager, remoteLogger, helpers bez UI
└── middleware.ts           # Strażnik JWT i ról (nazwa pliku musi pozostać middleware.ts)
```

Routing worker nadal w **`src/app/worker/**`** — komponenty biznesowe są **importowane** z `@/features/worker/...`.

---

## 4. Twarde zasady (checklista przed merge)

1. **Tablice z API** — zanim wywołasz `.map()` / `.filter()` na odpowiedzi `fetch`, sprawdź **`Array.isArray(data)`** (albo bezpieczny fallback `[]`). Błąd 500 może zwrócić obiekt → crash na mobilce.
2. **`any`** — nie dodawaj. Nieznane JSON → zwężanie przez **type guards** / jawne typy / walidację.
3. **Priorytet zlecenia** — wartości domenowe: `URGENT` \| `HIGH` \| `NORMAL` \| `LOW`. Normalizacja po stronie serwera tam, gdzie już jest (`normalizeWorkOrderPriority`). W bazie egzekwuje to migracja **CHECK** `work_orders_priority_chk` (patrz `drizzle/`).
4. **Nowy kod DB** — **wyłącznie `src/services/`** (Drizzle); **`src/app/`** nie importuje `@/db` / `@/db/schema`. Szczegóły: **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**.
5. **Teksty UI** — stringi widoczne dla użytkownika przez **`getDictionary()`** / sloty `worker.client`, `admin.*`, `apiErrors`. Placeholdery `{klucz}` przez **`formatDict`**. Domyślny locale formatów dat: **`DEFAULT_UI_LOCALE`** (`src/i18n/constants.ts`), dopóki nie ma wyboru języka użytkownika.
6. **Middleware** — musi pozostać plik **`src/middleware.ts`** z eksportem `middleware`. Next 16 może ostrzegać o deprecacji konwencji „middleware” na rzecz „proxy” — **nie zmieniaj nazwy pliku bez świadomej migracji dokumentacji Vercel**, bo wyłączysz ochronę tras.

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

---

## 7. Mobilność, GPS, tło

- **`setInterval` / `setTimeout`** na frontcie **nie są niezawodne** przy zablokowanym ekranie.
- Bufforowanie GPS / wysyłka na backend: **fetch od razu**, **`keepalive: true`** tam, gdzie już przyjęto ten wzorzec — nie polegaj na „kolejce co N sekund” w JS w tle.
- **Hardware back (Android):** używaj **`CapacitorBackButton`** z layoutów — nie rozrzucaj własnych listenerów `backButton`.

---

## 8. Logowanie zdalne

Krytyczne zdarzenia po stronie worker/PWA: **`sendRemoteLog`** → **`/api/worker/logs`** → tabela **`device_logs`**, przegląd w **`/admin/logs`**.

---

## 9. Migracje i produkcja

- Zmiana **`schema.ts`** wymaga **skryptu migracji** w `drizzle/` + aktualizacji **`drizzle/meta/_journal.json`** (jeśli dodajesz ręcznie) albo wygenerowania przez **`drizzle-kit`** zgodnie z workflow zespołu.
- **Wdrożenie na Vercel:** migracja musi zostać **uruchomiona na bazie produkcyjnej** zgodnie z procedurą firmy (jedna pusta migracja lub duplikat constraintta na DB = błąd operacyjny — sprawdzaj idempotentność).

---

## 10. Workflow zmian (produktywny minimalizm)

1. **Zrozum kontekst** — typy, serwis, istniejący kontrakt API i mobilki.
2. **Minimalny diff** — nie refaktoryzuj „przy okazji” całych modułów bez prośby.
3. **Bez debug `console.log`** w kodzie produkcyjnym (wyjątek: krótkotrwały debug za zgodą).
4. Pełna refaktoryzacja na żądanie: **SOLID, DRY**, ale nadal zgodnie z architekturą modułów.

---

## 11. Kiedy czytać ARCHITECTURE.md

Przed większymi zmianami w: **API admin/worker**, **sesjach**, **zleceniach**, **mapie**, **schemacie DB**, **middleware**. Tam są: diagram przepływu, **lista serwisów** i konwencja „app bez Drizzle”.

---

*Ostatnia zsynchronizowana z codebase struktura: moduł `features/worker`, `components/work-orders`, i18n `locales/`, constraint priorytetu zleceń w migracji Drizzle. Jeśli coś tu przestaje pasować do kodu — **aktualizuj ten plik w tym samym PR** co zmianę struktury.*

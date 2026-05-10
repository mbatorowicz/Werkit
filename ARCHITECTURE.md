# Architektura Systemu Werkit

Ten dokument opisuje docelowy stan architektury wprowadzony na przełomie wersji v1.6.5/v1.6.6 po pełnej refaktoryzacji. Przestrzeganie tych zasad jest **krytyczne** do zachowania stabilności, skalowalności i przejrzystości projektu. Jeśli piszesz lub edytujesz kod, musisz stosować się do poniższych wzorców.

---

## 1. Warstwowa Architektura (Serwisy i Kontrolery)

Aplikacja przeszła z wzorca "monolitycznych Route Handlers" do wzorca wielowarstwowego, by wyizolować logikę biznesową od warstwy prezentacji (UI) i obsługi żądań HTTP (Routing/Controllers).

### A. Kontrolery (`src/app/api/.../route.ts` oraz Server Components w `page.tsx`)
Ich jedynym zadaniem jest:
1. Sprawdzenie autoryzacji (jeśli nie załatwia tego Middleware),
2. Walidacja wejścia (odczytanie parametrów zapytania/ciała),
3. **Delegacja logiki do Serwisu**,
4. Zwrócenie sformatowanej odpowiedzi (JSON dla API lub JSX dla Server Components).

**Absolutnie zakazane jest**:
- Importowanie schematów Drizzle (`import { ... } from '@/db/schema'`) do pliku z kontrolerem w celu pisania surowych zapytań `db.select()`.

### B. Serwisy (`src/services/`)
Zasady działania:
- Katalog `src/services/` to jedyne miejsce, w którym operujemy bezpośrednio na ORM (Drizzle) i bazie danych (z wyjątkami autoryzacji `NextAuth`/logowania, gdzie może to być tymczasowo dopuszczone, chociaż zaleca się bycie konsekwentnym).
- Zawierają klasy narzędziowe (często eksportowane instancje wzorca Singleton) posiadające asynchroniczne metody ułożone domenowo, np.: `WorkerOrderService`, `WorkerSessionService`, `AdminSessionService`, `AdminUserService`, `DictionaryService`, `SystemLogService`.
- **Ważne:** To Serwisy są "Single Source of Truth" dla złożonych zapytań SQL (`JOIN`, podzapytania, mapowanie na obiekty Domenowe). Jeśli aplikacja webowa (Admin) i mobilna (Worker) potrzebują listy zleceń – korzystają z tej samej metody z Serwisu.

---

## 2. Rygorystyczny TypeScript (Zakaz `any`)

Od refaktoryzacji całkowicie porzucono leniwe typowanie oparte na `any`, które wywoływało ukryte crashe podczas uruchamiania się skompilowanej aplikacji na telefonach (gdzie występuje zjawisko usypiania procesów).

### Obiekty Domenowe (Single Source of Truth)
Wszystkie interfejsy zdefiniowane są w katalogu `src/types/` (głównie `src/types/worker.ts` dla modułu pracownika i `src/types/admin.ts` dla zaplecza).
- Jeśli komponent UI potrzebuje struktury danych (np. Zlecenie), **musi** importować `WorkOrder` z `src/types/`.
- Jeśli brakuje w nim danego pola z bazy – aktualizujesz najpierw definicję w `src/types/`, a następnie mapowania w Serwisie i komponencie.
- Zabronione jest definiowanie skomplikowanych anonimowych typów *in-line* we właściwościach komponentu (`interface Props { data: { id: number, field: string ... }[] }`). Należy użyć typu Domenowego.

### Mapowanie Dat i Pol Nullable
Obiekty zwracane z bazy przez Drizzle ORM posiadają oryginalne instancje klasy `Date` i nierzadko są typem `Nullable` (dzięki strukturom relacyjnym bazy). Kiedy Server Component wstrzykuje dane (przez Props) do Client Componentu, musi nastąpić jawna transformacja dat (`.toISOString()`) oraz sparsowanie liczb (np. mapowanie Decimal do Float), tak by typ obiektu pasował *idealnie* w ujęciu zgodności z `InitialWorkerData` (bądź innym wymaganym Propsem).

---

## 3. Komponenty UI (Zasada SRP / DRY)

Wielkie struktury (>300 linii) takie jak `WorkerClient.tsx` przestały pełnić rolę "boskich komponentów" (God-components).

1. **Kompozycja**: Używaj wzorca "Prezentacja kontra Stan".
2. Jeśli strona Worker-a posiada skomplikowaną listę Aktywnych zleceń i dashboard z Mapą, ekstrakcja tych części do pod-komponentów (np. `ActiveSessionDashboard.tsx`, `PendingOrdersList.tsx` umieszczonych w `src/components/Worker/`) jest obowiązkowa.
3. Props drilling musi być zastąpiony przekazywaniem obiektów Domenowych. 

### Mobilność i Performance UI
- Projekt to rozwiązanie wielośrodowiskowe (PWA/Capacitor). Animacje muszą opierać się na CSS (TailwindCSS i `animate-in` itd.) – nie pisz ciężkich pętli obciążających wątek JS-u.
- Przestrzegaj palety `zinc` i `emerald` wg. głównych definicji projektu.
- Pamiętaj, że w systemach iOS/Android przy zgaszonym ekranie funkcja `setTimeout/setInterval` na komponencie UI praktycznie przestaje działać. Przewiduj, że użytkownik może zgasić ekran telefonu w najmniej spodziewanym momencie.

## 4. Aplikacja Mobilna (Capacitor PWA)

Werkit jest aplikacją internetową, która w systemie Android działa jako "Web View" (dzięki Capacitorowi).
1. **Przycisk Wstecz (Hardware Back Button)**: Aby zapobiec wychodzeniu z aplikacji w losowych momentach przez sprzętowy przycisk powrotu w Androidzie, zaimplementowano scentralizowany strażnik `<CapacitorBackButton />` w layoutach. Nie twórz własnych, rozrzuconych event listenerów na zdarzenie `backButton`.
2. **Zdalne Logowanie (Remote Logging)**: Debugowanie natywnych wtyczek (np. Background Geolocation) bywa trudne. Projekt wykorzystuje tabelę `deviceLogs` w bazie Drizzle. Każdy krytyczny proces w PWA (lub łapany błąd) powinien wysłać log za pomocą asynchronicznego żądania POST (`sendRemoteLog`) do endpointu `/api/worker/logs`. Te logi są agregowane w zakładce `/admin/logs` dla administratora.

---

## 5. Next.js 15 (Specyfika Routingu)

Wersja Next.js 15+ wprowadza rygorystyczne wymagania dotyczące dynamicznych segmentów trasy (np. folderów typu `[id]`).
1. **Asynchroniczne parametry (`params` i `searchParams`)**: W **każdym** komponencie Server Component oraz kontrolerze tras (Route Handler), własność `params` **musi być potraktowana jako Promise**. 
2. **Nigdy nie rób `parseInt(params.id)` bez await**. Zawsze destrukturyzuj i oczekuj:
   ```ts
   // BŁĄD (prowadzi do 404 lub crashy)
   export default function Page({ params }: { params: { id: string } }) {
       const id = params.id; 
   }

   // POPRAWNIE
   export default async function Page({ params }: { params: Promise<{ id: string }> }) {
       const resolvedParams = await params;
       const id = resolvedParams.id;
   }
   ```

---

**Jeśli jako AI Agent masz wątpliwości jak zaprogramować daną funkcję w tym repozytorium, najpierw:**
1. Sprawdź, czy istnieje już do tego gotowy Serwis.
2. Sprawdź, czy istnieje Typ Domenowy w `src/types/`.
3. Skonsultuj z użytkownikiem zmiany naruszające obecną architekturę przed nadpisaniem wielu plików bazowych.

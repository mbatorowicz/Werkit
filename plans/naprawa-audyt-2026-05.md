# Plan naprawczy — audyt Werkit 2026-05

**Data:** 2026-05-25
**Źródło:** [`plans/audyt-werkit-2026-05.md`](plans/audyt-werkit-2026-05.md)
**Lint output:** [`lint_output.txt`](lint_output.txt) — 177 problemów (3 błędy, 174 ostrzeżenia)

---

## Priorytety

| Priorytet | Opis | Liczba zadań |
|-----------|------|-------------|
| 🔴 Pilne | Błędy krytyczne (bezpieczeństwo, runtime) | 3 |
| 🟡 Zalecane | Jakość kodu, czystość, maintainability | 4 |
| 🟢 Opcjonalne | Drobne poprawki, best practices | 4 |

---

## 🔴 P1: JWT_SECRET fallback

**Plik:** [`src/lib/auth.ts`](src/lib/auth.ts:4)

**Problem:** Linia 7 zawiera `'super-secret-fallback'` — jeśli zmienna `JWT_SECRET` nie jest ustawiona, serwis używa zakodowanego na sztywno sekretu. Każdy kto zna kod może podpisać ważny token JWT.

**Rozwiązanie:** Usunąć fallback string, rzucić `Error` jeśli `JWT_SECRET` jest undefined/null.

```typescript
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return new TextEncoder().encode(secret);
};
```

---

## 🔴 P2: `Date.now()` w useEffect

**Plik:** [`src/components/Admin/Orders/OrdersDispatchTable.tsx`](src/components/Admin/Orders/OrdersDispatchTable.tsx:78)

**Problem:** `useEffect(() => { setLiveClockMs(Date.now()); ... }, [])` — ESLint `react-hooks/set-state-in-effect` ostrzega, że setState w efekcie bez zależności to antypattern.

**Rozwiązanie:** Użyć inicjalizatora `useState` zamiast efektu do wartości początkowej.

```typescript
const [liveClockMs, setLiveClockMs] = useState<number>(() => Date.now());
useEffect(() => {
  const id = setInterval(() => setLiveClockMs(Date.now()), 30_000);
  return () => clearInterval(id);
}, []);
```

---

## 🔴 P3: `any` types w API routes

**Pliki:** ~30+ plików w [`src/app/api/`](src/app/api/)

**Problem:** Wiele handlerów API używa `any` dla pól body, np. [`src/app/api/admin/work-orders/route.ts`](src/app/api/admin/work-orders/route.ts:19):
```typescript
const body = await parseJsonBody(request);
// body.userId, body.resourceId — wszystkie `any`
```

**Rozwiązanie:** Dla każdego endpointu zdefiniować interfejs body i użyć `parseJsonBody<T>()` lub type guard.

---

## 🟡 P4: `setState` w `useEffect` bez zależności

**Pliki do naprawy:**

| Plik | Linia |
|------|-------|
| `src/features/admin/customers/CustomersClient.tsx` | 43 |
| `src/features/admin/machines/MachinesClient.tsx` | 58 |
| `src/features/admin/materials/MaterialsClient.tsx` | 37 |
| `src/features/admin/orders/OrdersClient.tsx` | 65 |
| `src/features/admin/workers/WorkersClient.tsx` | 41 |
| `src/features/worker/WorkerClient.tsx` | 198, 242 |
| `src/components/ThemeToggle.tsx` | 12 |
| `src/components/Admin/SessionDetailsModal.tsx` | 22 |

**Rozwiązanie:** Dodać brakujące zależności do tablicy `[]` w useEffect lub przenieść logikę do inicjalizatora useState.

---

## 🟡 P5: Nieużywane importy (lucide-react)

**Pliki:**
- `src/app/admin/layout.tsx`
- `src/features/admin/machines/MachinesClient.tsx`
- `src/features/worker/WorkerClient.tsx`
- `src/app/worker/help/page.tsx`
- `src/app/worker/history/page.tsx`
- `src/app/worker/layout.tsx`
- `src/app/worker/profile/page.tsx`
- `src/components/Admin/AdminSidebarNav.tsx`
- `src/components/Admin/MobileAdminNav.tsx`

**Rozwiązanie:** Usunąć nieużywane importy z lucide-react.

---

## 🟡 P6: Nieużywane parametry w catch blockach

**Problem:** W ~30+ API route handlerach parametry `err`, `e`, `index` są zadeklarowane ale nieużywane.

**Rozwiązanie:** Prefiksować nieużywane parametry podkreślnikiem (`_err`, `_e`, `_index`) lub usunąć parametr catch jeśli nie jest potrzebny.

---

## 🟡 P7: Nieużywany `request`

**Pliki:**
- `src/app/api/auth/logout/route.ts` — handler nie przyjmuje `request`, OK
- `src/app/api/worker/session/route.ts` — handler ma `request` ale go nie używa

**Rozwiązanie:** Prefiksować `_request` lub usunąć parametr.

---

## 🟢 P8: `<img>` → `next/image`

**Plik:** `src/components/Admin/SessionDetailsModal.tsx` (linia 111)

**Rozwiązanie:** Zastąpić `<img>` komponentem `next/image`.

---

## 🟢 P9: Unescaped entities

**Plik:** `src/features/worker/components/wizard/WizardClient.tsx` (linia 133)

**Rozwiązanie:** Użyć `&rsquo;` lub `{'\u2019'}` zamiast `'`.

---

## 🟢 P10: Brakujące zależności useEffect

**Plik:** `src/components/Map/LiveMap.tsx` (linia 98)

**Rozwiązanie:** Dodać brakujące zależności do tablicy useEffect.

---

## 🟢 P11: `require()` w migrate.js

**Plik:** `migrate.js` (linie 1-2)

**Rozwiązanie:** Konwersja `require()` na `import` (jeśli skrypt nadal używany).

---

## Weryfikacja końcowa

Po wszystkich zmianach:
1. `npm run lint` — 0 błędów
2. `npx tsc --noEmit` — 0 błędów TypeScript
3. `npm run build` — build przechodzi

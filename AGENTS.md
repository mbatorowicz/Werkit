# Wymagania i Zasady Kodowania (AI Agent)

Ten plik służy jako Główne Źródło Prawdy (SSOT) dla każdego agenta AI (w tym Antigravity) pracującego nad projektem Werkit. Zawsze bezwzględnie przestrzegaj poniższych zasad.

## Architektura i Technologia
- **Framework**: Next.js (App Router). Używaj React Server Components domyślnie. Dodawaj `"use client"` tylko dla komponentów posiadających stan lub wywołujących efekty/event listenery.
- **Baza danych**: Vercel Postgres połączony z Drizzle ORM. Główne źródło schematu: `src/db/schema.ts`.
- **Mobilność**: Aplikacja to rozwiązanie PWA + Capacitor. Pamiętaj, że natywny system (Android/iOS) usypia wątki JavaScript w tle. Optymalizuj kod pod kątem wygaszonego ekranu.
- **Design System**: Tailwind CSS. Interfejsy muszą być zjawiskowe, animowane, spójne, wykorzystujące paletę "zinc" i "emerald", bez obcych i niespójnych stylów. 

## Best Practices (Czysty Kod i Bezpieczeństwo)
1. **Defensive Programming (Programowanie Defensywne)**: 
   - Aplikacja mobilna często działa w ruchu, przy słabym internecie (np. EDGE/3G). 
   - Każde odpytanie API musi mieć zabezpieczenie typu fallback. 
   - Zanim użyjesz metody tablicowej `.map()`, bezwzględnie weryfikuj `Array.isArray(data)`. Serwer w razie błędu 500 może zwrócić obiekt JSON, co spowoduje crash aplikacji mobilnej!
2. **Uprawnienia i Strażnik (Middleware / Proxy)**: 
   - Aplikacja realizuje "wzorzec proxy" do blokowania i weryfikacji tokenów JWT dla wszystkich zapytań.
   - UWAGA: Silnik Next.js 15 wymaga absolutnie i na sztywno, aby ten strażnik nazywał się `src/middleware.ts` i eksportował funkcję `export async function middleware`. Próba zmiany nazwy pliku na `proxy.ts` lub nazwy funkcji spowoduje, że Next.js zignoruje zabezpieczenia (całe API stanie się otwarte dla każdego). Trzymamy się konwencji systemowej Next.js, realizując nią założenia logiki proxy.
   - Jeśli dodajesz publiczne / współdzielone endpointy (dla maszyn, klientów itp.), dodawaj je wyraźnie do reguły `isSharedApi` w `middleware.ts`.
3. **Synchronizacja Bazy Danych**: 
   - Zmiany w modelu Drizzle (`schema.ts`) muszą mieć odzwierciedlenie we wdrożeniu na Vercel (produkcyjnej bazie). 
   - Unikaj "ścisłych" `leftJoin` wyciągających bardzo konkretne nowe pola bez pewności, że migracja była wypchnięta. Używaj spread operatorów lub pobieraj cały wiersz.
4. **Logika GPS i Background Tasks**: 
   - Funkcje typu `setInterval` i `setTimeout` w przeglądarkach ulegają zamrożeniu (throttling) na zablokowanym telefonie. 
   - Zbieranie danych o lokalizacji (BackgroundGeolocation) musi wywoływać metody Fetch od razu, z flagą `keepalive: true` lub natychmiastowym opróżnieniem bufora. Nie polegaj na wewnętrznym "sztucznym" kolejkowniku opartym o czas na froncie.

## Workflow Zmian
1. **Zrozum zanim zmienisz**: Zanim usuniesz plik lub pole, sprawdź pełen kontekst. Zmiana jednej litery lub zmiana API z tablicy na obiekt potrafi zatrzymać wszystkie ciężarówki w firmie.
2. **Clean Code**: Nie zostawiaj testowych logów `console.log()` w finalnej wersji produkcyjnej, chyba że do krytycznego debugowania.
3. **Zawsze Refaktoryzuj Poważnie**: Kiedy dostajesz polecenie "Zrób pełną refaktoryzację", zoptymalizuj strukturę pod kątem SOLID i DRY.

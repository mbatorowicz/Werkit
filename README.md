# Werkit ERP (Margaz) - Product Requirements Document (PRD) & Dokumentacja Techniczna

Werkit to dedykowany system ERP typu "Fleet & Field Management", zbudowany w celu optymalizacji logistyki, śledzenia zasobów (GPS) i zarządzania czasem pracy operatorów maszyn ciężkich oraz floty transportowej (dedykowany m.in. dla firmy "Margaz"). 

Aplikacja składa się z dwóch głównych środowisk:
1. **Admin Panel** (Desktop Web) – zaawansowany dashboard dla dyspozytorów i menadżerów.
2. **Worker PWA** (Mobile/Android) – minimalistyczna, optymalizowana pod kątem wydajności bateria/zasoby aplikacja robocza wspierana przez natywne moduły (Capacitor).

---

## 📖 Spis Treści
1. [Funkcjonalności i Wymagania Biznesowe (PRD)](#1-funkcjonalności-i-wymagania-biznesowe-prd)
2. [Stack Technologiczny](#2-stack-technologiczny)
3. [Uruchamianie Projektu](#3-uruchamianie-projektu)
4. [Architektura Systemu](#4-architektura-systemu)
5. [Skrypty i Migracje bazy danych](#5-skrypty-i-migracje-bazy-danych)

---

## 1. Funkcjonalności i Wymagania Biznesowe (PRD)

### Panel Administratora (Web / Dispatcher)
Główne operacje biznesowe wykonywane przez administratorów logistyki:
- **Dyspozytornia (Gantt Chart & Map)**: Zarządzanie flotą na żywo z osią czasu. Administratorzy widzą aktualny status sprzętu oraz podgląd GPS u operatorów w trybie aktywnym.
- **Zlecenia i Sesje (Work Orders / Sessions)**: Tworzenie zadań dla pracowników typu: Transport Kruszywa, Praca Maszyną lub Warsztat. 
- **Baza Wiedzy (CRUD)**: Definiowanie zasobów firmy: Maszyn (Flota), Materiałów (Asortyment), Pracowników i Kontrahentów (Klientów).
- **Raportowanie**: Zestawienia ton/godzin i rozliczenia operatorów maszyn w wybranym przedziale czasowym.
- **Logi (System Zdrowia)**: Scentralizowane zdalne strumieniowanie błędów z urządzeń klienckich (Capacitor Remote Logs).

### Aplikacja Operatora (PWA / Mobile)
Aplikacja zaprojektowana w ujęciu "Offline / Low-battery first":
- **Wizard Rozpoczęcia Pracy**: Prosty kreator wyboru maszyny, rodzaju pracy oraz kruszywa, uruchamiający aktywną sesję u pracownika.
- **Śledzenie GPS w tle**: Użycie natywnych wtyczek (BackgroundGeolocation), agregujące koordynaty co X dystansu/czasu, które pozwalają generować wyrysowane ścieżki przejazdu operatora.
- **Zarządzanie Zleceniami na Żywo**: Akceptacja zadań od dyspozytora. 
- **Zdarzenia**: Przesyłanie notatek z budowy / napraw warsztatowych oraz fotografowanie (dowody wykonania, uszkodzenia).

---

## 2. Stack Technologiczny

System został zbudowany z zachowaniem restrykcyjnych standardów czystego kodu:
- **Framework Core**: [Next.js 15 (App Router)](https://nextjs.org) (React Server Components domyślnie).
- **Język i Bezpieczeństwo**: Strict TypeScript (całkowity zakaz rzutowania `any`).
- **Stylizacja**: Tailwind CSS (tryb Ciemny/Jasny, palety Zinc & Emerald).
- **Baza Danych ORM**: [Drizzle ORM](https://orm.drizzle.team) połączony z Vercel Postgres / PostgreSQL. Zmiany schematów leżą w `src/db/schema.ts`.
- **Mobilność**: [Capacitor](https://capacitorjs.com) (PWA to Web View na Android/iOS).
- **Zarządzanie Stanem / Komponenty**: React Hooks (`useWorkerGPS`, `useWorkerNotifications`), Lucide-React (ikony).

---

## 3. Uruchamianie Projektu

### Wymagania wstępne:
- Node.js >= 18
- Środowisko bazodanowe PostgreSQL (np. Vercel Postgres, Docker, lokalny Postgres). Zdefiniowane w pliku `.env.local` jako `POSTGRES_URL`.

### Instalacja i uruchamianie deweloperskie:

```bash
# 1. Instalacja zależności
npm install

# 2. Synchronizacja bazy danych (Drizzle)
npm run db:push     # "Wypycha" schematy TypeScript z pliku db/schema.ts wprost do schematu Bazy Postgres
npm run db:studio   # (Opcjonalnie) Uruchamia lokalnego Drizzle Studio (Baza danych w GUI webowym)

# 3. Uruchomienie deweloperskie
npm run dev
```

Platforma będzie dostępna pod [http://localhost:3000](http://localhost:3000).

### Budowa Produkcyjna (PWA):
Aby wypuścić wersję mobilną na Androida (Capacitor) należy użyć przygotowanego `npx cap sync`.

---

## 4. Architektura Systemu

Każdy programista wchodzący w skład zespołu projektu Werkit jest zobowiązany do zapoznania się z plikami:
1. `AGENTS.md` – Krótkie zasady pracy i konwencje Clean Code nałożone w tym systemie.
2. `ARCHITECTURE.md` – Zaawansowane omówienie warstw i architektury SOLID (Rozdział m.in. o serwisach w `src/services/` zdejmujących balast z Route Handlerów).

System wdraża rygorystyczny "Defensive Programming". Typy (TypeScript), modele ORM i formularze są "Single Source of Truth", a `any` pozostaje zakazane na poziomie lintera/build process-u.

---

## 5. Ważne Zastrzeżenia / Gotchas (Wiedza dla Deweloperów)

- **Next.js 15 Async Params**: Parametry routingu (`params.id` / `searchParams`) są asynchronicznymi obietnicami. Zawsze używaj `await params;`.
- **Zdalne Logi Mobilne**: Nigdy nie polegaj na samej konsoli Chrome/Safari (DevTools) podczas testowania logiki dla operatorów mobilnych. Wykorzystuj stworzony ekosystem logowania: wywołanie funkcji `sendRemoteLog('ERROR', 'Msg', err)` spowoduje, że błąd poleci prosto do dyspozytorni w przeglądarce (`/admin/logs`). Uratuje ci to życie, ponieważ wtyczki Capacitor/GPS wykazują inne zachowania uśpionego na Androidzie ekranu.
- **Katalog `src/services/`**: Logika biznesowa nie leży w komponencie interfejsu użytkownika (`page.tsx`) ani w trasie API. Komponenty/API jedynie delegują obsługę zdarzeń klasom `AdminOrderService` lub `WorkerSessionService`.

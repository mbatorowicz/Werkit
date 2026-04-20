[SYSTEM PROMPT / PRD]: System Proof of Work (PoW) & PoD "Werkit" dla wewnętrznej floty
1. KONTEKST PROJEKTU I ARCHITEKTURA
Zbuduj kompleksowy system logistyczny "Werkit" do śledzenia czasu pracy, tras i dokumentacji zdjęciowej dla małej firmy transportowo-budowlanej z własnym warszatem.
Aplikacja ma architekturę dwuczęściową:

Aplikacja Mobilna (Pracownicy): Zbudowana we Flutterze, przeznaczona wyłącznie do wewnętrznej dystrybucji na system Android (plik .apk instalowany przez sideloading, omijamy Google Play). Wymaga uprawnień do GPS w tle, aparatu i biometrii.

Panel Admina (Szef): Prywatna aplikacja webowa do zarządzania i podglądu na żywo.

Infrastruktura (Backend): Pełny ekosystem Vercel (Serverless Functions API, Vercel Postgres z PostGIS, Vercel Blob).

2. STOS TECHNOLOGICZNY (STACK)

Mobile: Flutter (najnowsza stabilna wersja), flutter_secure_storage, local_auth (biometria), pakiet geolokalizacyjny do pracy w tle.

Web/Admin: Next.js (App Router, React), Tailwind CSS.

Backend API: Vercel Serverless Functions (TypeScript).

Baza Danych: Vercel Postgres (z rozszerzeniem przestrzennym PostGIS).

Storage: Vercel Blob.

Bezpieczeństwo: JWT (JSON Web Tokens), Argon2/Bcrypt, rygorystyczna walidacja po stronie serwera (Zod).

3. STRUKTURA BAZY DANYCH (Schemat relacyjny z obsługą dynamicznych formularzy)
Wszystkie tabele muszą znajdować się w jednej bazie PostgreSQL.

users: id, full_name, username_email, password_hash, role (worker/admin), device_unique_id (do przypisania urządzenia), is_active.

resources: id, name (np. Iveco, Koparka CAT, Warsztat Główny), type (VEHICLE, MACHINE, STATIONARY).

materials: id, name, type.

customers: id, first_name, last_name, default_address.

work_sessions: id, user_id (FK), resource_id (FK), session_type (TRANSPORT, MACHINE_OP, WORKSHOP), status (IN_PROGRESS, COMPLETED, CANCELLED), start_time, end_time, quantity_tons (NULLABLE), material_id (NULLABLE), customer_id (NULLABLE), task_description (NULLABLE), machine_hours_photo_url (NULLABLE), signature_url (NULLABLE), client_absent (BOOLEAN).

session_photos: id, work_session_id (FK), photo_url, photo_type (START, END, AD_HOC), latitude, longitude, created_at.

gps_logs: id, work_session_id (FK), latitude, longitude, timestamp.

4. PRZEPŁYW APLIKACJI MOBILNEJ WERKIT (Flutter) - Dynamiczny Interfejs

Logowanie (Device Binding): Pierwsze logowanie wymaga poświadczeń. Przesyłany jest identyfikator urządzenia. Kolejne uruchomienia weryfikują aktywną sesję (JWT) wyłącznie za pomocą biometrii (local_auth). Brak wyboru nazwiska z listy.

Wybór Trybu Pracy (Dynamic Form):

TRANSPORT (Dostawa): Wymaga: Pojazd, Materiał, Tonaż (>0), Klient. Po starcie: wymuszone zdjęcie (typ: START), ciągłe śledzenie GPS w tle co 30s. Na koniec: zdjęcie (typ: END) + podpis lub checkbox "brak klienta".

MACHINE_OP (Praca na maszynie): Wymaga: Maszyna, task_description. Pola materiału/klienta ukryte. GPS pobierany TYLKO RAZ przy starcie i RAZ przy końcu (oszczędzanie baterii). Na koniec: wymuszone zdjęcie licznika motogodzin (machine_hours_photo_url).

WORKSHOP (Praca na bazie): Wymaga: Zasób (Warsztat), task_description. GPS jednorazowy (Start/Stop).

Zdjęcia w locie (Ad-Hoc): W trakcie aktywnej sesji dowolnego typu, na ekranie znajduje się przycisk "Dodaj Zdjęcie". Plik jest kompresowany, wysyłany do Vercel Blob, a rekord ląduje w session_photos (typ: AD_HOC) z dołączonymi koordynatami GPS.

Offline First: Jeśli brak internetu, pingi GPS i zdjęcia trafiają do lokalnej bazy (np. SQLite) i są automatycznie synchronizowane po odzyskaniu połączenia.

5. PRZEPŁYW APLIKACJI WEBOWEJ (Next.js)

Dashboard (Live): Mapa pokazująca najnowsze położenie (z gps_logs) dla sesji o statusie IN_PROGRESS. Podział na listę pracowników w trasie i na bazie.

Archiwum Sesji: Tabela z historią. Możliwość generowania raportów filtrujących według typu sesji (np. podsumowanie przewiezionych ton vs. czas spędzony w warsztacie).

Szczegóły Sesji: Widok wyrysowanej trasy na mapie (dla TRANSPORT) oraz pionowa oś czasu (Timeline) ze wszystkimi zdjęciami powiązanymi z tą sesją pobranymi z tabeli session_photos.

6. WYMOGI BEZPIECZEŃSTWA (CRITICAL SECURITY)

Brak bezpośredniego połączenia z bazą z poziomu Fluttera. Cały ruch przechodzi przez zabezpieczone endpointy Vercel API.

Każde żądanie z aplikacji wymaga poprawnego nagłówka Authorization: Bearer <token>.

API musi używać rygorystycznej walidacji po stronie serwera (np. Zod), aby odrzucać ujemne wartości tonażu, błędne typy danych i próby manipulacji czasem.

Zaimplementuj Rate Limiting na endpointach logowania, aby chronić przed brute-force.

Zmienne środowiskowe istnieją tylko w bezpiecznym magazynie Vercel.

ZADANIE STARTOWE DLA AGENTA:
Przeanalizuj architekturę. Jako pierwszy krok wygeneruj:

Skrypt inicjalizujący schemat bazy danych dla Vercel Postgres (kod SQL uwzględniający tabele, relacje i rozszerzenie PostGIS).

Kod dla Vercel Serverless Function (Next.js Route Handler w TypeScript) obsługujący logowanie pracownika (z weryfikacją device_unique_id, generowaniem JWT i obsługą błędów).
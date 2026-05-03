import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8 sm:p-12">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-8 tracking-tight">Polityka Prywatności / Privacy Policy</h1>
        
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-sm text-zinc-500 mb-8">Ostatnia aktualizacja / Last updated: 03.05.2026</p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Wstęp (Introduction)</h2>
          <p>
            Niniejsza Polityka Prywatności określa zasady przetwarzania danych osobowych oraz danych o lokalizacji w aplikacji mobilnej <strong>Werkit</strong>.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-emerald-600 dark:text-emerald-400">2. Dane o lokalizacji w tle (Background Location Data) - WAŻNE</h2>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-r-lg my-6">
            <p className="font-semibold mb-2">Polska wersja:</p>
            <p className="mb-4">
              Aplikacja <strong>Werkit zbiera dane o lokalizacji w celu umożliwienia śledzenia tras przejazdu pracowników podczas realizacji zleceń, również wtedy, gdy aplikacja jest zamknięta lub nie jest używana (w tle)</strong>. Dane te są niezbędne do prawidłowego wyliczania czasu i trasy pracy, co jest podstawową funkcją systemu dla pracodawcy.
            </p>
            <p className="font-semibold mb-2">English version:</p>
            <p>
              The <strong>Werkit app collects location data to enable tracking of employee routes during work orders, even when the app is closed or not in use (in the background)</strong>. This data is essential for accurately calculating work time and routes, which is a core function of the system for the employer.
            </p>
          </div>

          <h2 className="text-xl font-bold mt-8 mb-4">3. Cel zbierania danych (Purpose of Data Collection)</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Rejestrowanie czasu pracy (Time tracking)</li>
            <li>Zapisywanie punktów GPS trasy w celu weryfikacji wykonanego zlecenia (GPS route tracking for work verification)</li>
            <li>Zarządzanie zleceniami przez administratora systemu (Work order management by the admin)</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">4. Dostęp i bezpieczeństwo (Access and Security)</h2>
          <p>
            Dane lokalizacyjne są wysyłane i przechowywane bezpiecznie na naszych serwerach. Mają do nich dostęp wyłącznie upoważnieni administratorzy (pracodawca) korzystający z systemu Werkit. Dane te nie są sprzedawane ani udostępniane podmiotom trzecim w celach marketingowych.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">5. Kontakt (Contact)</h2>
          <p>
            W razie pytań dotyczących polityki prywatności prosimy o kontakt pod adresem e-mail administratora Twojego systemu Werkit.
          </p>
        </div>
      </div>
    </div>
  );
}

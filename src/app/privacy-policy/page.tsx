import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Polityka prywatności / Privacy Policy — Werkit",
  description:
    "Zasady przetwarzania danych w aplikacji Werkit, w tym lokalizacji w tle podczas aktywnej sesji pracy.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8 sm:p-12">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-8 tracking-tight">
          Polityka Prywatności / Privacy Policy
        </h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-sm text-zinc-500 mb-8">
            Ostatnia aktualizacja / Last updated: 15.09.2026
          </p>

          <p className="text-sm text-zinc-500 mb-8">
            <Link href="/login" className="text-emerald-700 dark:text-emerald-400 underline">
              Wróć do logowania / Back to sign-in
            </Link>
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Wstęp (Introduction)</h2>
          <p>
            Niniejsza Polityka Prywatności określa zasady przetwarzania danych osobowych oraz danych
            o lokalizacji w aplikacji mobilnej i webowej <strong>Werkit</strong> (dyspozycja terenowa
            z warstwą MRO). Administratorem danych dla danej organizacji jest{" "}
            <strong>firma (tenant), która korzysta z Werkit</strong> — pracodawca lub zleceniodawca
            pracownika. Operator hostingu instancji (np.{" "}
            <code>werkit.cncsolutions.dev</code>) przetwarza dane w imieniu tej organizacji.
          </p>
          <p>
            This policy describes how the <strong>Werkit</strong> mobile and web app processes
            personal data and location data. The data controller for each organization is the{" "}
            <strong>company (tenant) using Werkit</strong>. The instance host processes data on
            behalf of that organization.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4 text-emerald-600 dark:text-emerald-400">
            2. Dane o lokalizacji w tle (Background Location Data)
          </h2>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-r-lg my-6">
            <p className="font-semibold mb-2">Polska wersja:</p>
            <p className="mb-4">
              Aplikacja{" "}
              <strong>
                Werkit zbiera dane o lokalizacji, aby rejestrować trasę pracownika podczas aktywnej
                sesji pracy, również wtedy, gdy aplikacja jest zamknięta lub nie jest używana (w
                tle)
              </strong>
              . Śledzenie nie działa 24/7: GPS jest włączany wyłącznie przy aktywnej, niestacjonarnej
              sesji pracownika. Dane służą weryfikacji realizacji zlecenia (czas i trasa) i są
              widoczne dla upoważnionych administratorów organizacji.
            </p>
            <p className="font-semibold mb-2">English version:</p>
            <p>
              The{" "}
              <strong>
                Werkit app collects location data to enable tracking of employee routes during an
                active work session, even when the app is closed or not in use
              </strong>
              . Location is not collected around the clock: GPS runs only during an active,
              non-stationary worker session. Data is used to verify the work order (time and route)
              and is visible to authorized administrators of the organization.
            </p>
          </div>

          <h2 className="text-xl font-bold mt-8 mb-4">
            3. Jakie dane zbieramy (What data we collect)
          </h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Konto: login, imię i nazwisko, rola, organizacja (Account: login, name, role,
              organization)
            </li>
            <li>
              Sesja pracy: czasy start/koniec, zlecenie, notatki, zdjęcia z terenu (Work session:
              start/end times, work order, notes, field photos)
            </li>
            <li>
              Lokalizacja GPS w trakcie sesji (współrzędne, dokładność, czas) — GPS points during
              the session
            </li>
            <li>
              Logi diagnostyczne urządzenia (poziom, komunikat, bez sprzedaży reklam) — device
              diagnostic logs
            </li>
            <li>
              Biometria: odcisk / twarz służą tylko do odblokowania poświadczeń zapisanych na
              urządzeniu; nie wysyłamy wzorca biometrycznego na serwer (Biometrics stay on-device)
            </li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">4. Cel (Purpose)</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Rejestrowanie czasu i trasy pracy (Time and route tracking)</li>
            <li>Weryfikacja zleceń przez dyspozytora (Work order verification)</li>
            <li>Logowanie i bezpieczeństwo konta (Sign-in and account security)</li>
            <li>Diagnostyka awarii aplikacji w terenie (Field diagnostics)</li>
          </ul>
          <p>
            Dane nie są sprzedawane ani udostępniane podmiotom trzecim w celach marketingowych lub
            reklamowych. We do not sell data or share it with third parties for advertising.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">5. Podstawy i przechowywanie (Legal basis)</h2>
          <p>
            Przetwarzanie odbywa się w związku ze stosunkiem pracy / zleceniem oraz prawnie
            uzasadnionym interesem organizacji (organizacja pracy w terenie), a tam gdzie wymagane —
            na podstawie zgody na uprawnienia systemowe Androida (lokalizacja, powiadomienia).
            Okres przechowywania ustala administrator organizacji (retencja sesji, zdjęć i logów w
            panelu firmy).
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">6. Uprawnienia Android (App permissions)</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Lokalizacja (w tym w tle) — trasa sesji pracy / Location including background — session
              route
            </li>
            <li>Powiadomienia i alarmy — przypomnienia o zleceniach / order reminders</li>
            <li>
              Wyłączenie optymalizacji baterii — GPS przy zgaszonym ekranie / battery exemption for
              screen-off GPS
            </li>
            <li>Biometria — opcjonalne logowanie / optional sign-in</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">7. Kontakt (Contact)</h2>
          <p>
            W sprawie danych osobowych skontaktuj się z administratorem swojej organizacji w
            Werkit (pracodawca). Pytania techniczne dotyczące instancji: administrator hostingu
            podanej w adresie URL aplikacji.
          </p>
          <p>
            For personal data requests, contact your Werkit organization administrator (employer).
            Technical questions about the hosted instance: the operator of the app URL you use.
          </p>
        </div>
      </div>
    </div>
  );
}

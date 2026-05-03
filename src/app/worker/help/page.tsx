import { HelpCircle, PhoneCall, AlertTriangle, Info } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="py-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8 flex items-center gap-2">
        <HelpCircle className="w-7 h-7 text-blue-500" />
        Pomoc i Wsparcie
      </h1>
      
      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">Szybki kontakt</h2>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-4">
            Masz problem z maszyną lub aplikacją? Skontaktuj się bezpośrednio z biurem lub dyspozytorem.
          </p>
          <a href="tel:112" className="w-full bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 flex items-center justify-center gap-3 transition-colors font-medium">
            <PhoneCall className="w-5 h-5" />
            Zadzwoń do dyspozytora
          </a>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" /> FAQ
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Dlaczego widzę czerwoną ramkę przy zleceniu?</h3>
              <p className="text-xs text-zinc-500 mt-1">Oznacza to, że zlecenie jest już opóźnione. Powinieneś rozpocząć je jak najszybciej.</p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Aplikacja nie łapie mojej lokalizacji GPS</h3>
              <p className="text-xs text-zinc-500 mt-1">Upewnij się, że masz włączony moduł GPS w telefonie i nadałeś aplikacji uprawnienia "Zawsze zezwalaj" na dostęp do lokalizacji.</p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Jak dodać własne zlecenie?</h3>
              <p className="text-xs text-zinc-500 mt-1">Jeżeli biuro nadało Ci odpowiednie uprawnienia, na dole ekranu z listą zleceń znajdziesz przycisk "Zdefiniuj Własne".</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Awaria sprzętu
          </h2>
          <p className="text-xs text-orange-800 dark:text-orange-300">
            W przypadku awarii sprzętu, natychmiast zatrzymaj maszynę, zabezpiecz miejsce pracy i użyj przycisku telefonu powyżej, aby zgłosić problem.
          </p>
        </div>
      </div>
    </div>
  );
}

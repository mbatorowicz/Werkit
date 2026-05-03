"use client";

import { HelpCircle, PhoneCall, AlertTriangle, Info, BookOpen, ChevronDown, ChevronUp, MapPin, Camera, Clock, Navigation, Play } from "lucide-react";
import { useState } from "react";

function HelpAccordion({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm transition-all">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full p-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-left">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
      </button>
      {isOpen && (
        <div className="p-5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200 dark:border-zinc-700">
          {children}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="py-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8 flex items-center gap-2">
        <BookOpen className="w-7 h-7 text-blue-500" />
        Instrukcja Obsługi
      </h1>
      
      <div className="space-y-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">Szybki kontakt z bazą</h2>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-4">
            Masz problem z maszyną, ładunkiem lub aplikacją? Skontaktuj się bezpośrednio z biurem.
          </p>
          <a href="tel:112" className="w-full bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 flex items-center justify-center gap-3 transition-colors font-medium">
            <PhoneCall className="w-5 h-5" />
            Zadzwoń do dyspozytora
          </a>
        </div>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">Podręcznik Użytkownika</h2>
      
      <div className="space-y-3">
        <HelpAccordion title="1. Rozpoczynanie pracy" icon={Play}>
          <p className="mb-2">
            Gdy wejdziesz w zakładkę <strong>Sesja</strong>, zobaczysz listę zleceń przygotowanych dla Ciebie przez dyspozytora.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Kolor Czerwony:</strong> Zlecenie przeterminowane. Powinno być wykonane w pierwszej kolejności!</li>
            <li><strong>Kolor Różowy:</strong> Zlecenie zbliżające się (np. zaplanowane na najbliższe godziny).</li>
            <li><strong>Priorytety:</strong> Niektóre zlecenia mają przypisany wysoki priorytet - zwracaj na to uwagę.</li>
          </ul>
          <p className="mt-3">
            Aby rozpocząć pracę, kliknij duży przycisk <strong>ROZPOCZNIJ ZADANIE</strong>. Od tego momentu aplikacja zacznie rejestrować Twój czas pracy oraz (jeśli to wymagane) trasę GPS.
          </p>
        </HelpAccordion>

        <HelpAccordion title="2. Notatki i Zdjęcia z trasy" icon={Camera}>
          <p className="mb-2">
            Podczas trwania zlecenia, na ekranie głównym pojawiają się nowe przyciski:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Dodaj Notatkę:</strong> Pozwala zapisać ważną informację z drogi (np. "Korek na bramkach", "Klient odmówił przyjęcia"). Notatka jest przypisywana do Twojej obecnej lokalizacji na mapie.
            </li>
            <li>
              <strong>Zrób Zdjęcie:</strong> Uruchamia aparat wbudowany w urządzenie. Służy do dokumentowania wykonanej pracy (np. zrzutu kruszywa, awarii maszyny, podpisów na WZ).
            </li>
          </ul>
          <p className="mt-3 text-amber-600 dark:text-amber-500 font-medium">
            Ważne: Niektóre zlecenia mogą wymagać zrobienia co najmniej jednego zdjęcia przed możliwością ich zakończenia!
          </p>
        </HelpAccordion>

        <HelpAccordion title="3. Śledzenie i GPS" icon={Navigation}>
          <p className="mb-2">
            Aplikacja używa sygnału satelitarnego do wyznaczania przebytej przez Ciebie trasy.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Status: Oczekuję na GPS</strong> (Żółty) - telefon szuka satelity. Upewnij się, że nie jesteś w podziemnym garażu.</li>
            <li><strong>Status: GPS Aktywny</strong> (Zielony) - wszystko działa prawidłowo.</li>
          </ul>
          <p className="mt-3">
            GPS jest włączany <strong>tylko i wyłącznie</strong> w momencie aktywnego zlecenia (po kliknięciu Rozpocznij). Gdy klikniesz "Zakończ", aplikacja całkowicie przestaje pobierać dane o Twojej lokalizacji, chroniąc Twoją baterię i prywatność.
          </p>
        </HelpAccordion>

        <HelpAccordion title="4. Zlecenia Własne" icon={Info}>
          <p>
            Jeśli masz włączone uprawnienia od administratora, na dole ekranu powitalnego znajdziesz przycisk <strong>LUB ZDEFINIUJ WŁASNE</strong>. 
          </p>
          <p className="mt-2">
            Pozwala on na samodzielne wybranie klienta z listy, maszyny, towaru i natychmiastowe rozpoczęcie pracy bez konieczności czekania na zlecenie z biura.
          </p>
        </HelpAccordion>
      </div>

      <div className="mt-8 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Procedura awaryjna
        </h2>
        <p className="text-xs text-orange-800 dark:text-orange-300">
          W przypadku kolizji, awarii sprzętu lub innego zagrożenia, natychmiast zatrzymaj maszynę w bezpiecznym miejscu, zabezpiecz ładunek i użyj przycisku telefonu na samej górze tej strony, aby poinformować o tym fakcie dyspozytora. Jeśli to możliwe, wykonaj zdjęcie sytuacji za pomocą aplikacji.
        </p>
      </div>
    </div>
  );
}

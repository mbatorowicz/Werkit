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

import { getDictionary } from "@/i18n";

export default function HelpPage() {
  const dict = getDictionary().worker.help;

  return (
    <div className="py-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8 flex items-center gap-2">
        <BookOpen className="w-7 h-7 text-blue-500" />
        {dict.title}
      </h1>
      
      <div className="space-y-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">{dict.quickContact}</h2>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-4">
            {dict.contactDesc}
          </p>
          <a href="tel:112" className="w-full bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 flex items-center justify-center gap-3 transition-colors font-medium">
            <PhoneCall className="w-5 h-5" />
            {dict.callDispatcher}
          </a>
        </div>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">{dict.userManual}</h2>
      
      <div className="space-y-3">
        <HelpAccordion title={dict.startWork} icon={Play}>
          <p className="mb-2">
            {dict.startWorkDesc1}<strong>Sesja</strong>{dict.startWorkDesc2}
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>{dict.redColor}</strong> {dict.redColorDesc}</li>
            <li><strong>{dict.pinkColor}</strong> {dict.pinkColorDesc}</li>
            <li><strong>{dict.priorities}</strong> {dict.prioritiesDesc}</li>
          </ul>
          <p className="mt-3">
            {dict.startWorkInstruction}<strong>ROZPOCZNIJ ZADANIE</strong>{dict.startWorkInstruction2}
          </p>
        </HelpAccordion>

        <HelpAccordion title={dict.notesAndPhotos} icon={Camera}>
          <p className="mb-2">
            {dict.notesAndPhotosDesc}
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>{dict.addNote}</strong> {dict.addNoteDesc}
            </li>
            <li>
              <strong>{dict.takePhoto}</strong> {dict.takePhotoDesc}
            </li>
          </ul>
          <p className="mt-3 text-amber-600 dark:text-amber-500 font-medium">
            {dict.photoWarning}
          </p>
        </HelpAccordion>

        <HelpAccordion title={dict.gpsTracking} icon={Navigation}>
          <p className="mb-2">
            {dict.gpsTrackingDesc}
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>{dict.gpsWait}</strong> {dict.gpsWaitDesc}</li>
            <li><strong>{dict.gpsActive}</strong> {dict.gpsActiveDesc}</li>
          </ul>
          <p className="mt-3">
            {dict.gpsPrivacy}<strong>{dict.gpsPrivacy2}</strong>{dict.gpsPrivacy3}
          </p>
        </HelpAccordion>

        <HelpAccordion title={dict.customOrders} icon={Info}>
          <p>
            {dict.customOrdersDesc1}<strong>{dict.customOrdersDesc2}</strong>. 
          </p>
          <p className="mt-2">
            {dict.customOrdersDesc3}
          </p>
        </HelpAccordion>
      </div>

      <div className="mt-8 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {dict.emergency}
        </h2>
        <p className="text-xs text-orange-800 dark:text-orange-300">
          {dict.emergencyDesc}
        </p>
      </div>
    </div>
  );
}

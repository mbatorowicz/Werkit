"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function HelpAccordion({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm transition-all">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full p-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-lg">
            {icon}
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

"use client";

import { X, Loader2 } from "lucide-react";
import { TimelineItem } from "@/types/worker";
import { formatUiTimeHm } from "@/i18n";

interface NotesModalProps {
  isNotesModalOpen: boolean;
  setIsNotesModalOpen: (val: boolean) => void;
  dict: Record<string, string>;
  noteText: string;
  setNoteText: (val: string) => void;
  isSubmittingNote: boolean;
  handleSaveNote: () => void;
  editingNoteId: number | null;
  setEditingNoteId: (val: number | null) => void;
  timelineEvents: TimelineItem[];
}

export default function NotesModal({
  isNotesModalOpen,
  setIsNotesModalOpen,
  dict,
  noteText,
  setNoteText,
  isSubmittingNote,
  handleSaveNote,
  editingNoteId,
  setEditingNoteId,
  timelineEvents
}: NotesModalProps) {
  if (!isNotesModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsNotesModalOpen(false)}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{dict.addNoteToReport}</h2>
          <button onClick={() => setIsNotesModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{dict.noteContent}</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-24 resize-none"
              placeholder={dict.typeNotes}
            />
          </div>
          <button 
            disabled={isSubmittingNote} 
            onClick={handleSaveNote} 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none mb-4"
          >
            {isSubmittingNote ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingNoteId ? dict.update : dict.saveNote)}
          </button>

          {timelineEvents.some(e => e.type === 'note') && (
            <div className="flex flex-col gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800 max-h-48 overflow-y-auto">
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">{dict.yourNotes}</label>
              {timelineEvents.filter(e => e.type === 'note').map((n: TimelineItem) => (
                <div key={n.id} className="flex justify-between items-start gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border border-zinc-200 dark:border-zinc-700/50">
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-800 dark:text-zinc-200 break-words">{n.content}</span>
                    <span className="text-[9px] text-zinc-400">{formatUiTimeHm(n.createdAt)}</span>
                  </div>
                  <button
                    onClick={() => { 
                      setNoteText(n.content); 
                      setEditingNoteId(parseInt(n.id.replace('note_', ''))); 
                      setIsNotesModalOpen(true); 
                    }}
                    className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1"
                  >
                    {dict.edit}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

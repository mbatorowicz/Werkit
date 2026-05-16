"use client";

import { TimelineItem } from "@/types/worker";
import { formatUiTimeHm } from "@/i18n";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";

const FORM_ID = "worker-note-form";

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
  timelineEvents,
}: NotesModalProps) {
  const close = () => setIsNotesModalOpen(false);

  return (
    <AdminModalShell
      open={isNotesModalOpen}
      onClose={close}
      title={dict.addNoteToReport}
      maxWidthClass="max-w-md"
      titleSize="lg"
      zIndexClass="z-[9999]"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId={FORM_ID}
          onCancel={close}
          submitLabel={editingNoteId ? dict.update : dict.saveNote}
          isSubmitting={isSubmittingNote}
          submitClassName="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center min-w-[7rem]"
        />
      }
    >
      <form
        id={FORM_ID}
        className="flex flex-col gap-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveNote();
        }}
      >
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {dict.noteContent}
          </label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="h-24 w-full resize-none rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder={dict.typeNotes}
          />
        </div>

        {timelineEvents.some((e) => e.type === "note") ? (
          <div className="flex max-h-48 flex-col gap-2 overflow-y-auto border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {dict.yourNotes}
            </label>
            {timelineEvents
              .filter((e) => e.type === "note")
              .map((n: TimelineItem) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-2 rounded border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700/50 dark:bg-zinc-800/50"
                >
                  <div className="flex flex-col">
                    <span className="break-words text-xs text-zinc-800 dark:text-zinc-200">{n.content}</span>
                    <span className="text-[9px] text-zinc-400">{formatUiTimeHm(n.createdAt)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNoteText(n.content);
                      setEditingNoteId(parseInt(n.id.replace("note_", ""), 10));
                      setIsNotesModalOpen(true);
                    }}
                    className="px-2 py-1 text-[10px] font-bold uppercase text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    {dict.edit}
                  </button>
                </div>
              ))}
          </div>
        ) : null}
      </form>
    </AdminModalShell>
  );
}

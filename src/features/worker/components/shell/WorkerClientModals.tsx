"use client";

import type { AppDictionary } from "@/i18n/types";
import type { TimelineItem } from "@/types/worker";
import NotesModal from "@/features/worker/components/Modals/NotesModal";
import GpsWarningModal from "@/features/worker/components/Modals/GpsWarningModal";

type WorkerClientDict = AppDictionary["worker"]["client"];

type NotesBlockProps = {
  dict: WorkerClientDict;
  isNotesModalOpen: boolean;
  setIsNotesModalOpen: (v: boolean) => void;
  noteText: string;
  setNoteText: (v: string) => void;
  isSubmittingNote: boolean;
  handleSaveNote: () => void;
  editingNoteId: number | null;
  setEditingNoteId: (v: number | null) => void;
  timelineEvents: TimelineItem[];
};

type GpsBlockProps = {
  dict: WorkerClientDict;
  showGpsWarning: boolean;
  setShowGpsWarning: (v: boolean) => void;
  pendingOrderId: number | null;
  setPendingOrderId: (v: number | null) => void;
  handleAcceptOrder: (orderId: number) => void;
};

export function WorkerClientModals({ notes, gps }: { notes: NotesBlockProps; gps: GpsBlockProps }) {
  return (
    <>
      <NotesModal
        isNotesModalOpen={notes.isNotesModalOpen}
        setIsNotesModalOpen={notes.setIsNotesModalOpen}
        dict={notes.dict}
        noteText={notes.noteText}
        setNoteText={notes.setNoteText}
        isSubmittingNote={notes.isSubmittingNote}
        handleSaveNote={notes.handleSaveNote}
        editingNoteId={notes.editingNoteId}
        setEditingNoteId={notes.setEditingNoteId}
        timelineEvents={notes.timelineEvents}
      />
      <GpsWarningModal
        dict={gps.dict}
        showGpsWarning={gps.showGpsWarning}
        setShowGpsWarning={gps.setShowGpsWarning}
        pendingOrderId={gps.pendingOrderId}
        setPendingOrderId={gps.setPendingOrderId}
        handleAcceptOrder={gps.handleAcceptOrder}
      />
    </>
  );
}

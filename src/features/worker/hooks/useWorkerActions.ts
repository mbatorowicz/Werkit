import { useState } from "react";
import { useAppDialog } from "@/components/AppDialogProvider";
import { useDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import type { Coord, TimelineItem, AppSettings } from "@/types/worker";
import {
  acceptOrderAction,
  cancelSessionAction,
  checkpointAction,
  endSessionAction,
  photoUploadAction,
  saveNoteAction,
} from "@/features/worker/hooks/workerSessionActions";

interface UseWorkerActionsProps {
  dict: AppDictionary["worker"]["client"];
  fetchSessionAndPath: (showLoader: boolean, fetchGpsPath: boolean) => Promise<void>;
  setIsLoading: (val: boolean) => void;
  timelineEvents: TimelineItem[];
  settings: AppSettings | null;
  distanceToDestKm: number | null;
  /** Typ sprzętu stacjonarny — bez kontroli odległości przy „dojechał”. */
  categoryIsStationary?: boolean;
}

export function useWorkerActions({
  dict,
  fetchSessionAndPath,
  setIsLoading,
  timelineEvents,
  settings,
  distanceToDestKm,
  categoryIsStationary = false,
}: UseWorkerActionsProps) {
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const dictionary = useDictionary();
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const [acceptErrors, setAcceptErrors] = useState<Record<number, string>>({});
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  const deps = { dict, apiErrors, appAlert, appConfirm, fetchSessionAndPath, setIsLoading };

  const handleEndSession = (endLocation: Coord | null) =>
    endSessionAction(deps, { endLocation, settings, timelineEvents });

  const handleAcceptOrder = (orderId: number, startLocation: Coord | null) =>
    acceptOrderAction(deps, { orderId, startLocation, setAcceptErrors });

  const handleCancelSession = () => cancelSessionAction(deps);

  const handleCheckpoint = (location: Coord | null) =>
    checkpointAction(deps, { location, settings, distanceToDestKm, categoryIsStationary });

  const handleSaveNote = (location: Coord | null) =>
    saveNoteAction(deps, {
      location,
      noteText,
      editingNoteId,
      setIsSubmittingNote,
      setIsNotesModalOpen,
      setNoteText,
      setEditingNoteId,
    });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, location: Coord | null) =>
    photoUploadAction(deps, { e, location });

  return {
    isNotesModalOpen,
    setIsNotesModalOpen,
    noteText,
    setNoteText,
    isSubmittingNote,
    editingNoteId,
    setEditingNoteId,
    handleEndSession,
    handleAcceptOrder,
    handleCancelSession,
    handleCheckpoint,
    handleSaveNote,
    handlePhotoUpload,
    acceptErrors,
  };
}

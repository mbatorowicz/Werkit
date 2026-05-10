import { useState } from 'react';
import { formatDict } from '@/i18n';
import { sendRemoteLog } from '@/lib/remoteLogger';
import { Coord, TimelineItem, AppSettings } from '@/types/worker';

interface UseWorkerActionsProps {
  dict: Record<string, string>;
  fetchSessionAndPath: (showLoader: boolean, fetchGpsPath: boolean) => Promise<void>;
  setIsLoading: (val: boolean) => void;
  timelineEvents: TimelineItem[];
  settings: AppSettings | null;
  distanceToDestKm: number | null;
}

export function useWorkerActions({
  dict,
  fetchSessionAndPath,
  setIsLoading,
  timelineEvents,
  settings,
  distanceToDestKm
}: UseWorkerActionsProps) {
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  const handleEndSession = async () => {
    if (settings?.requirePhotoToFinish) {
      const hasPhoto = timelineEvents.some(e => e.type === 'photo');
      if (!hasPhoto) {
        alert(dict.photoReqFinish);
        return;
      }
    }
    if (!confirm(dict.confirmEndSession)) return;
    setIsLoading(true);
    try {
      await fetch("/api/worker/session", { method: "PUT" });
      sendRemoteLog('INFO', 'Użytkownik zakończył sesję pracy');
      await fetchSessionAndPath(false, false);
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd podczas zakańczania sesji', { error: e instanceof Error ? e.message : String(e) });
      alert(dict.errEndSession);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/worker/work-orders/${orderId}/accept`, { method: "POST" });
      if (res.ok) {
        sendRemoteLog('INFO', 'Zlecenie rozpoczęte pomyślnie', { orderId });
        await fetchSessionAndPath(false, false);
      } else {
        sendRemoteLog('ERROR', 'Nie udało się zaakceptować zlecenia API Error', { orderId, status: res.status });
        alert(dict.errAcceptOrder);
      }
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd sieci podczas akceptacji zlecenia', { error: e instanceof Error ? e.message : String(e) });
      alert(dict.errNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!confirm(dict.confirmCancelSession)) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/worker/session/cancel", { method: "POST" });
      if (res.ok) {
        sendRemoteLog('WARN', 'Cofnięto zlecenie', { status: 'cancelled' });
        alert(dict.cancelSuccess);
        await fetchSessionAndPath(true, true);
      } else {
        sendRemoteLog('ERROR', 'Błąd podczas cofania zlecenia API Error');
        alert(dict.errCancel);
      }
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd sieci przy cofaniu zlecenia', { error: e instanceof Error ? e.message : String(e) });
      alert(dict.errNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckpoint = async (location: Coord | null) => {
    if (settings?.geofenceRadiusMeters && distanceToDestKm !== null) {
      const distMeters = distanceToDestKm * 1000;
      if (distMeters > settings.geofenceRadiusMeters) {
        const msg = formatDict(dict.geofenceConfirm, {
          dist: Math.round(distMeters),
          max: settings.geofenceRadiusMeters,
        });
        if (!confirm(msg)) return;
      }
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/worker/session/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: dict.checkpointNote, location })
      });
      if (res.ok) {
        sendRemoteLog('INFO', 'Zapisano checkpoint (dotarcie na miejsce)');
        await fetchSessionAndPath(false, false);
      } else {
        sendRemoteLog('ERROR', 'Błąd zapisywania checkpointu (API Error)');
        alert(dict.errSaveNote);
      }
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd sieci przy zapisie checkpointu', { error: e instanceof Error ? e.message : String(e) });
      alert(dict.errNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async (location: Coord | null) => {
    if (!noteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const isEditing = editingNoteId !== null;
      const url = "/api/worker/session/notes";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? { noteId: editingNoteId, note: noteText }
        : { note: noteText, location };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        sendRemoteLog('INFO', isEditing ? 'Zaktualizowano notatkę' : 'Dodano nową notatkę');
        setIsNotesModalOpen(false);
        setNoteText("");
        setEditingNoteId(null);
        await fetchSessionAndPath(false, false);
      } else {
        sendRemoteLog('ERROR', 'Błąd zapisywania notatki (API Error)');
        alert(dict.errSaveNote);
      }
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd sieci podczas zapisywania notatki', { error: e instanceof Error ? e.message : String(e) });
      alert(dict.errNetwork);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, location: Coord | null) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsLoading(true);
      try {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => img.onload = resolve);
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
        else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.7);

        const res = await fetch("/api/worker/session/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: base64, location })
        });
        if (res.ok) {
          sendRemoteLog('INFO', 'Zrobiono i wysłano zdjęcie');
          await fetchSessionAndPath(false, false);
        } else {
          sendRemoteLog('ERROR', 'Błąd wysyłania zdjęcia (API Error)');
          alert(dict.photoError);
        }
      } catch (err: unknown) {
        sendRemoteLog('ERROR', 'Błąd kompresji lub wysyłania zdjęcia', { error: err instanceof Error ? err.message : String(err) });
        alert(dict.errProcessPhoto);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return {
    isNotesModalOpen, setIsNotesModalOpen,
    noteText, setNoteText,
    isSubmittingNote,
    editingNoteId, setEditingNoteId,
    handleEndSession,
    handleAcceptOrder,
    handleCancelSession,
    handleCheckpoint,
    handleSaveNote,
    handlePhotoUpload
  };
}

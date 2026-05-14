import { useState } from 'react';
import { formatDict } from '@/i18n';
import type { AppDictionary } from '@/i18n/types';
import { fetchWithDeviceTelemetry } from '@/lib/fetchWithDeviceTelemetry';
import { sendRemoteLog } from '@/lib/remoteLogger';
import { Coord, TimelineItem, AppSettings } from '@/types/worker';

interface UseWorkerActionsProps {
  dict: AppDictionary['worker']['client'];
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
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  const handleEndSession = async (endLocation: Coord | null) => {
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
      await fetchWithDeviceTelemetry("Worker: end session PUT", "/api/worker/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          endLocation
            ? { latitude: endLocation.lat, longitude: endLocation.lng }
            : {},
        ),
      }, { category: "session" });
      sendRemoteLog('INFO', 'Użytkownik zakończył sesję pracy', undefined, { category: 'session' });
      await fetchSessionAndPath(false, false);
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd podczas zakańczania sesji', { error: e instanceof Error ? e.message : String(e) }, { category: 'session' });
      alert(dict.errEndSession);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: number, startLocation: Coord | null) => {
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker: accept order POST ${orderId}`,
        `/api/worker/work-orders/${orderId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            startLocation
              ? { latitude: startLocation.lat, longitude: startLocation.lng }
              : {},
          ),
        },
        { category: "orders" },
      );
      if (res.ok) {
        sendRemoteLog('INFO', 'Zlecenie rozpoczęte pomyślnie', { orderId }, { category: 'orders' });
        await fetchSessionAndPath(false, false);
      } else {
        sendRemoteLog('ERROR', 'Nie udało się zaakceptować zlecenia API Error', { orderId, status: res.status }, { category: 'orders' });
        alert(dict.errAcceptOrder);
      }
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd sieci podczas akceptacji zlecenia', { error: e instanceof Error ? e.message : String(e) }, { category: 'orders' });
      alert(dict.errNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!confirm(dict.confirmCancelSession)) return;
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry("Worker: cancel session order POST", "/api/worker/session/cancel", { method: "POST" }, { category: "orders" });
      if (res.ok) {
        sendRemoteLog('WARN', 'Cofnięto zlecenie', { status: 'cancelled' }, { category: 'orders' });
        alert(dict.cancelSuccess);
        await fetchSessionAndPath(true, true);
      } else {
        sendRemoteLog('ERROR', 'Błąd podczas cofania zlecenia API Error', undefined, { category: 'orders' });
        alert(dict.errCancel);
      }
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd sieci przy cofaniu zlecenia', { error: e instanceof Error ? e.message : String(e) }, { category: 'orders' });
      alert(dict.errNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckpoint = async (location: Coord | null) => {
    if (!categoryIsStationary && settings?.geofenceRadiusMeters && distanceToDestKm !== null) {
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
      const res = await fetchWithDeviceTelemetry("Worker: checkpoint POST", "/api/worker/session/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: dict.checkpointNote, location })
      }, { category: "session" });
      if (res.ok) {
        sendRemoteLog('INFO', 'Zapisano checkpoint (dotarcie na miejsce)', undefined, { category: 'session' });
        await fetchSessionAndPath(false, false);
      } else {
        sendRemoteLog('ERROR', 'Błąd zapisywania checkpointu (API Error)', undefined, { category: 'session' });
        alert(dict.errSaveNote);
      }
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd sieci przy zapisie checkpointu', { error: e instanceof Error ? e.message : String(e) }, { category: 'session' });
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

      const res = await fetchWithDeviceTelemetry(
        isEditing ? "Worker: edit note PUT" : "Worker: add note POST",
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        { category: "session" },
      );
      if (res.ok) {
        sendRemoteLog('INFO', isEditing ? 'Zaktualizowano notatkę' : 'Dodano nową notatkę', undefined, { category: 'session' });
        setIsNotesModalOpen(false);
        setNoteText("");
        setEditingNoteId(null);
        await fetchSessionAndPath(false, false);
      } else {
        sendRemoteLog('ERROR', 'Błąd zapisywania notatki (API Error)', undefined, { category: 'session' });
        alert(dict.errSaveNote);
      }
    } catch (e: unknown) {
      sendRemoteLog('ERROR', 'Błąd sieci podczas zapisywania notatki', { error: e instanceof Error ? e.message : String(e) }, { category: 'session' });
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

        const res = await fetchWithDeviceTelemetry("Worker: upload photo POST", "/api/worker/session/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: base64, location })
        }, { category: "session" });
        if (res.ok) {
          sendRemoteLog('INFO', 'Zrobiono i wysłano zdjęcie', undefined, { category: 'session' });
          await fetchSessionAndPath(false, false);
        } else {
          sendRemoteLog('ERROR', 'Błąd wysyłania zdjęcia (API Error)', undefined, { category: 'session' });
          alert(dict.photoError);
        }
      } catch (err: unknown) {
        sendRemoteLog('ERROR', 'Błąd kompresji lub wysyłania zdjęcia', { error: err instanceof Error ? err.message : String(err) }, { category: 'session' });
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

import { useState } from "react";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { formatDict, getDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { offlineActionQueue } from "@/lib/offlineActionQueue";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { GPSManager } from "@/lib/gpsManager";
import { sendRemoteLog } from "@/lib/remoteLogger";
import type { Coord, TimelineItem, AppSettings } from "@/types/worker";

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
  const apiErrors = getDictionary().apiErrors as Record<string, string>;
  const [acceptErrors, setAcceptErrors] = useState<Record<number, string>>({});
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  const handleEndSession = async (endLocation: Coord | null) => {
    if (settings?.requirePhotoToFinish) {
      const hasPhoto = timelineEvents.some((e) => e.type === "photo");
      if (!hasPhoto) {
        await appAlert({ message: dict.photoReqFinish });
        return;
      }
    }
    if (!(await appConfirm({ message: dict.confirmEndSession, variant: "danger" }))) return;
    setIsLoading(true);
    try {
      const body = endLocation ? { latitude: endLocation.lat, longitude: endLocation.lng } : {};

      const result = await offlineActionQueue.enqueue("end_session", body);
      if (result.queued) {
        // Offline — zakolejkowano, wyślę po powrocie online
        sendRemoteLog("INFO", "Zakończenie sesji zakolejkowane offline", undefined, {
          category: "session",
        });
        GPSManager.clearQueue();
        await appAlert({ message: dict.offlineQueuedEndSession });
        await fetchSessionAndPath(false, false);
      } else if (result.ok) {
        GPSManager.clearQueue();
        sendRemoteLog("INFO", "Użytkownik zakończył sesję pracy", undefined, {
          category: "session",
        });
        await fetchSessionAndPath(false, false);
      } else {
        await appAlert({ message: dict.errEndSession });
      }
    } catch (e: unknown) {
      sendRemoteLog(
        "ERROR",
        "Błąd podczas zakańczania sesji",
        { error: e instanceof Error ? e.message : String(e) },
        { category: "session" }
      );
      await appAlert({ message: dict.errEndSession });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: number, startLocation: Coord | null) => {
    setIsLoading(true);
    setAcceptErrors((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    try {
      const res = await fetchWithDeviceTelemetry(
        `Worker: accept order POST ${orderId}`,
        `/api/worker/work-orders/${orderId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            startLocation ? { latitude: startLocation.lat, longitude: startLocation.lng } : {}
          ),
        },
        { category: "orders" }
      );
      if (res.ok) {
        sendRemoteLog("INFO", "Zlecenie rozpoczęte pomyślnie", { orderId }, { category: "orders" });
        await fetchSessionAndPath(false, false);
      } else {
        sendRemoteLog(
          "ERROR",
          "Nie udało się zaakceptować zlecenia API Error",
          { orderId, status: res.status },
          { category: "orders" }
        );
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        if (res.status === 409 && (code === "schedule_conflict" || code === "resource_busy")) {
          setAcceptErrors((prev) => ({
            ...prev,
            [orderId]: appDialogApiMessage(apiErrors, code, dict.errAcceptOrder),
          }));
        } else {
          await appAlert({ message: appDialogApiMessage(apiErrors, code, dict.errAcceptOrder) });
        }
      }
    } catch (e: unknown) {
      sendRemoteLog(
        "ERROR",
        "Błąd sieci podczas akceptacji zlecenia",
        { error: e instanceof Error ? e.message : String(e) },
        { category: "orders" }
      );
      await appAlert({ message: dict.errNetwork });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!(await appConfirm({ message: dict.confirmCancelSession, variant: "danger" }))) return;
    setIsLoading(true);
    try {
      const result = await offlineActionQueue.enqueue("cancel_session", {});
      if (result.queued) {
        sendRemoteLog(
          "WARN",
          "Cofnięcie zlecenia zakolejkowane offline",
          { status: "cancelled" },
          { category: "orders" }
        );
        GPSManager.clearQueue();
        await appAlert({ message: dict.offlineQueuedCancel });
        await fetchSessionAndPath(true, true);
      } else if (result.ok) {
        sendRemoteLog("WARN", "Cofnięto zlecenie", { status: "cancelled" }, { category: "orders" });
        GPSManager.clearQueue();
        await appAlert({ message: dict.cancelSuccess });
        await fetchSessionAndPath(true, true);
      } else {
        sendRemoteLog("ERROR", "Błąd podczas cofania zlecenia API Error", undefined, {
          category: "orders",
        });
        await appAlert({ message: dict.errCancel });
      }
    } catch (e: unknown) {
      sendRemoteLog(
        "ERROR",
        "Błąd sieci przy cofaniu zlecenia",
        { error: e instanceof Error ? e.message : String(e) },
        { category: "orders" }
      );
      await appAlert({ message: dict.errNetwork });
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
        if (!(await appConfirm({ message: msg, variant: "danger" }))) return;
      }
    }
    setIsLoading(true);
    try {
      const result = await offlineActionQueue.enqueue("checkpoint", {
        note: dict.checkpointNote,
        location,
      });
      if (result.queued) {
        sendRemoteLog("INFO", "Checkpoint zakolejkowany offline", undefined, {
          category: "session",
        });
        await appAlert({ message: dict.offlineQueuedCheckpoint });
        await fetchSessionAndPath(false, false);
      } else if (result.ok) {
        sendRemoteLog("INFO", "Zapisano checkpoint (dotarcie na miejsce)", undefined, {
          category: "session",
        });
        await fetchSessionAndPath(false, false);
      } else {
        sendRemoteLog("ERROR", "Błąd zapisywania checkpointu (API Error)", undefined, {
          category: "session",
        });
        await appAlert({ message: dict.errSaveNote });
      }
    } catch (e: unknown) {
      sendRemoteLog(
        "ERROR",
        "Błąd sieci przy zapisie checkpointu",
        { error: e instanceof Error ? e.message : String(e) },
        { category: "session" }
      );
      await appAlert({ message: dict.errNetwork });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async (location: Coord | null) => {
    if (!noteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const isEditing = editingNoteId !== null;
      const actionType = isEditing ? "edit_note" : "save_note";
      const body = isEditing
        ? { noteId: editingNoteId, note: noteText }
        : { note: noteText, location };

      const result = await offlineActionQueue.enqueue(actionType, body);
      if (result.queued) {
        sendRemoteLog(
          "INFO",
          isEditing ? "Edycja notatki zakolejkowana offline" : "Notatka zakolejkowana offline",
          undefined,
          { category: "session" }
        );
        setIsNotesModalOpen(false);
        setNoteText("");
        setEditingNoteId(null);
        await appAlert({ message: dict.offlineQueuedNote });
        await fetchSessionAndPath(false, false);
      } else if (result.ok) {
        sendRemoteLog(
          "INFO",
          isEditing ? "Zaktualizowano notatkę" : "Dodano nową notatkę",
          undefined,
          { category: "session" }
        );
        setIsNotesModalOpen(false);
        setNoteText("");
        setEditingNoteId(null);
        await fetchSessionAndPath(false, false);
      } else {
        sendRemoteLog("ERROR", "Błąd zapisywania notatki (API Error)", undefined, {
          category: "session",
        });
        await appAlert({ message: dict.errSaveNote });
      }
    } catch (e: unknown) {
      sendRemoteLog(
        "ERROR",
        "Błąd sieci podczas zapisywania notatki",
        { error: e instanceof Error ? e.message : String(e) },
        { category: "session" }
      );
      await appAlert({ message: dict.errNetwork });
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    location: Coord | null
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsLoading(true);
      try {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => (img.onload = resolve));
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);

        const result = await offlineActionQueue.enqueue("upload_photo", {
          photoUrl: base64,
          location,
        });
        if (result.queued) {
          sendRemoteLog("INFO", "Zdjęcie zakolejkowane offline", undefined, {
            category: "session",
          });
          await appAlert({ message: dict.offlineQueuedPhoto });
          await fetchSessionAndPath(false, false);
        } else if (result.ok) {
          sendRemoteLog("INFO", "Zrobiono i wysłano zdjęcie", undefined, { category: "session" });
          await fetchSessionAndPath(false, false);
        } else {
          sendRemoteLog("ERROR", "Błąd wysyłania zdjęcia (API Error)", undefined, {
            category: "session",
          });
          await appAlert({ message: dict.photoError });
        }
      } catch (err: unknown) {
        sendRemoteLog(
          "ERROR",
          "Błąd kompresji lub wysyłania zdjęcia",
          { error: err instanceof Error ? err.message : String(err) },
          { category: "session" }
        );
        await appAlert({ message: dict.errProcessPhoto });
      } finally {
        setIsLoading(false);
      }
    }
  };

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

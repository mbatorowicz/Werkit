"use client";
import { useEffect } from "react";
import { offlineOwner } from "@/lib/offlineOwner";
import { readPendingPartPick } from "@/lib/partPickRequest";
import { isRecord } from "@/lib/narrowApiListRows";

type Setters = {
  setSelectedPartId: (value: string) => void;
  setAddQuantity: (value: string) => void;
  setAddNotes: (value: string) => void;
  setShowAddForm: (value: boolean) => void;
  setAddUnitPrice?: (value: string) => void;
};
/** Restore only this account's form; never automatically submit a warehouse movement. */
export function usePartPickRecovery(url: string | null, setters: Setters) {
  const { setSelectedPartId, setAddQuantity, setAddNotes, setShowAddForm, setAddUnitPrice } =
    setters;
  useEffect(() => {
    const owner = offlineOwner();
    if (!url || !owner) return;
    let disposed = false;
    void readPendingPartPick(url)
      .then((pending) => {
        if (disposed || offlineOwner() !== owner || !pending) return;
        const body: unknown = JSON.parse(pending.body);
        if (!isRecord(body) || typeof body.partId !== "number" || typeof body.quantity !== "string")
          return;
        setSelectedPartId(String(body.partId));
        setAddQuantity(body.quantity);
        setAddNotes(typeof body.notes === "string" ? body.notes : "");
        setAddUnitPrice?.(typeof body.unitPrice === "string" ? body.unitPrice : "");
        setShowAddForm(true);
      })
      .catch(() => {
        /* Submission fails closed if recovery storage is unavailable. */
      });
    return () => {
      disposed = true;
    };
  }, [url, setSelectedPartId, setAddQuantity, setAddNotes, setShowAddForm, setAddUnitPrice]);
}

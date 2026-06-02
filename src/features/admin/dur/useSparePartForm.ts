"use client";

import { useState, useCallback } from "react";
import type { SparePart } from "@/types/dur";
import {
  type SparePartFormState,
  createEmptySparePartForm,
  sparePartToFormState,
  formStateToSparePartInput,
} from "./sparePartFormTypes";

interface UseSparePartFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
  dict: {
    saveSuccess: string;
    apiErrors: Record<string, string>;
  };
}

export function useSparePartForm({ onSuccess, onError, dict }: UseSparePartFormProps) {
  const [formState, setFormState] = useState<SparePartFormState>(createEmptySparePartForm());
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = useCallback(() => {
    setFormState(createEmptySparePartForm());
    setEditingPart(null);
  }, []);

  const openEdit = useCallback((part: SparePart) => {
    setFormState(sparePartToFormState(part));
    setEditingPart(part);
  }, []);

  const save = useCallback(async () => {
    if (!formState.name.trim()) {
      onError(dict.apiErrors.missing_part_name || "Nazwa części jest wymagana.");
      return;
    }

    setIsSubmitting(true);
    try {
      const input = formStateToSparePartInput(formState, {
        omitPurchasePrice: editingPart === null,
      });
      const url = editingPart
        ? `/api/dur/spare-parts/${editingPart.id}`
        : "/api/dur/spare-parts";
      const method = editingPart ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errorCode = (errData as { error?: string }).error;
        const errorMessage =
          dict.apiErrors[errorCode || ""] || errorCode || dict.apiErrors.save_error;
        onError(errorMessage);
        return;
      }

      onSuccess();
    } catch {
      onError(dict.apiErrors.save_error || "Wystąpił błąd podczas zapisywania.");
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, editingPart, onSuccess, onError, dict]);

  return {
    formState,
    setFormState,
    editingPart,
    isSubmitting,
    openCreate,
    openEdit,
    save,
  };
}

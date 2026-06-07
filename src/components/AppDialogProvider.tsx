"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { useDictionary } from "@/components/LocaleProvider";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";

export type AppConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

export type AppAlertOptions = {
  title?: string;
  message: string;
  okLabel?: string;
};

type DialogState =
  | { kind: "idle" }
  | { kind: "confirm"; options: AppConfirmOptions }
  | { kind: "alert"; options: AppAlertOptions };

type AppDialogContextValue = {
  confirm: (options: AppConfirmOptions) => Promise<boolean>;
  alert: (options: AppAlertOptions) => Promise<void>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function useAppDialog(): AppDialogContextValue {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error("useAppDialog must be used within AppDialogProvider");
  }
  return ctx;
}

/** Mapuje kod błędu API na tekst z i18n. */
export function appDialogApiMessage(
  apiErrors: Record<string, string>,
  code: string | null | undefined,
  fallback: string
): string {
  if (!code) return fallback;
  return apiErrors[code] ?? code ?? fallback;
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const ui = useDictionary().admin.ui;
  const [state, setState] = useState<DialogState>({ kind: "idle" });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const alertResolveRef = useRef<(() => void) | null>(null);

  const confirm = useCallback((options: AppConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ kind: "confirm", options });
    });
  }, []);

  const alert = useCallback((options: AppAlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      alertResolveRef.current = resolve;
      setState({ kind: "alert", options });
    });
  }, []);

  const closeConfirm = useCallback((accepted: boolean) => {
    resolveRef.current?.(accepted);
    resolveRef.current = null;
    setState({ kind: "idle" });
  }, []);

  const closeAlert = useCallback(() => {
    alertResolveRef.current?.();
    alertResolveRef.current = null;
    setState({ kind: "idle" });
  }, []);

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  const confirmOpts = state.kind === "confirm" ? state.options : null;
  const alertOpts = state.kind === "alert" ? state.options : null;
  const danger = confirmOpts?.variant === "danger";

  return (
    <AppDialogContext.Provider value={value}>
      {children}

      {confirmOpts ? (
        <AdminModalShell
          open
          onClose={() => closeConfirm(false)}
          title={confirmOpts.title ?? ui.dialogConfirmTitle}
          maxWidthClass="max-w-md"
          titleSize="lg"
          zIndexClass="z-[10000]"
          closeOnBackdropClick={false}
          footer={
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className={cn("w-full sm:w-auto", BTN_SECONDARY)}
              >
                {confirmOpts.cancelLabel ?? ui.modalCancel}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={cn("w-full sm:w-auto", danger ? BTN_DANGER : BTN_PRIMARY)}
              >
                {confirmOpts.confirmLabel ?? ui.dialogConfirm}
              </button>
            </div>
          }
        >
          <p className="p-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {confirmOpts.message}
          </p>
        </AdminModalShell>
      ) : null}

      {alertOpts ? (
        <AdminModalShell
          open
          onClose={closeAlert}
          title={alertOpts.title ?? ui.dialogAlertTitle}
          maxWidthClass="max-w-md"
          titleSize="lg"
          zIndexClass="z-[10000]"
          closeOnBackdropClick={false}
          footer={
            <button
              type="button"
              onClick={closeAlert}
              className={cn("ml-auto w-full sm:w-auto", BTN_PRIMARY)}
            >
              {alertOpts.okLabel ?? ui.dialogOk}
            </button>
          }
        >
          <p className="p-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {alertOpts.message}
          </p>
        </AdminModalShell>
      ) : null}
    </AppDialogContext.Provider>
  );
}

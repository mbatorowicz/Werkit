"use client";

import { Loader2, Fingerprint } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { useDictionary } from "@/components/LocaleProvider";
import { BTN_LOGIN_SUBMIT } from "@/lib/uiButtons";
import { FIELD_LABEL, PAGE_SUBTITLE } from "@/lib/uiTypography";
import { INPUT_BASE } from "@/lib/uiTokens";
import { cn } from "@/lib/cn";

type Props = {
  loading: boolean;
  error: string;
  bioOffered: boolean;
  onBiometricLogin: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function LoginCardContent({
  loading,
  error,
  bioOffered,
  onBiometricLogin,
  onSubmit,
}: Props) {
  const dict = useDictionary();

  return (
    <>
      <div className="mb-8 text-center pt-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">
            WERKIT
          </h1>
          <span className="text-[11px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold mt-1">
            v{APP_VERSION}
          </span>
        </div>
        <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 tracking-tight">
          {dict.login.systemLogin}
        </h2>
        <p className={cn(PAGE_SUBTITLE, "mt-1")}>{dict.login.subtitle}</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">
          {error}
        </div>
      )}

      {bioOffered && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={onBiometricLogin}
            className="w-full mb-6 flex justify-center items-center gap-2 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium rounded-lg px-4 py-3.5 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                {dict.login.biometricLogin}
              </>
            )}
          </button>
          <p className="text-center text-xs text-zinc-500 mb-6 uppercase tracking-wider">
            {dict.login.biometricDivider}
          </p>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className={FIELD_LABEL} htmlFor="username">
            {dict.login.usernameLabel}
          </label>
          <input
            id="username"
            name="usernameEmail"
            type="text"
            required
            className={cn(INPUT_BASE, "py-3.5 placeholder-zinc-500")}
            placeholder={dict.login.usernamePlaceholder}
            autoComplete="username"
          />
        </div>
        <div className="space-y-1.5">
          <label className={FIELD_LABEL} htmlFor="password">
            {dict.login.passwordLabel}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className={cn(INPUT_BASE, "py-3.5 placeholder-zinc-500")}
            placeholder={dict.login.passwordPlaceholder}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={loading} className={cn(BTN_LOGIN_SUBMIT, "mt-2")}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : dict.login.submit}
        </button>
      </form>
    </>
  );
}

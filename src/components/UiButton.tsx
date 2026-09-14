"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  BTN_CTA_DANGER_XL,
  BTN_CTA_XL,
  BTN_DANGER,
  BTN_DANGER_FULL,
  BTN_DANGER_SOFT,
  BTN_GHOST,
  BTN_LOGIN_SUBMIT,
  BTN_SOFT_PRIMARY,
  BTN_PRIMARY,
  BTN_PRIMARY_COMPACT,
  BTN_PRIMARY_COMPACT_SM,
  BTN_PRIMARY_FULL,
  BTN_PRIMARY_LG,
  BTN_SECONDARY,
  BTN_SECONDARY_FULL,
  BTN_SECONDARY_SM,
} from "@/lib/uiButtons";

export type UiButtonVariant =
  | "primary"
  | "primaryFull"
  | "primaryCompact"
  | "primaryCompactSm"
  | "primaryLg"
  | "secondary"
  | "secondaryFull"
  | "secondarySm"
  | "danger"
  | "dangerFull"
  | "dangerSoft"
  | "ghost"
  | "login"
  | "softPrimary"
  | "cta"
  | "ctaDanger";

const VARIANT_CLASS: Record<UiButtonVariant, string> = {
  primary: BTN_PRIMARY,
  primaryFull: BTN_PRIMARY_FULL,
  primaryCompact: BTN_PRIMARY_COMPACT,
  primaryCompactSm: BTN_PRIMARY_COMPACT_SM,
  primaryLg: BTN_PRIMARY_LG,
  secondary: BTN_SECONDARY,
  secondaryFull: BTN_SECONDARY_FULL,
  secondarySm: BTN_SECONDARY_SM,
  danger: BTN_DANGER,
  dangerFull: BTN_DANGER_FULL,
  dangerSoft: BTN_DANGER_SOFT,
  ghost: BTN_GHOST,
  login: BTN_LOGIN_SUBMIT,
  softPrimary: BTN_SOFT_PRIMARY,
  cta: BTN_CTA_XL,
  ctaDanger: BTN_CTA_DANGER_XL,
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: UiButtonVariant;
  children?: ReactNode;
};

export function UiButton({
  variant = "primary",
  className,
  type = "button",
  children,
  ...props
}: Props) {
  return (
    <button type={type} className={cn(VARIANT_CLASS[variant], className)} {...props}>
      {children}
    </button>
  );
}

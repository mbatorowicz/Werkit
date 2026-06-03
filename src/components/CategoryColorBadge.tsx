"use client";

import { X } from "lucide-react";
import {
  CATEGORY_COLOR_BADGE_BASE_CLASS,
  CATEGORY_COLOR_BADGE_SIZE_CLASS,
  categoryAbbreviation,
  categoryColorBadgeStyle,
  categoryColorSwatchStyle,
  resolveCategoryColor,
} from "@/lib/categoryColorStyles";

type BadgeProps = {
  label: string;
  color?: string | null;
  size?: keyof typeof CATEGORY_COLOR_BADGE_SIZE_CLASS;
  className?: string;
};

export function CategoryColorBadge({ label, color, size = "sm", className = "" }: BadgeProps) {
  return (
    <span
      className={`${CATEGORY_COLOR_BADGE_BASE_CLASS} ${CATEGORY_COLOR_BADGE_SIZE_CLASS[size]} ${className}`.trim()}
      style={categoryColorBadgeStyle(color)}
    >
      {label}
    </span>
  );
}

/** Kompaktowy tag kategorii (inicjały); pełna nazwa w `title` przy najechaniu. */
export function CategoryColorAbbrevBadge({
  label,
  color,
  className = "",
}: {
  label: string;
  color?: string | null;
  className?: string;
}) {
  const abbrev = categoryAbbreviation(label);
  return (
    <span
      title={label.trim() || undefined}
      className={`${CATEGORY_COLOR_BADGE_BASE_CLASS} ${CATEGORY_COLOR_BADGE_SIZE_CLASS.abbrev} cursor-default ${className}`.trim()}
      style={categoryColorBadgeStyle(color)}
    >
      {abbrev}
    </span>
  );
}

type TagProps = {
  label: string;
  color?: string | null;
  onClear?: () => void;
  clearAriaLabel?: string;
  disabled?: boolean;
  className?: string;
};

/** Tag z opcjonalnym X (np. combobox materiału). */
export function CategoryColorTag({
  label,
  color,
  onClear,
  clearAriaLabel,
  disabled = false,
  className = "",
}: TagProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 ${CATEGORY_COLOR_BADGE_BASE_CLASS} ${CATEGORY_COLOR_BADGE_SIZE_CLASS.md} ${className}`.trim()}
      style={categoryColorBadgeStyle(color)}
    >
      <span className="truncate">{label}</span>
      {onClear ? (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={onClear}
          className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={clearAriaLabel}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

export function CategoryColorDot({
  color,
  className = "h-2 w-2 shrink-0 rounded-full",
}: {
  color?: string | null;
  className?: string;
}) {
  return (
    <span className={className} style={categoryColorSwatchStyle(color)} aria-hidden />
  );
}

/** Podgląd koloru w modalu admina (swatch + hex). */
export function CategoryColorPreview({
  color,
  className = "",
}: {
  color?: string | null;
  className?: string;
}) {
  const hex = resolveCategoryColor(color);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span
        className="inline-block h-4 w-4 rounded shadow-sm"
        style={categoryColorSwatchStyle(color)}
        aria-hidden
      />
      <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">{hex}</span>
    </span>
  );
}

"use client";

export function AdminCategoryColorFieldRow({
  color,
  onColorChange,
  label,
  hint,
}: {
  color: string;
  onColorChange: (next: string) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-10 h-10 rounded border-0 p-0 cursor-pointer"
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{hint}</span>
      </div>
    </div>
  );
}

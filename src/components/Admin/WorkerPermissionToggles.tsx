"use client";

export type WorkerPermissionToggleConfig = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
};

type Props = {
  toggles: WorkerPermissionToggleConfig[];
};

export function WorkerPermissionToggles({ toggles }: Props) {
  return (
    <div className="space-y-3 pt-2">
      {toggles.map((toggle) => (
        <div key={toggle.id} className="flex items-start gap-3">
          <label className="relative mt-0.5 flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={toggle.checked}
              onChange={(e) => toggle.onChange(e.target.checked)}
            />
            <div className="h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-zinc-700 dark:after:border-zinc-600" />
          </label>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {toggle.label}
            </span>
            {toggle.hint ? (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{toggle.hint}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

type ToggleConfig = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

type Props = {
  toggles: ToggleConfig[];
};

export function WorkerPermissionToggles({ toggles }: Props) {
  return (
    <div className="space-y-3 pt-2">
      {toggles.map((toggle) => (
        <div key={toggle.id} className="flex items-center gap-3">
          <label className="relative flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={toggle.checked}
              onChange={(e) => toggle.onChange(e.target.checked)}
            />
            <div className="h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-zinc-700 dark:after:border-zinc-600" />
          </label>
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{toggle.label}</span>
        </div>
      ))}
    </div>
  );
}

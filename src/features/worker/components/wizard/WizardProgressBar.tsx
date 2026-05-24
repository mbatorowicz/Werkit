"use client";

export function WizardProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step >= s ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {s}
          </div>
          {s < 5 && (
            <div className={`w-8 md:w-12 h-1 mx-1 rounded-full ${step > s ? "bg-emerald-500" : "bg-zinc-800"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

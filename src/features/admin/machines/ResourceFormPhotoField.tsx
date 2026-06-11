"use client";

import type { ChangeEvent } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";

interface ResourceFormPhotoFieldProps {
  dict: AppDictionary["admin"]["machines"];
  imageUrl: string | null;
  onPhotoPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onPhotoRemove: () => void;
}

export function ResourceFormPhotoField({
  dict,
  imageUrl,
  onPhotoPick,
  onPhotoRemove,
}: ResourceFormPhotoFieldProps) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {dict.machPhotoLabel}
      </label>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 sm:h-36 sm:w-36">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={dict.machPhotoLabel}
              width={144}
              height={144}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <Camera className="h-10 w-10 text-zinc-400" aria-hidden />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
            <Camera className="h-4 w-4 text-emerald-600" />
            {dict.machPhotoChoose}
            <input type="file" accept="image/*" className="hidden" onChange={onPhotoPick} />
          </label>
          {imageUrl ? (
            <button
              type="button"
              onClick={onPhotoRemove}
              className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
            >
              {dict.machPhotoRemove}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

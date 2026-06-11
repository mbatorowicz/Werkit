"use client";

import { Camera, FileText } from "lucide-react";

export interface OrderLabelCardHeaderProps {
  orderNo: string;
  title?: string | null;
  labelClass: string;
  isCompact: boolean;
  attachmentPhotos?: boolean;
  attachmentNotes?: boolean;
  photosTitle: string;
  notesTitle: string;
  badges?: React.ReactNode;
}

export function OrderLabelCardHeader({
  orderNo,
  title,
  labelClass,
  isCompact,
  attachmentPhotos,
  attachmentNotes,
  photosTitle,
  notesTitle,
  badges,
}: OrderLabelCardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${isCompact ? "mb-1.5" : "mb-2"}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`font-mono text-sm font-black ${labelClass}`}>{orderNo}</div>
          {title?.trim() ? (
            <div className={`text-sm font-black truncate ${labelClass}`}>{title}</div>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {(attachmentPhotos || attachmentNotes) && (
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mr-1">
            {attachmentPhotos ? (
              <span title={photosTitle}>
                <Camera className={`${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}`} aria-hidden />
              </span>
            ) : null}
            {attachmentNotes ? (
              <span title={notesTitle}>
                <FileText className={`${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}`} aria-hidden />
              </span>
            ) : null}
          </div>
        )}
        {badges ? badges : null}
      </div>
    </div>
  );
}

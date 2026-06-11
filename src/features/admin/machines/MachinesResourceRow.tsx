"use client";

import Image from "next/image";
import { Edit2, Trash2, Truck } from "lucide-react";
import { CategoryColorBadge } from "@/components/CategoryColorBadge";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import {
  TABLE_ACTION_ICON_DELETE,
  TABLE_ACTION_ICON_EDIT,
  TABLE_ACTIONS,
  TABLE_CELL_NAME,
  TABLE_CELL_SUBTITLE,
  TABLE_ROW_CLICKABLE,
  TABLE_TD,
  TABLE_TD_RIGHT,
} from "@/lib/uiTable";
import type { AppDictionary } from "@/i18n/types";
import type { MachinesCategory, MachinesResource } from "./types";

interface MachinesResourceRowProps {
  machine: MachinesResource;
  categories: MachinesCategory[];
  dict: AppDictionary["admin"]["machines"];
  canMutate: boolean;
  onPreview: (machine: MachinesResource) => void;
  onEdit: (machine: MachinesResource) => void;
  onDelete: (id: number) => void;
}

export function MachinesResourceRow({
  machine,
  categories,
  dict,
  canMutate,
  onPreview,
  onEdit,
  onDelete,
}: MachinesResourceRowProps) {
  const mCats = categories.filter((c) => machine.categoryIds?.includes(c.id));

  return (
    <tr onClick={() => onPreview(machine)} className={TABLE_ROW_CLICKABLE}>
      <td className={TABLE_TD}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
            {machine.imageUrl ? (
              <Image
                src={machine.imageUrl}
                alt={machine.name}
                width={48}
                height={48}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <Truck className="h-5 w-5 text-zinc-400" />
            )}
          </div>
          <div>
            <div className={TABLE_CELL_NAME}>{machine.name}</div>
            <div className={TABLE_CELL_SUBTITLE}>
              {dict.idReg} #{machine.id}
            </div>
          </div>
        </div>
      </td>
      <td className={TABLE_TD}>
        <div className="flex flex-wrap gap-1">
          {mCats.length > 0 ? (
            mCats.map((c) => <CategoryColorBadge key={c.id} label={c.name} color={c.color} />)
          ) : (
            <span className="text-xs italic text-zinc-500">{dict.noCategoryBadge}</span>
          )}
        </div>
      </td>
      {canMutate ? (
        <td className={TABLE_TD_RIGHT}>
          <div className={TABLE_ACTIONS}>
            <button
              type="button"
              onClick={(e) => {
                stopRowActionClick(e);
                onEdit(machine);
              }}
              className={TABLE_ACTION_ICON_EDIT}
              title={dict.editTitle}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                stopRowActionClick(e);
                void onDelete(machine.id);
              }}
              className={TABLE_ACTION_ICON_DELETE}
              title={dict.deleteTitle}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      ) : null}
    </tr>
  );
}

"use client";

import type { AppDictionary } from "@/i18n/types";
import { useDictionary } from "@/i18n";
import type { CategoryFormState } from "./types";

type Dict = AppDictionary["admin"]["machines"];

interface ParamRowProps {
  label: string;
  show: boolean;
  req: boolean;
  onShowChange: (visible: boolean) => void;
  onReqChange: (required: boolean) => void;
}

function ParamRow({ label, show, req, onShowChange, onReqChange }: ParamRowProps) {
  return (
    <>
      <div className="text-sm text-zinc-700 dark:text-zinc-300">{label}</div>
      <input
        type="checkbox"
        checked={show}
        onChange={(e) => onShowChange(e.target.checked)}
        className="h-4 w-4 rounded text-emerald-600"
      />
      <input
        type="checkbox"
        checked={req}
        disabled={!show}
        onChange={(e) => onReqChange(e.target.checked)}
        className="h-4 w-4 rounded text-amber-500 disabled:opacity-40"
      />
    </>
  );
}

interface ResourceCategoryParamsSectionProps {
  dict: Dict;
  form: CategoryFormState;
  setForm: React.Dispatch<React.SetStateAction<CategoryFormState>>;
}

export function ResourceCategoryParamsSection({
  dict,
  form,
  setForm,
}: ResourceCategoryParamsSectionProps) {
  const dictionary = useDictionary();

  return (
    <section className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {dict.catParamsTitle}
      </h3>

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2">
        <div />
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {dict.fieldsVisible}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {dict.fieldsRequired}
        </div>

        <ParamRow
          label={dict.fieldCustomer}
          show={form.showCustomer}
          req={form.reqCustomer}
          onShowChange={(v) =>
            setForm({ ...form, showCustomer: v, reqCustomer: v ? form.reqCustomer : false })
          }
          onReqChange={(v) => setForm({ ...form, reqCustomer: v })}
        />

        <ParamRow
          label={dict.fieldMaterial}
          show={form.showMaterial}
          req={form.reqMaterial}
          onShowChange={(v) =>
            setForm({ ...form, showMaterial: v, reqMaterial: v ? form.reqMaterial : false })
          }
          onReqChange={(v) => setForm({ ...form, reqMaterial: v })}
        />

        <ParamRow
          label={dict.fieldQuantity}
          show={form.showQuantity}
          req={form.reqQuantity}
          onShowChange={(v) =>
            setForm({ ...form, showQuantity: v, reqQuantity: v ? form.reqQuantity : false })
          }
          onReqChange={(v) => setForm({ ...form, reqQuantity: v })}
        />

        <ParamRow
          label={
            form.orderType === "machine_repair"
              ? dictionary.admin.orders.repairDescription
              : dict.fieldTaskDescription
          }
          show={form.showTaskDescription}
          req={form.reqTaskDescription}
          onShowChange={(v) =>
            setForm({
              ...form,
              showTaskDescription: v,
              reqTaskDescription: v ? form.reqTaskDescription : false,
            })
          }
          onReqChange={(v) => setForm({ ...form, reqTaskDescription: v })}
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {dict.isGlobalLabel}
          </label>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{dict.isGlobalDesc}</span>
        </div>
        <input
          type="checkbox"
          checked={form.isGlobal}
          onChange={(e) => setForm({ ...form, isGlobal: e.target.checked })}
          className="h-4 w-4 rounded text-amber-500"
        />
      </div>
    </section>
  );
}

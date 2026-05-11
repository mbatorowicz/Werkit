"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, HardHat, Plus, Edit2, Layers } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminCategoryColorFieldRow } from "@/components/Admin/AdminCategoryColorFieldRow";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";

type MaterialCategory = { id: number; name: string; color?: string | null };
type MaterialRow = { id: number; name: string; categoryIds?: number[] };

export default function MaterialsClient() {
  const { canMutate } = useAdminAbility();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [matEditId, setMatEditId] = useState<number | null>(null);
  const [matForm, setMatForm] = useState({
    name: "",
    categoryIds: [] as number[],
  });

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: "", color: "#3f3f46" });

  const dictionary = getDictionary();
  const dict = dictionary.admin.materials;
  const nav = dictionary.admin.sidebar;
  const machDict = dictionary.admin.machines;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const parseList = async (
        url: string,
      ): Promise<{ rows: unknown[]; errorCode?: string }> => {
        const res = await fetch(url, { cache: "no-store" });
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        if (!res.ok) {
          const code =
            body !== null &&
            typeof body === "object" &&
            "error" in body &&
            typeof (body as { error: unknown }).error === "string"
              ? (body as { error: string }).error
              : "";
          return { rows: [], errorCode: code || "fetch_error" };
        }
        if (!Array.isArray(body)) {
          return { rows: [], errorCode: "fetch_error" };
        }
        return { rows: body };
      };

      const [mList, cList] = await Promise.all([
        parseList("/api/materials"),
        parseList("/api/material-categories"),
      ]);
      setMaterials((Array.isArray(mList.rows) ? mList.rows : []) as MaterialRow[]);
      setCategories((Array.isArray(cList.rows) ? cList.rows : []) as MaterialCategory[]);

      const errCode = mList.errorCode ?? cList.errorCode;
      if (errCode) {
        console.error("Materials API:", { materials: mList, categories: cList });
        alert(apiErrors[errCode] ?? machDict.dbError);
      }
    } catch {
      alert(machDict.dbError);
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- machDict/apiErrors z i18n; pełny obiekt co render generowałby pętlę
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
    });
  }, [fetchData]);

  const handleCatSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = catEditId ? `/api/material-categories/${catEditId}` : "/api/material-categories";
    const method = catEditId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      if (res.ok) {
        setIsCatModalOpen(false);
        fetchData();
      } else {
        const err = (await res.json()) as { error?: string };
        alert(apiErrors[err.error ?? ""] ?? err.error);
      }
    } catch {
      alert(machDict.apiError);
    }
  };

  const handleCatDelete = async (id: number) => {
    if (!confirm(dict.confirmCatDelete)) return;
    const res = await fetch(`/api/material-categories/${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
    else {
      const err = (await res.json()) as { error?: string };
      alert(apiErrors[err.error ?? ""] ?? err.error);
    }
  };

  const handleMatSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matForm.categoryIds.length === 0) {
      alert(dict.matCatRequired);
      return;
    }
    const url = matEditId ? `/api/materials/${matEditId}` : "/api/materials";
    const method = matEditId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: matForm.name,
          categoryIds: matForm.categoryIds,
        }),
      });
      if (res.ok) {
        setIsMatModalOpen(false);
        fetchData();
      } else {
        const err = (await res.json()) as { error?: string };
        alert(apiErrors[err.error ?? ""] ?? err.error);
      }
    } catch {
      alert(machDict.apiError);
    }
  };

  const handleMatDelete = async (id: number) => {
    if (!confirm(dict.confirmDelete)) return;
    const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
    else {
      const err = (await res.json()) as { error?: string };
      alert(apiErrors[err.error ?? ""] ?? err.error);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <HardHat className="w-6 h-6 text-emerald-500" />
          {nav.materials}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">{dict.pageSubtitle}</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 pt-2">
            <Layers className="w-5 h-5 text-amber-500" /> {dict.dictTitle}
          </h2>
          <p className="text-zinc-500 mt-1 text-sm">{dict.dictSubtitle}</p>
        </div>
        {canMutate && (
          <button
            type="button"
            onClick={() => {
              setCatEditId(null);
              setCatForm({ name: "", color: "#3f3f46" });
              setIsCatModalOpen(true);
            }}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {dict.addCategory}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 rounded-lg flex justify-between items-center group shadow-sm hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-3 truncate">
              <div
                className="w-5 h-5 rounded-md shadow-sm shrink-0"
                style={{ backgroundColor: cat.color || "#3f3f46" }}
              />
              <span className="text-zinc-900 dark:text-zinc-200 font-medium truncate">{cat.name}</span>
            </div>
            {canMutate && (
              <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCatEditId(cat.id);
                    setCatForm({ name: cat.name, color: cat.color || "#3f3f46" });
                    setIsCatModalOpen(true);
                  }}
                  className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-amber-500 rounded-md transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCatDelete(cat.id)}
                  className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-red-500 rounded-md transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {!isLoading && categories.length === 0 && (
          <div className="col-span-full p-4 border border-zinc-200 dark:border-zinc-700/50 rounded-lg bg-white dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-sm">
            {dict.noCategories}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-t border-zinc-800/80 pt-10">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-500" /> {dict.sectionItemsTitle}
          </h2>
          <p className="text-zinc-500 mt-1">{dict.fleetSubtitle}</p>
        </div>
        {canMutate && (
          <button
            type="button"
            onClick={() => {
              setMatEditId(null);
              setMatForm({ name: "", categoryIds: [] });
              setIsMatModalOpen(true);
            }}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {dict.registerMaterial}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-[#0a0a0b]/80">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {dict.materialReg}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {machDict.dictCategory}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                  {machDict.management}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    {dict.fetching}
                  </td>
                </tr>
              ) : (
                materials.map((material) => {
                  const mCats = categories.filter((c) => material.categoryIds?.includes(c.id));
                  return (
                    <tr key={material.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-200">{material.name}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">
                          {machDict.idReg} #{material.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {mCats.length > 0 ? (
                            mCats.map((c) => (
                              <span
                                key={c.id}
                                className="border px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${c.color || "#71717a"}1a`,
                                  color: c.color || "#71717a",
                                  borderColor: `${c.color || "#71717a"}33`,
                                }}
                              >
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-500 italic text-xs">{machDict.noCategoryBadge}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canMutate && (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setMatEditId(material.id);
                                setMatForm({
                                  name: material.name,
                                  categoryIds: material.categoryIds || [],
                                });
                                setIsMatModalOpen(true);
                              }}
                              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition"
                              title={machDict.editTitle}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMatDelete(material.id)}
                              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                              title={machDict.deleteTitle}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {!isLoading && materials.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    {dict.noMaterials}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModalShell
        open={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={catEditId ? dict.modalCatEditTitle : dict.modalCatCreateTitle}
        maxWidthClass="max-w-sm"
        titleSize="sm"
      >
            <form onSubmit={handleCatSave} className="p-6 space-y-4">
              <input
                required
                type="text"
                placeholder={dict.catPlaceholder}
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none"
              />
              <AdminCategoryColorFieldRow
                color={catForm.color}
                onColorChange={(color) => setCatForm({ ...catForm, color })}
                label={machDict.catColorLabel}
                hint={machDict.catColorHint}
              />
              <button type="submit" className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-2.5 rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition mt-4">
                {dict.saveDict}
              </button>
            </form>
      </AdminModalShell>

      <AdminModalShell
        open={isMatModalOpen}
        onClose={() => setIsMatModalOpen(false)}
        title={matEditId ? dict.modalEditTitle : dict.modalCreateTitle}
        maxWidthClass="max-w-lg"
        titleSize="lg"
      >
            <form onSubmit={handleMatSave} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{dict.nameLabel}</label>
                <input
                  required
                  type="text"
                  placeholder={dict.namePlaceholder}
                  value={matForm.name}
                  onChange={(e) => setMatForm({ ...matForm, name: e.target.value })}
                  className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-500/80">{dict.matCatLabel}</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={matForm.categoryIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setMatForm({ ...matForm, categoryIds: [...matForm.categoryIds, c.id] });
                          else setMatForm({ ...matForm, categoryIds: matForm.categoryIds.filter((id) => id !== c.id) });
                        }}
                        className="rounded text-amber-500 w-4 h-4"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
                {categories.length === 0 && <p className="text-xs text-red-400">{machDict.machCatWarning}</p>}
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <button
                  type="submit"
                  className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg hover:bg-amber-500 transition active:scale-[0.98] shadow-sm"
                >
                  {dict.saveFleet}
                </button>
              </div>
            </form>
      </AdminModalShell>
    </>
  );
}

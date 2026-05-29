// ============================================================
// API: Kategorie maszyn (resource_categories) — tylko do odczytu
// Używane przez moduł DUR (kompatybilność części z maszynami)
// oraz inne komponenty wymagające listy kategorii maszyn.
// ============================================================

import { jsonOk, withApiErrorHandling } from "@/lib/apiRoute";
import { requireCompanyScopedSession } from "@/lib/apiTenant";
import { CategoryService } from "@/services/dictionary/CategoryService";

export const dynamic = 'force-dynamic';

/**
 * GET /api/resource-categories?leavesOnly=1
 * Zwraca listę kategorii maszyn (resource_categories) dla firmy.
 * Opcjonalny parametr `leavesOnly=1` filtruje tylko liście (nie-grupy).
 */
export const GET = withApiErrorHandling(async (request: Request) => {
  const scoped = await requireCompanyScopedSession();
  if (!scoped.ok) return scoped.response;

  const { searchParams } = new URL(request.url);
  const leavesOnly = searchParams.get("leavesOnly") === "1";

  const categories = await CategoryService.getCategories(scoped.data.companyId, { leavesOnly });
  return jsonOk(categories);
}, { defaultErrorCode: "fetch_error" });

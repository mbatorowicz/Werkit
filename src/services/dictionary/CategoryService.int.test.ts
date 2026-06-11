import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CategoryService } from "@/services/dictionary/CategoryService";
import { assertResourceCategoryAssignable } from "@/services/categoryHierarchyValidation";
import { cleanupTestCompany, createTestCompany, uniqueTestSlug } from "@/test/integrationDb";

/** Dodaje kategorię przez serwis i zwraca jej id (serwis nie zwraca rekordu). */
async function addCategoryAndGetId(
  companyId: number,
  data: { name: string; isGroup?: boolean; parentId?: number | null }
): Promise<number> {
  await CategoryService.addCategory(companyId, data);
  const all = await CategoryService.getCategories(companyId);
  const created = all.find((c) => c.name === data.name);
  if (!created) throw new Error(`Nie znaleziono utworzonej kategorii: ${data.name}`);
  return created.id;
}

describe("CategoryService (integracja z bazą — hierarchia kategorii)", () => {
  let companyId: number;
  let groupId: number;
  let leafId: number;

  beforeAll(async () => {
    const company = await createTestCompany();
    companyId = company.id;
    groupId = await addCategoryAndGetId(companyId, {
      name: `__ITEST grupa ${uniqueTestSlug()}`,
      isGroup: true,
    });
    leafId = await addCategoryAndGetId(companyId, {
      name: `__ITEST liść ${uniqueTestSlug()}`,
      isGroup: false,
      parentId: groupId,
    });
  });

  afterAll(async () => {
    await cleanupTestCompany(companyId);
  });

  it("tworzy grupę i liścia pod grupą; getCategories zwraca oba", async () => {
    const all = await CategoryService.getCategories(companyId);
    const group = all.find((c) => c.id === groupId);
    const leaf = all.find((c) => c.id === leafId);
    expect(group?.isGroup).toBe(true);
    expect(group?.parentId).toBeNull();
    expect(leaf?.isGroup).toBe(false);
    expect(leaf?.parentId).toBe(groupId);
  });

  it("leavesOnly zwraca tylko liście (bez grup)", async () => {
    const leaves = await CategoryService.getCategories(companyId, { leavesOnly: true });
    expect(leaves.some((c) => c.id === leafId)).toBe(true);
    expect(leaves.some((c) => c.id === groupId)).toBe(false);
    expect(leaves.every((c) => !c.isGroup)).toBe(true);
  });

  it("odrzuca rodzica, który nie jest grupą (parent_must_be_group)", async () => {
    await expect(
      CategoryService.addCategory(companyId, {
        name: `__ITEST zły rodzic ${uniqueTestSlug()}`,
        parentId: leafId,
      })
    ).rejects.toThrow("parent_must_be_group");
  });

  it("odrzuca nieistniejącego rodzica (invalid_parent)", async () => {
    await expect(
      CategoryService.addCategory(companyId, {
        name: `__ITEST brak rodzica ${uniqueTestSlug()}`,
        parentId: -1,
      })
    ).rejects.toThrow("invalid_parent");
  });

  it("odrzuca cykl rodzica: grupa nie może wskazać własnego potomka (invalid_parent)", async () => {
    const childGroupId = await addCategoryAndGetId(companyId, {
      name: `__ITEST podgrupa ${uniqueTestSlug()}`,
      isGroup: true,
      parentId: groupId,
    });
    // Sam siebie jako rodzic.
    await expect(
      CategoryService.updateCategory(companyId, groupId, { parentId: groupId })
    ).rejects.toThrow("invalid_parent");
    // Cykl: rodzic → własny potomek.
    await expect(
      CategoryService.updateCategory(companyId, groupId, { parentId: childGroupId })
    ).rejects.toThrow("invalid_parent");
    await CategoryService.deleteCategory(companyId, childGroupId);
  });

  it("grupa z dziećmi: nie można zamienić na liścia ani usunąć (group_has_children)", async () => {
    await expect(
      CategoryService.updateCategory(companyId, groupId, { isGroup: false })
    ).rejects.toThrow("group_has_children");
    await expect(CategoryService.deleteCategory(companyId, groupId)).rejects.toThrow(
      "group_has_children"
    );
  });

  it("grupa nie może być przypisywana do zlecenia/zasobu (invalid_category)", async () => {
    await expect(assertResourceCategoryAssignable(groupId, companyId)).rejects.toThrow(
      "invalid_category"
    );
    await expect(assertResourceCategoryAssignable(leafId, companyId)).resolves.toBeUndefined();
  });

  it("usuwa liścia, a po usunięciu pustą grupę", async () => {
    const tmpGroupId = await addCategoryAndGetId(companyId, {
      name: `__ITEST grupa tmp ${uniqueTestSlug()}`,
      isGroup: true,
    });
    const tmpLeafId = await addCategoryAndGetId(companyId, {
      name: `__ITEST liść tmp ${uniqueTestSlug()}`,
      parentId: tmpGroupId,
    });

    await CategoryService.deleteCategory(companyId, tmpLeafId);
    await CategoryService.deleteCategory(companyId, tmpGroupId);

    const all = await CategoryService.getCategories(companyId);
    expect(all.some((c) => c.id === tmpLeafId || c.id === tmpGroupId)).toBe(false);
  });
});

export type ResourceCategoryFilter = {
  id: number;
  isGlobal: boolean;
};

export type ResourceWithCategoryIds = {
  categoryIds?: number[];
};

/**
 * Filtruje zasoby (maszyny) przypisane do kategorii zlecenia.
 * `whenNoCategory` — wizard: true (pokaż wszystkie przed wyborem); admin form: false.
 */
export function filterResourcesForCategory<T extends ResourceWithCategoryIds>(
  resources: T[],
  category: ResourceCategoryFilter | undefined,
  options: { whenNoCategory: boolean }
): T[] {
  return resources.filter((resource) => {
    if (!category) return options.whenNoCategory;
    if (category.isGlobal) return true;
    return resource.categoryIds?.includes(category.id) ?? false;
  });
}

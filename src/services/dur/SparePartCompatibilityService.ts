import { db } from '@/db';
import { sparePartMachineCompatibility, spareParts, resourceCategories } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export class SparePartCompatibilityService {
  /**
   * Pobiera listę kompatybilności dla danej części.
   */
  static async getForPart(partId: number, companyId: number) {
    // Najpierw sprawdź, czy część należy do firmy
    const [part] = await db
      .select({ id: spareParts.id })
      .from(spareParts)
      .where(and(eq(spareParts.id, partId), eq(spareParts.companyId, companyId)))
      .limit(1);

    if (!part) return [];

    const rows = await db
      .select({
        categoryId: sparePartMachineCompatibility.categoryId,
        notes: sparePartMachineCompatibility.notes,
        categoryName: resourceCategories.name,
      })
      .from(sparePartMachineCompatibility)
      .innerJoin(
        resourceCategories,
        eq(sparePartMachineCompatibility.categoryId, resourceCategories.id),
      )
      .where(eq(sparePartMachineCompatibility.partId, partId));

    return rows;
  }

  /**
   * Pobiera listę części kompatybilnych z daną kategorią maszyny.
   */
  static async getForMachineCategory(categoryId: number, companyId: number) {
    const rows = await db
      .select({
        partId: sparePartMachineCompatibility.partId,
        notes: sparePartMachineCompatibility.notes,
        partName: spareParts.name,
        partCatalogNumber: spareParts.catalogNumber,
      })
      .from(sparePartMachineCompatibility)
      .innerJoin(spareParts, eq(sparePartMachineCompatibility.partId, spareParts.id))
      .where(
        and(
          eq(sparePartMachineCompatibility.categoryId, categoryId),
          eq(spareParts.companyId, companyId),
          eq(spareParts.isActive, true),
        ),
      );

    return rows;
  }

  /**
   * Dodaje kompatybilność (część → kategoria maszyny).
   */
  static async add(
    partId: number,
    categoryId: number,
    companyId: number,
    notes?: string,
  ) {
    // Sprawdź, czy część należy do firmy
    const [part] = await db
      .select({ id: spareParts.id })
      .from(spareParts)
      .where(and(eq(spareParts.id, partId), eq(spareParts.companyId, companyId)))
      .limit(1);

    if (!part) throw new Error('Part not found');

    // Sprawdź, czy kategoria maszyny istnieje
    const [cat] = await db
      .select({ id: resourceCategories.id })
      .from(resourceCategories)
      .where(
        and(eq(resourceCategories.id, categoryId), eq(resourceCategories.companyId, companyId)),
      )
      .limit(1);

    if (!cat) throw new Error('Machine category not found');

    await db
      .insert(sparePartMachineCompatibility)
      .values({ partId, categoryId, notes: notes ?? null })
      .onConflictDoNothing();

    return { partId, categoryId };
  }

  /**
   * Usuwa kompatybilność.
   */
  static async remove(partId: number, categoryId: number) {
    await db
      .delete(sparePartMachineCompatibility)
      .where(
        and(
          eq(sparePartMachineCompatibility.partId, partId),
          eq(sparePartMachineCompatibility.categoryId, categoryId),
        ),
      );
  }
}

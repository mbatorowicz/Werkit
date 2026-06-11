import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  customers,
  materials,
  resourceCategories,
  resources,
  stockIssues,
  stockReceipts,
  users,
} from "@/db/schema";

/**
 * Fixtures testów integracyjnych — każdy plik testowy pracuje na WŁASNEJ firmie
 * (izolacja multi-tenant), a po zakończeniu woła `cleanupTestCompany`.
 * Wszystkie nazwy mają prefiks `__itest`, żeby dało się je rozpoznać i awaryjnie usunąć ręcznie.
 */

export function uniqueTestSlug(): string {
  return `itest-${randomUUID().slice(0, 13)}`;
}

export async function createTestCompany(): Promise<{ id: number; slug: string }> {
  const slug = uniqueTestSlug();
  const [row] = await db
    .insert(companies)
    .values({ name: `__ITEST ${slug}`, slug, isActive: true })
    .returning({ id: companies.id, slug: companies.slug });
  return row;
}

export async function createTestUser(
  companyId: number,
  options: {
    role?: "admin" | "worker" | "viewer";
    passwordHash?: string;
    isDurWorker?: boolean;
    canCreateOwnOrders?: boolean;
  } = {}
): Promise<{ id: number; usernameEmail: string }> {
  const usernameEmail = `${uniqueTestSlug()}@itest.local`;
  const [row] = await db
    .insert(users)
    .values({
      companyId,
      fullName: `__ITEST ${options.role ?? "worker"}`,
      usernameEmail,
      passwordHash: options.passwordHash ?? "__itest-no-login",
      role: options.role ?? "worker",
      isActive: true,
      isDurWorker: options.isDurWorker ?? false,
      canCreateOwnOrders: options.canCreateOwnOrders ?? true,
    })
    .returning({ id: users.id, usernameEmail: users.usernameEmail });
  return row;
}

export async function createTestCategory(
  companyId: number,
  options: { name?: string; isGroup?: boolean; parentId?: number | null } = {}
): Promise<{ id: number }> {
  const [row] = await db
    .insert(resourceCategories)
    .values({
      companyId,
      name: options.name ?? `__ITEST kategoria ${uniqueTestSlug()}`,
      isGroup: options.isGroup ?? false,
      parentId: options.parentId ?? null,
    })
    .returning({ id: resourceCategories.id });
  return row;
}

export async function createTestResource(
  companyId: number,
  options: { name?: string } = {}
): Promise<{ id: number }> {
  const [row] = await db
    .insert(resources)
    .values({
      companyId,
      name: options.name ?? `__ITEST maszyna ${uniqueTestSlug()}`,
    })
    .returning({ id: resources.id });
  return row;
}

export async function createTestMaterial(
  companyId: number,
  options: { name?: string } = {}
): Promise<{ id: number }> {
  const [row] = await db
    .insert(materials)
    .values({
      companyId,
      name: options.name ?? `__ITEST materiał ${uniqueTestSlug()}`,
    })
    .returning({ id: materials.id });
  return row;
}

export async function createTestCustomer(
  companyId: number,
  options: { lastName?: string } = {}
): Promise<{ id: number }> {
  const [row] = await db
    .insert(customers)
    .values({
      companyId,
      lastName: options.lastName ?? `__ITEST klient ${uniqueTestSlug()}`,
    })
    .returning({ id: customers.id });
  return row;
}

/**
 * Usuwa firmę testową wraz z całą zawartością.
 * Kolejność: ruchy magazynowe → users → company.
 * Ruchy magazynowe muszą zejść przed userami: kaskada usunięcia usera robi SET NULL
 * na `stock_issues` w tej samej transakcji co DELETE `work_orders`, co wyzwala
 * rewalidację FK `work_order_id` i błąd 23503 (corner-case Postgresa).
 * Users przed company, bo FK `users.company_id` ma RESTRICT.
 */
export async function cleanupTestCompany(companyId: number): Promise<void> {
  await db.delete(stockIssues).where(eq(stockIssues.companyId, companyId));
  await db.delete(stockReceipts).where(eq(stockReceipts.companyId, companyId));
  await db.delete(users).where(eq(users.companyId, companyId));
  await db.delete(companies).where(eq(companies.id, companyId));
}

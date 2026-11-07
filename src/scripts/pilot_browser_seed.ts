import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { db, pool } from "@/db";
import { companySettings, workOrders } from "@/db/schema";
import {
  createTestCompany,
  createTestUser,
  createTestCategory,
  createTestResource,
} from "@/test/integrationDb";
import { hashPassword } from "@/lib/passwordCrypto";
import { WorkerOrderService } from "@/services/WorkerOrderService";
import { SparePartService } from "@/services/dur/SparePartService";
import { InventoryService } from "@/services/dur/InventoryService";
async function main() {
  assert.equal(process.env.PILOT_DRILL, "isolated-local");
  for (const key of [
    "DATABASE_URL",
    "POSTGRES_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL_NON_POOLING",
  ]) {
    const url = new URL(process.env[key] || "");
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.pathname, "/werkit_drill_source");
  }
  assert.equal((await pool.query("select count(*)::int as n from companies")).rows[0].n, 0);
  const companyId = (await createTestCompany()).id;
  await db
    .insert(companySettings)
    .values({ companyId, durEnabled: true, requirePhotoToFinish: false });
  const categoryId = (await createTestCategory(companyId, { reqTaskDescription: false })).id;
  const password = "Pilot-Only-2026!";
  const passwordHash = await hashPassword(password);
  const accounts = [];
  for (const role of ["worker", "worker", "admin"] as const) {
    const user = await createTestUser(companyId, { role, passwordHash, isDurWorker: true });
    const resourceId = (await createTestResource(companyId)).id;
    const [order] = await db
      .insert(workOrders)
      .values({
        companyId,
        userId: user.id,
        resourceId,
        categoryId,
        orderType: "machine_repair",
        status: "PENDING",
      })
      .returning();
    await WorkerOrderService.acceptOrder(user.id, companyId, order.id);
    accounts.push({ ...user, orderId: order.id });
  }
  const partId = await SparePartService.addPart(companyId, {
    name: "TEST browser part",
    catalogNumber: "BROWSER-01",
  });
  await InventoryService.setQuantity(companyId, partId, "10");
  writeFileSync(
    process.env.PILOT_REPORT!,
    JSON.stringify({ companyId, password, accounts, partId })
  );
}
main().finally(() => pool.end());

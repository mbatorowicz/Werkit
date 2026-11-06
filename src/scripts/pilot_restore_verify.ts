import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pool } from "@/db";
import { OfflineOperationService } from "@/services/OfflineOperationService";
import { WorkerSessionService } from "@/services/WorkerSessionService";
async function main() {
  assert.equal(process.env.PILOT_DRILL, "isolated-local");
  for (const key of [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
  ]) {
    const u = new URL(process.env[key] || "");
    assert.equal(u.hostname, "127.0.0.1");
    assert.equal(u.pathname, "/werkit_drill_restored");
  }
  const replays: unknown = JSON.parse(readFileSync(".pilot-drill/replay.json", "utf8"));
  assert(Array.isArray(replays));
  assert.equal(replays.length, 40);
  for (const item of replays) {
    assert(
      item &&
        typeof item === "object" &&
        typeof item.userId === "number" &&
        typeof item.companyId === "number"
    );
    assert.equal(
      (await OfflineOperationService.execute(item.userId, item.companyId, item.action)).replayed,
      true
    );
    assert.equal(
      (await WorkerSessionService.getCompletedSessions(item.userId, item.companyId)).length,
      1
    );
  }
  const { rows } = await pool.query("select count(*)::int as n from offline_operations");
  assert.equal(rows[0].n, 80);
  console.log("Restored application reads and 40 idempotent retries: PASS");
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Restore smoke failed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());

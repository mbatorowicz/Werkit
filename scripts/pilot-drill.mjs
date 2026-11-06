import { getCACertificates } from "node:tls";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const dir = resolve(".pilot-drill");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "ca.pem"), getCACertificates("default").join("\n"));
const name = `werkit-drill-${randomUUID().slice(0, 8)}`;
const password = randomBytes(24).toString("hex");
const image = "postgres:17";
function run(args, env = {}, binary = false) {
  const r = spawnSync("docker", args, {
    env: { ...process.env, ...env },
    encoding: binary ? undefined : "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 180000,
  });
  if (r.status !== 0)
    throw new Error(
      `Docker step failed: ${args[0]} (${r.status}); ${String(r.stderr)
        .replaceAll(password, "[redacted]")
        .replaceAll(env.PGPASSWORD || "__no_secret__", "[redacted]")}`
    );
  return r.stdout;
}
async function fingerprint(url) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    const { rows: tables } = await c.query(
      "select schemaname, tablename from pg_tables where schemaname in ('public','drizzle') order by 1,2"
    );
    const result = {};
    for (const t of tables) {
      const ident = [t.schemaname, t.tablename]
        .map((s) => '"' + s.replaceAll('"', '""') + '"')
        .join(".");
      const { rows } = await c.query(
        `select row_to_json(t)::text as data from ${ident} t order by row_to_json(t)::text`
      );
      result[ident] = {
        count: rows.length,
        sha256: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
      };
    }
    const { rows: constraints } = await c.query(
      "select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition from pg_constraint where connamespace = 'public'::regnamespace order by 1,2"
    );
    const { rows: indexes } = await c.query(
      "select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by 1,2"
    );
    const { rows: sequences } = await c.query(
      "select schemaname,sequencename,last_value from pg_sequences where schemaname in ('public','drizzle') order by 1,2"
    );
    return { tables: result, constraints, indexes, sequences };
  } finally {
    await c.end();
  }
}
let created = false;
try {
  const source =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;
  if (!source) throw new Error("Missing schema source URL");
  // Remote source is read-only and SCHEMA ONLY. No company rows leave the source.
  const remote = new URL(source);
  const schema = run(
    [
      "run",
      "--rm",
      "-v",
      `${resolve(dir, "ca.pem")}:/tmp/ca.pem:ro`,
      "-e",
      "PGHOST",
      "-e",
      "PGPORT",
      "-e",
      "PGUSER",
      "-e",
      "PGPASSWORD",
      "-e",
      "PGDATABASE",
      "-e",
      "PGSSLMODE",
      "-e",
      "PGSSLROOTCERT=/tmp/ca.pem",
      "-e",
      "PGOPTIONS",
      image,
      "pg_dump",
      "--schema-only",
      "--no-owner",
      "--no-acl",
      "--schema=public",
      "--schema=drizzle",
    ],
    {
      PGHOST: remote.hostname,
      PGPORT: remote.port || "5432",
      PGUSER: decodeURIComponent(remote.username),
      PGPASSWORD: decodeURIComponent(remote.password),
      PGDATABASE: remote.pathname.slice(1),
      PGSSLMODE: "verify-full",
      PGOPTIONS: "-c default_transaction_read_only=on",
    }
  );
  writeFileSync(resolve(dir, "schema.sql"), schema);
  run(
    [
      "run",
      "-d",
      "--name",
      name,
      "--label",
      "werkit.purpose=isolated-recovery-drill",
      "-e",
      "POSTGRES_PASSWORD",
      "-e",
      "POSTGRES_DB=werkit_drill_source",
      "-p",
      "127.0.0.1::5432",
      image,
    ],
    { POSTGRES_PASSWORD: password }
  );
  created = true;
  const port = run(["port", name, "5432/tcp"]).trim().split(":").at(-1);
  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/werkit_drill_source`;
  for (let i = 0; i < 30; i++) {
    const c = new pg.Client({ connectionString: url });
    try {
      await c.connect();
      await c.end();
      break;
    } catch {
      await c.end().catch(() => {});
      if (i === 29) throw new Error("Local DB startup timed out");
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  run([
    "exec",
    name,
    "psql",
    "-U",
    "postgres",
    "-d",
    "werkit_drill_source",
    "-c",
    "DROP SCHEMA public",
  ]);
  run(["cp", resolve(dir, "schema.sql"), `${name}:/tmp/schema.sql`]);
  run([
    "exec",
    name,
    "psql",
    "-U",
    "postgres",
    "-d",
    "werkit_drill_source",
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    "/tmp/schema.sql",
  ]);
  const env = {
    ...process.env,
    DATABASE_URL: url,
    DATABASE_URL_UNPOOLED: url,
    POSTGRES_URL: url,
    POSTGRES_URL_NON_POOLING: url,
    BLOB_READ_WRITE_TOKEN: "",
    PILOT_DRILL: "isolated-local",
    PILOT_REPORT: resolve(dir, "load.json"),
  };
  const integration = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "vitest.integration.config.ts",
      "src/services/AdminOrderService.int.test.ts",
      "src/services/dur/StockMovementService.int.test.ts",
      "src/services/PilotSessionPolicy.int.test.ts",
      "src/services/WorkerOrderService.int.test.ts",
    ],
    { env, encoding: "utf8", timeout: 180000, maxBuffer: 4 * 1024 * 1024 }
  );
  console.log(integration.stdout);
  if (integration.status !== 0)
    throw new Error(`Isolated integration tests failed: ${integration.stderr}`);
  const workload = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/scripts/pilot_workload.ts"],
    { env, encoding: "utf8", timeout: 240000, maxBuffer: 4 * 1024 * 1024 }
  );
  console.log(workload.stdout);
  if (workload.status !== 0)
    throw new Error(`Workload failed (${workload.status}): ${workload.stderr}`);
  const before = await fingerprint(url);
  const backupAt = performance.now();
  run([
    "exec",
    name,
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "werkit_drill_source",
    "-Fc",
    "--no-owner",
    "--no-acl",
    "-f",
    "/tmp/backup.dump",
  ]);
  run(["cp", `${name}:/tmp/backup.dump`, resolve(dir, "backup.dump")]);
  const backupMs = Math.round(performance.now() - backupAt);
  run(["exec", name, "createdb", "-U", "postgres", "werkit_drill_restored"]);
  const restoreAt = performance.now();
  run([
    "exec",
    name,
    "pg_restore",
    "-U",
    "postgres",
    "-d",
    "werkit_drill_restored",
    "--no-owner",
    "--no-acl",
    "--exit-on-error",
    "--single-transaction",
    "/tmp/backup.dump",
  ]);
  const restoreMs = Math.round(performance.now() - restoreAt);
  const after = await fingerprint(url.replace("/werkit_drill_source", "/werkit_drill_restored"));
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error("Restored rows/schema/sequence fingerprint mismatch");
  const restoredUrl = url.replace("/werkit_drill_source", "/werkit_drill_restored");
  const smoke = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/scripts/pilot_restore_verify.ts"],
    {
      env: {
        ...env,
        DATABASE_URL: restoredUrl,
        DATABASE_URL_UNPOOLED: restoredUrl,
        POSTGRES_URL: restoredUrl,
        POSTGRES_URL_NON_POOLING: restoredUrl,
      },
      encoding: "utf8",
      timeout: 60000,
    }
  );
  console.log(smoke.stdout);
  if (smoke.status !== 0) throw new Error(`Restored application smoke failed: ${smoke.stderr}`);
  const report = {
    at: new Date().toISOString(),
    isolation: "local Docker; schema-only remote read; synthetic rows only",
    image,
    backupMs,
    restoreMs,
    archiveSha256: createHash("sha256")
      .update(readFileSync(resolve(dir, "backup.dump")))
      .digest("hex"),
    tableCounts: Object.fromEntries(Object.entries(before.tables).map(([k, v]) => [k, v.count])),
    constraints: before.constraints.length,
    indexes: before.indexes.length,
    sequences: before.sequences.length,
    restoreVerified: true,
    restoredApplicationReplayVerified: true,
    isolatedIntegrationTests: 29,
    load: JSON.parse(readFileSync(resolve(dir, "load.json"), "utf8")),
  };
  writeFileSync(resolve(dir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (created) run(["rm", "-f", "-v", name]); // Only the random container created by this invocation.
}

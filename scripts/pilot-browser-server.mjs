import http from "node:http";
import { getCACertificates } from "node:tls";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, openSync, rmSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const dir = resolve(".pilot-drill");
const production = process.argv.includes("--production");
mkdirSync(dir, { recursive: true });
rmSync(resolve(dir, "browser-stop"), { force: true });
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
let created = false;
let app;
let control;
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
    NODE_ENV: production ? "production" : "development",
    DATABASE_URL: url,
    DATABASE_URL_UNPOOLED: url,
    POSTGRES_URL: url,
    POSTGRES_URL_NON_POOLING: url,
    BLOB_READ_WRITE_TOKEN: "",
    PILOT_DRILL: "isolated-local",
    PILOT_REPORT: resolve(dir, "load.json"),
  };
  env.JWT_SECRET = randomBytes(48).toString("hex");
  env.WERKIT_USE_BCRYPTJS = "1";
  env.PILOT_REPORT = resolve(dir, "browser-fixture.json");
  const seed = spawnSync(
    process.execPath,
    ["--import", "tsx", "src/scripts/pilot_browser_seed.ts"],
    { env, encoding: "utf8", timeout: 60000 }
  );
  if (seed.status !== 0) throw new Error(`Seed failed: ${seed.stderr}`);
  const fixture = JSON.parse(readFileSync(env.PILOT_REPORT, "utf8"));
  fixture.profileRoot = resolve(dir, "browser-profiles");
  fixture.buildMode = production ? "production" : "development";
  const log = openSync(resolve(dir, "browser-app.log"), "w");
  if (production) {
    const buildLog = openSync(resolve(dir, "browser-build.log"), "w");
    const build = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
      env,
      stdio: ["ignore", buildLog, buildLog],
      windowsHide: true,
      timeout: 300000,
    });
    if (build.status !== 0)
      throw new Error("Isolated production build failed; see .pilot-drill/browser-build.log");
  }
  app = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      production ? "start" : "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "4317",
    ],
    { env, stdio: ["ignore", log, log], windowsHide: true }
  );
  control = http.createServer(async (req, res) => {
    if (req.method !== "GET" || req.url !== "/state") {
      res.writeHead(404).end();
      return;
    }
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      const { rows } = await client.query(
        "select (select count(*)::int from stock_issues) as issues, (select count(*)::int from work_order_spare_parts) as lines, (select count(*)::int from part_pick_operations) as receipts, (select quantity from spare_part_inventory limit 1) as stock"
      );
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ fixture, state: rows[0] }));
    } catch {
      res.writeHead(500).end();
    } finally {
      await client.end();
    }
  });
  await new Promise((resolve, reject) => {
    control.once("error", reject);
    control.listen(4318, "127.0.0.1", resolve);
  });
  console.log(
    "Isolated browser app: http://127.0.0.1:4317; read-only test state: http://127.0.0.1:4318/state"
  );
  const until = Date.now() + 30 * 60_000;
  while (!existsSync(resolve(dir, "browser-stop")) && Date.now() < until && app.exitCode === null)
    await new Promise((r) => setTimeout(r, 1000));
} finally {
  control?.close();
  if (app?.pid) spawnSync("taskkill", ["/PID", String(app.pid), "/T", "/F"], { windowsHide: true });
  if (created) run(["rm", "-f", "-v", name]);
}

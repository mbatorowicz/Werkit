/**
 * Podgląd ostatnich wpisów `device_logs` z bazy (to samo źródło co `/admin/logs`).
 * Uruchom z katalogu projektu przy ustawionym `DATABASE_URL` / `POSTGRES_URL` w `.env.local`.
 *
 * Przykłady:
 *   npm run logs:device
 *   npm run logs:device -- --limit 80 --level ERROR
 *   npm run logs:device -- --user 3 --category admin
 *   npm run logs:device -- --minutes 10 --limit 200
 *   npm run logs:device -- --full
 */
import { loadEnvConfig } from "@next/env";
import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";

function printHelp(): void {
  console.log(`Użycie: npm run logs:device -- [opcje]

Opcje:
  --limit N     Liczba wierszy (domyślnie 40, max 500)
  --level L     Filtr: INFO | WARN | ERROR | DEBUG
  --user ID     Filtr po user_id
  --category C  Filtr po metadata.category lub werkitContext.category (np. admin, http, session)
  --minutes M   Tylko wpisy z ostatnich M minut (1–1440)
  --full          Pełny JSON metadanych zamiast jednej linii podsumowania
  --json          Cały rekord jako JSON (NDJSON) — do przekierowania / narzędzi
  --help          Ta pomoc
`);
}

function argEquals(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

/** `--limit=3` lub `--limit 3` */
function optString(name: string): string | undefined {
  const v = argEquals(name);
  if (v !== undefined) return v;
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0) {
    const next = process.argv[idx + 1];
    if (next && !next.startsWith("-")) return next;
  }
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function pickCategoryFromMetadata(md: unknown): string | undefined {
  if (!md || typeof md !== "object" || Array.isArray(md)) return undefined;
  const o = md as Record<string, unknown>;
  if (typeof o.category === "string") return o.category;
  const wc = o.werkitContext;
  if (wc && typeof wc === "object" && !Array.isArray(wc)) {
    const c = (wc as Record<string, unknown>).category;
    if (typeof c === "string") return c;
  }
  return undefined;
}

function summarizeMetadata(md: unknown): string {
  const cat = pickCategoryFromMetadata(md);
  const parts: string[] = [];
  if (cat) parts.push(cat);
  if (!md || typeof md !== "object" || Array.isArray(md)) return parts.join(" · ") || "—";
  const o = md as Record<string, unknown>;
  const wc = o.werkitContext;
  if (wc && typeof wc === "object" && !Array.isArray(wc)) {
    const w = wc as Record<string, unknown>;
    const client = w.client;
    if (client && typeof client === "object" && !Array.isArray(client)) {
      const c = client as Record<string, unknown>;
      if (typeof c.appVersion === "string") parts.push(`app ${c.appVersion}`);
      if (typeof c.platform === "string") parts.push(c.platform);
      if (typeof c.path === "string") parts.push(c.path);
    }
    const server = w.server;
    if (server && typeof server === "object" && !Array.isArray(server)) {
      const s = server as Record<string, unknown>;
      if (typeof s.region === "string" && s.region) parts.push(`edge ${s.region}`);
    }
  }
  if (typeof o.status === "number") parts.push(`HTTP ${o.status}`);
  return parts.join(" · ") || "—";
}

async function main(): Promise<void> {
  if (hasFlag("help")) {
    printHelp();
    process.exit(0);
  }

  loadEnvConfig(process.cwd());

  const { ensurePostgresUrlForVercelDriver } = await import("@/lib/resolveNeonPostgresUrl");
  if (!ensurePostgresUrlForVercelDriver()) {
    console.error("Brak DATABASE_URL / POSTGRES_URL — ustaw .env.local (patrz inne skrypty db:*).");
    process.exit(1);
  }

  const limitRaw = optString("limit") ?? "40";
  const limit = Math.min(500, Math.max(1, Number.parseInt(limitRaw, 10) || 40));
  const level = optString("level")?.trim().toUpperCase();
  const userRaw = optString("user");
  const userId = userRaw !== undefined ? Number.parseInt(userRaw, 10) : undefined;
  const category = optString("category")?.trim();
  const minutesRaw = optString("minutes");
  const minutesParsed = minutesRaw !== undefined ? Number.parseInt(minutesRaw, 10) : undefined;
  const minutes =
    minutesParsed !== undefined && !Number.isNaN(minutesParsed)
      ? Math.min(1440, Math.max(1, minutesParsed))
      : undefined;
  if (minutesRaw !== undefined && minutes === undefined) {
    console.error("Nieprawidłowy --minutes (oczekiwano liczby 1–1440).");
    process.exit(1);
  }
  const full = hasFlag("full");
  const asJson = hasFlag("json");

  if (level && !["INFO", "WARN", "ERROR", "DEBUG"].includes(level)) {
    console.error('Nieprawidłowy --level (dozwolone: INFO, WARN, ERROR, DEBUG).');
    process.exit(1);
  }
  if (userId !== undefined && (Number.isNaN(userId) || userId < 1)) {
    console.error("Nieprawidłowy --user (oczekiwano dodatniego ID).");
    process.exit(1);
  }

  const { db } = await import("@/db");
  const { deviceLogs, users } = await import("@/db/schema");

  const filters: SQL[] = [];
  if (level) filters.push(eq(deviceLogs.level, level));
  if (userId !== undefined && !Number.isNaN(userId)) filters.push(eq(deviceLogs.userId, userId));
  if (category) {
    filters.push(
      sql`coalesce(${deviceLogs.metadata}->>'category', ${deviceLogs.metadata}#>>'{werkitContext,category}') = ${category}`,
    );
  }
  if (minutes !== undefined) {
    const since = new Date(Date.now() - minutes * 60_000);
    filters.push(gte(deviceLogs.createdAt, since));
  }
  const whereClause: SQL = filters.length === 0 ? sql`true` : filters.length === 1 ? filters[0]! : and(...filters)!;

  const rows = await db
    .select({
      id: deviceLogs.id,
      userId: deviceLogs.userId,
      level: deviceLogs.level,
      message: deviceLogs.message,
      metadata: deviceLogs.metadata,
      createdAt: deviceLogs.createdAt,
      workerName: users.fullName,
    })
    .from(deviceLogs)
    .leftJoin(users, eq(deviceLogs.userId, users.id))
    .where(whereClause)
    .orderBy(desc(deviceLogs.createdAt))
    .limit(limit);

  if (rows.length === 0) {
    console.log("(brak wpisów dla podanych filtrów)");
    process.exit(0);
  }

  for (const r of rows) {
    const created = r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);
    const name = r.workerName ?? "?";
    if (asJson) {
      console.log(
        JSON.stringify({
          id: r.id,
          userId: r.userId,
          workerName: r.workerName,
          level: r.level,
          message: r.message,
          metadata: r.metadata,
          createdAt: created,
        }),
      );
      continue;
    }
    const head = `[${created}] [${r.level}] [user ${r.userId ?? "null"}] [${name}]`;
    console.log(`${head}\n  ${r.message}`);
    if (full) {
      console.log(`  metadata: ${JSON.stringify(r.metadata, null, 2).split("\n").join("\n  ")}`);
    } else {
      console.log(`  ctx: ${summarizeMetadata(r.metadata)}`);
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

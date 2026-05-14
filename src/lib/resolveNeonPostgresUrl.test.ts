import { afterEach, describe, expect, it } from "vitest";
import { ensurePostgresUrlForVercelDriver, resolveNeonPostgresUrl } from "@/lib/resolveNeonPostgresUrl";

const envKeys = [
  "POSTGRES_URL",
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NO_SSL",
  "PGHOST",
  "POSTGRES_HOST",
  "PGHOST_UNPOOLED",
  "PGUSER",
  "POSTGRES_USER",
  "PGPASSWORD",
  "POSTGRES_PASSWORD",
  "PGDATABASE",
  "POSTGRES_DATABASE",
] as const;

const snapshot: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

function stashEnv(): void {
  for (const k of envKeys) {
    snapshot[k] = process.env[k];
    delete process.env[k];
  }
}

function restoreEnv(): void {
  for (const k of envKeys) {
    const v = snapshot[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe("resolveNeonPostgresUrl", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("zwraca POSTGRES_URL gdy ustawione (pierwszeństwo przed DATABASE_URL)", () => {
    stashEnv();
    process.env.POSTGRES_URL = "postgresql://a:a@host/postgres";
    process.env.DATABASE_URL = "postgresql://b:b@other/db";
    expect(resolveNeonPostgresUrl()).toBe("postgresql://a:a@host/postgres");
  });

  it("zwraca DATABASE_URL gdy POSTGRES_URL puste", () => {
    stashEnv();
    process.env.DATABASE_URL = "postgresql://user:pass@ep-neon/db";
    expect(resolveNeonPostgresUrl()).toBe("postgresql://user:pass@ep-neon/db");
  });

  it("buduje URL z PG* gdy brak connection stringa", () => {
    stashEnv();
    process.env.PGHOST = "db.example.com";
    process.env.PGUSER = "u ser";
    process.env.PGPASSWORD = "p:word";
    process.env.PGDATABASE = "mydb";
    expect(resolveNeonPostgresUrl()).toBe("postgresql://u%20ser:p%3Aword@db.example.com/mydb");
  });

  it("dopina sslmode=require dla hosta neon.tech", () => {
    stashEnv();
    process.env.PGHOST = "ep-foo.eu-central-1.aws.neon.tech";
    process.env.PGUSER = "u";
    process.env.PGPASSWORD = "p";
    process.env.PGDATABASE = "d";
    expect(resolveNeonPostgresUrl()).toContain("sslmode=require");
  });

  it("zwraca undefined gdy brak danych do zbudowania URL", () => {
    stashEnv();
    expect(resolveNeonPostgresUrl()).toBeUndefined();
  });
});

describe("ensurePostgresUrlForVercelDriver", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("ustawia POSTGRES_URL z DATABASE_URL i zwraca true", () => {
    stashEnv();
    process.env.DATABASE_URL = "postgresql://x:y@h/db";
    expect(ensurePostgresUrlForVercelDriver()).toBe(true);
    expect(process.env.POSTGRES_URL).toBe("postgresql://x:y@h/db");
  });

  it("zwraca false gdy nie ma żadnego URL", () => {
    stashEnv();
    expect(ensurePostgresUrlForVercelDriver()).toBe(false);
  });
});

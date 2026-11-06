import nextEnv from "@next/env";
import { put, get, del } from "@vercel/blob";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
nextEnv.loadEnvConfig(process.cwd());
const prefix = `__werkit_recovery_drill/${randomUUID()}/`;
const created = [];
const hash = (b) => createHash("sha256").update(b).digest("hex");
const bytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1sAAAAASUVORK5CYII=",
  "base64"
);
async function download(url) {
  const result = await get(url, { access: "private", useCache: false });
  assert.equal(result?.statusCode, 200);
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}
try {
  mkdirSync(".pilot-drill", { recursive: true });
  const original = await put(prefix + "source.png", bytes, {
    access: "private",
    addRandomSuffix: false,
  });
  created.push(original.url);
  const backup = await download(original.url);
  assert.equal(hash(backup), hash(bytes));
  writeFileSync(".pilot-drill/synthetic-photo.png", backup);
  const restored = await put(
    prefix + "restored.png",
    readFileSync(".pilot-drill/synthetic-photo.png"),
    { access: "private", addRandomSuffix: false }
  );
  created.push(restored.url);
  assert.equal(hash(await download(restored.url)), hash(bytes));
  const report = {
    at: new Date().toISOString(),
    syntheticOnly: true,
    bytes: bytes.length,
    sha256: hash(bytes),
    downloadBackupRestoreVerified: true,
    scope: "two new objects under unique test prefix; no existing company photos accessed",
  };
  writeFileSync(".pilot-drill/blob-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  for (const url of created) {
    assert(new URL(url).pathname.startsWith("/" + prefix));
    await del(url);
  }
}

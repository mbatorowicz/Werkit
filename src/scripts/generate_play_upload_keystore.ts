/**
 * Tworzy lokalny klucz uploadu Google Play (RSA 4096).
 * Pliki są gitignored — zrób kopię zapasową OFFLINE.
 * Uruchom: npm run android:play-keystore
 */
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ANDROID = join(ROOT, "android");
const KEYSTORE = join(ANDROID, "upload-keystore.jks");
const ENV_FILE = join(ANDROID, ".upload-keystore.env");
const PROPS = join(ANDROID, "keystore.properties");
const ALIAS = "werkit-upload";

if (existsSync(KEYSTORE)) {
  console.error("android/upload-keystore.jks już istnieje — nie nadpisuję.");
  process.exit(1);
}

function randomPassword(): string {
  return randomBytes(24).toString("base64url");
}

const storePassword = randomPassword();
const keyPassword = storePassword;

const result = spawnSync(
  "keytool",
  [
    "-genkeypair",
    "-v",
    "-keystore",
    KEYSTORE,
    "-storetype",
    "PKCS12",
    "-keyalg",
    "RSA",
    "-keysize",
    "4096",
    "-validity",
    "10000",
    "-alias",
    ALIAS,
    "-storepass",
    storePassword,
    "-keypass",
    keyPassword,
    "-dname",
    "CN=Werkit Upload, O=Werkit, C=PL",
  ],
  { encoding: "utf8" }
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "keytool nie powiódł się (czy JDK jest w PATH?)");
  process.exit(result.status ?? 1);
}

const envBody = [
  `WERKIT_UPLOAD_KEY_ALIAS=${ALIAS}`,
  `WERKIT_UPLOAD_KEYSTORE_PASSWORD=${storePassword}`,
  `WERKIT_UPLOAD_KEY_PASSWORD=${keyPassword}`,
  "",
].join("\n");

writeFileSync(ENV_FILE, envBody, { mode: 0o600 });
writeFileSync(
  PROPS,
  [
    "storeFile=upload-keystore.jks",
    `storePassword=${storePassword}`,
    `keyAlias=${ALIAS}`,
    `keyPassword=${keyPassword}`,
    "",
  ].join("\n"),
  { mode: 0o600 }
);

console.log("Utworzono android/upload-keystore.jks, keystore.properties i .upload-keystore.env.");
console.log(
  "Pliki są poza Gitem. Skopiuj je na bezpieczny nośnik, potem GitHub Secrets (docs/GOOGLE_PLAY.md)."
);

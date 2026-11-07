import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(".pilot-drill/browser-engines");
const { webkit, request } = await import("../.pilot-drill/browser-tools/node_modules/playwright/index.mjs");
const client = await request.newContext();
try {
  const check = (0, eval)(`(${readFileSync("scripts/pilot-browser-check.js", "utf8")})`);
  const result = await check({ request: client, pilotBrowserType: webkit });
  writeFileSync(".pilot-drill/webkit-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) { console.error(error.message); throw error; } finally { await client.dispose(); }

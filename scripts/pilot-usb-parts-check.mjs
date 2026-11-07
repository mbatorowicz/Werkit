import { readFileSync, writeFileSync } from "node:fs";
import { usbBrowserType, usbDevice, cleanupUsb } from "./pilot-usb-browser.mjs";
const { request } = await import("../.pilot-drill/browser-tools/node_modules/playwright/index.mjs");
const client = await request.newContext();
try {
  const check = (0, eval)(`(${readFileSync("scripts/pilot-browser-check.js", "utf8")})`);
  const result = await check({ request: client, pilotBrowserType: usbBrowserType });
  result.device = usbDevice;
  writeFileSync(".pilot-drill/usb-parts-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error.message);
  throw error;
} finally {
  await client.dispose();
  await cleanupUsb();
}

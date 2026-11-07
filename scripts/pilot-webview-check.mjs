import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
const { chromium, request } = await import("../.pilot-drill/browser-tools/node_modules/playwright/index.mjs");
const adbPath = join(process.env.LOCALAPPDATA, "Android/Sdk/platform-tools/adb.exe");
const serial = "emulator-5580";
const pkg = "com.werkit.pilot";
const adb = (...args) => execFileSync(adbPath, ["-s", serial, ...args], { encoding: "utf8", windowsHide: true }).trim();
if (adb("shell", "getprop", "ro.kernel.qemu") !== "1") throw new Error("Requires isolated emulator, never a personal phone");
// Fresh fixture at the start only; all in-scenario restarts retain app data.
adb("shell", "pm", "clear", pkg);
adb("reverse", "tcp:4317", "tcp:4317");
const client = await request.newContext();
const android = {
  name: () => "android-webview",
  async launchPersistentContext() {
    adb("shell", "am", "start", "-n", `${pkg}/.MainActivity`);
    let socket;
    for (let i = 0; i < 60; i++) {
      const sockets = adb("shell", "cat", "/proc/net/unix");
      socket = sockets.match(/@webview_devtools_remote_\d+/)?.[0].slice(1);
      if (socket) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (!socket) throw new Error("No debug WebView socket");
    const port = adb("forward", "tcp:0", `localabstract:${socket}`);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { noDefaults: true });
    const context = browser.contexts()[0];
    const p = context.pages()[0] ?? await context.waitForEvent("page");
    await p.waitForURL(/\/(worker|login)(?:\?.*)?$/, { timeout: 30000 });
    await p.waitForLoadState("domcontentloaded", { timeout: 30000 });
    return {
      newPage: async () => p,
      close: async () => {
        await browser.close();
        adb("shell", "input", "keyevent", "KEYCODE_HOME");
        adb("shell", "am", "force-stop", pkg);
        adb("forward", "--remove", `tcp:${port}`);
      },
    };
  },
};
try {
  const check = (0, eval)(`(${readFileSync("scripts/pilot-browser-check.js", "utf8")})`);
  const result = await check({ request: client, pilotBrowserType: android });
  result.device = { android: adb("shell", "getprop", "ro.build.version.release"), sdk: adb("shell", "getprop", "ro.build.version.sdk"), provider: adb("shell", "dumpsys", "webviewupdate") };
  writeFileSync(".pilot-drill/webview-result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await client.dispose(); adb("reverse", "--remove", "tcp:4317"); }

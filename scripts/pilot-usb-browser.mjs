// Physical-device adapter. Never clears storage or uninstalls an app.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
const { _android } =
  await import("../.pilot-drill/browser-tools/node_modules/playwright/index.mjs");
const adbPath = join(process.env.LOCALAPPDATA, "Android/Sdk/platform-tools/adb.exe");
const run = (...args) =>
  execFileSync(adbPath, args, { encoding: "utf8", windowsHide: true }).trim();
const devices = run("devices")
  .split(/\r?\n/)
  .filter((line) => /\tdevice$/.test(line) && !line.startsWith("emulator-"))
  .map((line) => line.split("\t")[0]);
if (devices.length !== 1) throw new Error("Exactly one authorized physical USB device required");
const adb = (...args) => run("-s", devices[0], ...args);
const pkg = "com.werkit.pilot.usbtest.p20261107";
if (!adb("shell", "pm", "path", pkg)) throw new Error("Separate USB test host is not installed");
if (/tcp:4317\b/.test(adb("reverse", "--list")))
  throw new Error("Port 4317 is already forwarded; preserving existing mapping");
adb("reverse", "tcp:4317", "tcp:4317");
export const usbDevice = {
  android: adb("shell", "getprop", "ro.build.version.release"),
  sdk: adb("shell", "getprop", "ro.build.version.sdk"),
  webview: adb("shell", "dumpsys", "webviewupdate")
    .split(/\r?\n/)
    .find((line) => line.includes("Current WebView package"))
    ?.trim(),
  package: pkg,
};
let firstStart = true;
let device;
export const usbBrowserType = {
  name: () => "physical-android-webview",
  async launchPersistentContext() {
    // Refresh Android's inventory after force-stop. Never reuse an old page.
    device = (await _android.devices({ omitDriverInstall: true })).find(
      (candidate) => candidate.serial() === devices[0]
    );
    if (!device) throw new Error("USB device disconnected");
    adb("shell", "am", "start", "-n", `${pkg}/.MainActivity`);
    const pid = adb("shell", "pidof", pkg).split(" ")[0];
    const webview = await device.webView(
      { pkg, socketName: `webview_devtools_remote_${pid}` },
      { timeout: 30000 }
    );
    const page = await webview.page();
    const context = page.context();
    context.setDefaultTimeout(30000);
    // The host starts blank so network-failure instrumentation can be installed
    // before application code can drain retained queues on restart.
    if (page.url() !== "about:blank") throw new Error("Test host must start on about:blank");
    let closed = false;
    return {
      newPage: async () => {
        await page.goto("http://127.0.0.1:4317/worker");
        if (firstStart) {
          // Normal logout preserves all account-bound IndexedDB records.
          await page.evaluate(async () => {
            const response = await fetch("/api/auth/logout", { method: "POST" });
            if (!response.ok) throw new Error("Test account logout failed");
          });
          await page.goto("http://127.0.0.1:4317/login");
          await page.locator("#username").waitFor();
          firstStart = false;
        }
        return page;
      },
      addInitScript: (...args) => context.addInitScript(...args),
      close: async () => {
        if (closed) return;
        closed = true;
        await context.close();
        adb(
          "shell",
          "am",
          "start",
          "-a",
          "android.intent.action.MAIN",
          "-c",
          "android.intent.category.HOME"
        );
        adb("shell", "am", "force-stop", pkg);
        await device.close();
        device = null;
      },
    };
  },
};
export const cleanupUsb = async () => {
  try {
    await device?.close();
  } finally {
    adb("reverse", "--remove", "tcp:4317");
  }
};

const { spawn, execSync, execFile } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

const DEV_URLS = [
  { label: "client", url: "http://localhost:3000" },
  { label: "admin", url: "http://localhost:3001/login" },
];

const CHROME_DEBUG_PORT = 9222;
const CDP_PORTS = [CHROME_DEBUG_PORT, 9223, 9224, 9225, 9226, 9227, 9228];
const CDP_TIMEOUT_MS = 400;
const SERVER_POLL_MS = 150;
const SERVER_MAX_WAIT_MS = 45000;

const CHROME_PATHS =
  process.platform === "darwin"
    ? [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      ]
    : [
        `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env["ProgramFiles"]}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env["ProgramFiles(x86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
      ];

const FOCUS_SCRIPT = path.join(__dirname, "focus-chrome.ps1");

function findChromeExecutable() {
  return CHROME_PATHS.find((candidate) => candidate && existsSync(candidate));
}

function isChromeRunning() {
  try {
    if (process.platform === "darwin") {
      execSync('pgrep -x "Google Chrome"', {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return true;
    }

    const output = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH', {
      encoding: "utf8",
      windowsHide: true,
    });
    return output.toLowerCase().includes("chrome.exe");
  } catch {
    return false;
  }
}

function isAppTab(targetUrl, appUrl) {
  return targetUrl === appUrl || targetUrl.startsWith(`${appUrl}/`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function focusChromeWindow() {
  if (process.platform === "darwin") {
    execFile(
      "osascript",
      ["-e", 'tell application "Google Chrome" to activate'],
      () => {}
    );
    return;
  }

  if (process.platform === "win32" && existsSync(FOCUS_SCRIPT)) {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", FOCUS_SCRIPT],
      { windowsHide: true },
      () => {}
    );
  }
}

async function getBrowserVersion(port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CDP_TIMEOUT_MS);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("version unavailable");
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getTargets(port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CDP_TIMEOUT_MS);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("targets unavailable");
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function isChromeCdp(port) {
  try {
    const version = await getBrowserVersion(port);
    const browser = `${version.Browser || ""} ${version["User-Agent"] || ""}`.toLowerCase();
    return browser.includes("chrome") && !browser.includes("edg");
  } catch {
    return false;
  }
}

async function findChromeCdp() {
  for (const port of CDP_PORTS) {
    if (!(await isChromeCdp(port))) {
      continue;
    }

    try {
      const targets = await getTargets(port);
      return { port, targets };
    } catch {
      // Try the next Chrome debugging port.
    }
  }

  return null;
}

async function waitForUrl(url) {
  const started = Date.now();

  while (Date.now() - started < SERVER_MAX_WAIT_MS) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(400),
      });

      if (response.status < 500) {
        return true;
      }
    } catch {
      // Keep polling until the dev server is ready.
    }

    await sleep(SERVER_POLL_MS);
  }

  return false;
}

async function waitForAllUrls(urls) {
  const results = await Promise.all(urls.map((entry) => waitForUrl(entry.url)));
  return results.every(Boolean);
}

async function bringTabToFront(port, target) {
  await fetch(`http://127.0.0.1:${port}/json/activate/${target.id}`);

  return new Promise((resolve) => {
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    const timeout = setTimeout(() => {
      socket.close();
      resolve();
    }, 1000);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ id: 1, method: "Page.bringToFront" }));
    });

    socket.addEventListener("message", () => {
      clearTimeout(timeout);
      socket.close();
      resolve();
    });

    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function reloadTab(target) {
  return new Promise((resolve) => {
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    const timeout = setTimeout(() => {
      socket.close();
      resolve();
    }, 1000);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ id: 1, method: "Page.reload", params: {} }));
    });

    socket.addEventListener("message", () => {
      clearTimeout(timeout);
      socket.close();
      resolve();
    });

    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function openTabInWindow(port, url) {
  await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`);
}

function openUrlInChrome(chromeExe, url) {
  spawn(chromeExe, [url], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  }).unref();
}

function launchChrome(chromeExe, url) {
  spawn(chromeExe, [`--remote-debugging-port=${CHROME_DEBUG_PORT}`, url], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  }).unref();
}

function findAppTab(targets, url) {
  return targets.find(
    (target) => target.type === "page" && target.url && isAppTab(target.url, url)
  );
}

async function openOrRefreshTab(port, targets, url) {
  const existingTab = findAppTab(targets, url);

  if (existingTab) {
    await bringTabToFront(port, existingTab);
    await reloadTab(existingTab);
    return "refreshed";
  }

  await openTabInWindow(port, url);
  return "opened";
}

async function openDevUrlsWithCdp(cdp) {
  let targets = cdp.targets;

  for (const entry of DEV_URLS) {
    const action = await openOrRefreshTab(cdp.port, targets, entry.url);
    console.log(`${action === "refreshed" ? "Refreshed" : "Opened"} ${entry.label} URL in Chrome.`);
    targets = await getTargets(cdp.port);
  }
}

function setupHint() {
  if (process.platform === "win32") {
    return "Run scripts\\setup-chrome-debug.cmd once to enable tab refresh.";
  }

  if (process.platform === "darwin") {
    return "Quit Chrome completely, then reopen it with remote debugging enabled to refresh existing tabs.";
  }

  return "";
}

async function main() {
  const chromeExe = findChromeExecutable();

  if (!chromeExe) {
    console.log("Chrome not found. Open these URLs manually:");
    for (const entry of DEV_URLS) {
      console.log(`  ${entry.label}: ${entry.url}`);
    }
    process.exit(0);
  }

  const ready = await waitForAllUrls(DEV_URLS);

  if (!ready) {
    console.log("Timed out waiting for dev servers. Opening URLs anyway...");
  }

  const cdp = await findChromeCdp();

  if (cdp) {
    await openDevUrlsWithCdp(cdp);
    focusChromeWindow();
    return;
  }

  if (isChromeRunning()) {
    for (const entry of DEV_URLS) {
      openUrlInChrome(chromeExe, entry.url);
      await sleep(300);
    }

    focusChromeWindow();
    console.log("Opened client and admin URLs in existing Chrome window.");
    const hint = setupHint();
    if (hint) {
      console.log(hint);
    }
    return;
  }

  launchChrome(chromeExe, DEV_URLS[0].url);
  await sleep(800);

  const freshCdp = await findChromeCdp();
  if (freshCdp) {
    for (const entry of DEV_URLS.slice(1)) {
      await openTabInWindow(freshCdp.port, entry.url);
      console.log(`Opened ${entry.label} URL in Chrome.`);
    }
  } else {
    for (const entry of DEV_URLS.slice(1)) {
      openUrlInChrome(chromeExe, entry.url);
      await sleep(300);
    }
  }

  focusChromeWindow();
  console.log("Opened client and admin URLs in Chrome.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

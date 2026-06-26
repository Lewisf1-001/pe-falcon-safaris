const { spawn, execSync, execFile } = require("child_process");
const { existsSync } = require("fs");
const path = require("path");

const CLIENT_URL = "http://localhost:3000";
const OPERA_DEBUG_PORT = 9224;
const CDP_PORTS = [OPERA_DEBUG_PORT, 9333, 9225, 9226, 9227, 9228];
const CDP_TIMEOUT_MS = 400;
const CLIENT_POLL_MS = 150;
const CLIENT_MAX_WAIT_MS = 30000;

const OPERA_PATHS = [
  `${process.env.LOCALAPPDATA}\\Programs\\Opera\\opera.exe`,
  `${process.env.LOCALAPPDATA}\\Programs\\Opera GX\\opera.exe`,
  `${process.env["ProgramFiles"]}\\Opera\\opera.exe`,
  `${process.env["ProgramFiles(x86)"]}\\Opera\\opera.exe`,
  `${process.env["ProgramFiles"]}\\Opera GX\\opera.exe`,
  `${process.env["ProgramFiles(x86)"]}\\Opera GX\\opera.exe`,
];

const FOCUS_SCRIPT = path.join(__dirname, "focus-opera.ps1");

function findOperaExecutable() {
  return OPERA_PATHS.find((candidate) => candidate && existsSync(candidate));
}

function isOperaRunning() {
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq opera.exe" /NH', {
      encoding: "utf8",
      windowsHide: true,
    });
    return output.toLowerCase().includes("opera.exe");
  } catch {
    return false;
  }
}

function isClientTab(url) {
  return url === CLIENT_URL || url.startsWith(`${CLIENT_URL}/`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function focusOperaWindow() {
  execFile(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", FOCUS_SCRIPT],
    { windowsHide: true },
    () => {}
  );
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

async function isOperaCdp(port) {
  try {
    const version = await getBrowserVersion(port);
    const browser = `${version.Browser || ""} ${version["User-Agent"] || ""}`.toLowerCase();
    return browser.includes("opera");
  } catch {
    return false;
  }
}

async function findOperaCdp() {
  for (const port of CDP_PORTS) {
    if (!(await isOperaCdp(port))) {
      continue;
    }

    try {
      const targets = await getTargets(port);
      return { port, targets };
    } catch {
      // Try the next Opera debugging port.
    }
  }

  return null;
}

async function waitForClient() {
  const started = Date.now();

  while (Date.now() - started < CLIENT_MAX_WAIT_MS) {
    try {
      const response = await fetch(CLIENT_URL, {
        signal: AbortSignal.timeout(400),
      });

      if (response.status < 500) {
        return true;
      }
    } catch {
      // Keep polling until the dev server is ready.
    }

    await sleep(CLIENT_POLL_MS);
  }

  return false;
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

async function openTabInWindow(port) {
  await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(CLIENT_URL)}`
  );
}

function openUrlInOpera(operaExe) {
  spawn(operaExe, [CLIENT_URL], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  }).unref();
}

function launchOpera(operaExe) {
  spawn(
    operaExe,
    [`--remote-debugging-port=${OPERA_DEBUG_PORT}`, CLIENT_URL],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    }
  ).unref();
}

function findClientTab(targets) {
  return targets.find(
    (target) => target.type === "page" && target.url && isClientTab(target.url)
  );
}

async function main() {
  const operaExe = findOperaExecutable();

  if (!operaExe) {
    console.log("Opera not found. Open this URL manually:");
    console.log(`  ${CLIENT_URL}`);
    process.exit(0);
  }

  const cdp = await findOperaCdp();

  if (cdp) {
    const existingTab = findClientTab(cdp.targets);

    if (existingTab) {
      await Promise.all([
        bringTabToFront(cdp.port, existingTab),
        waitForClient(),
      ]);
      await reloadTab(existingTab);
      focusOperaWindow();
      console.log("Refreshed existing Opera tab.");
      return;
    }

    await waitForClient();
    await openTabInWindow(cdp.port);
    focusOperaWindow();
    console.log("Opened client URL in existing Opera window.");
    return;
  }

  if (isOperaRunning()) {
    await waitForClient();
    openUrlInOpera(operaExe);
    await sleep(400);
    focusOperaWindow();
    console.log("Opened client URL in existing Opera window.");
    console.log("Run scripts\\setup-opera-debug.cmd once to enable tab refresh.");
    return;
  }

  launchOpera(operaExe);
  await waitForClient();
  focusOperaWindow();
  console.log("Opened client URL in Opera.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

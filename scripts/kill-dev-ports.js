const { execSync } = require("child_process");

const PORTS = [3000, 4000];

function getPidsOnPort(port) {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (!out) return [];
    return out
      .split("\n")
      .map((v) => parseInt(v.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const killed = [];
  for (const port of PORTS) {
    const pids = getPidsOnPort(port);
    for (const pid of pids) {
      if (killPid(pid)) killed.push({ port, pid });
    }
  }

  if (killed.length === 0) {
    console.log("[dev] No existing processes on ports 3000/4000.");
    return;
  }

  await wait(500);

  // Force kill any leftovers.
  for (const port of PORTS) {
    const pids = getPidsOnPort(port);
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
  }

  console.log(
    `[dev] Cleared occupied dev ports: ${killed.map((k) => `${k.port}:${k.pid}`).join(", ")}`
  );
}

main().catch((err) => {
  console.error("[dev] Failed to clear ports:", err?.message || err);
  process.exit(1);
});


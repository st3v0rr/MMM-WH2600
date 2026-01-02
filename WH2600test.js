const EWG = require("ecowitt-gateway");

const DEFAULT_IP = "192.168.x.x";
const DEFAULT_PORT = 45000;

const args = process.argv.slice(2);
const getArgValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
};

const hasFlag = (flag) => args.includes(flag);

const ip = getArgValue("--ip", DEFAULT_IP);
const port = parseInt(getArgValue("--port", DEFAULT_PORT), 10);
const pretty = hasFlag("--pretty");
const repeat = parseInt(getArgValue("--repeat", "1"), 10);
const intervalMs = parseInt(getArgValue("--interval", "5000"), 10);
const verbose = hasFlag("--verbose");
const showKeys = hasFlag("--keys");

const log = (...parts) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...parts);
};

const safeStringify = (value, prettyPrint) => {
  try {
    return JSON.stringify(value, null, prettyPrint ? 2 : 0);
  } catch (error) {
    return `<<unserializable: ${error && error.message ? error.message : error}>>`;
  }
};

const summarizeData = (data) => {
  if (!data || typeof data !== "object") {
    log("Data is not an object:", data);
    return;
  }
  const keys = Object.keys(data);
  log("Key count:", keys.length);
  if (showKeys) {
    log("Keys:", keys.join(", "));
  }

  const typeCounts = {};
  const nonFinite = [];
  const emptyStrings = [];
  const nullish = [];

  keys.forEach((key) => {
    const value = data[key];
    const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    if (typeof value === "number" && !Number.isFinite(value)) {
      nonFinite.push(key);
    }
    if (value === "" || value === " ") {
      emptyStrings.push(key);
    }
    if (value === null || value === undefined) {
      nullish.push(key);
    }
  });

  log("Type summary:", safeStringify(typeCounts, false));
  if (nonFinite.length > 0) {
    log("Non-finite numbers:", nonFinite.join(", "));
  }
  if (emptyStrings.length > 0) {
    log("Empty string fields:", emptyStrings.join(", "));
  }
  if (nullish.length > 0) {
    log("Null/undefined fields:", nullish.join(", "));
  }
};

const logModuleVersion = () => {
  try {
    const pkg = require("ecowitt-gateway/package.json");
    log("ecowitt-gateway version:", pkg.version);
  } catch (error) {
    if (verbose) {
      log("ecowitt-gateway version lookup failed:", error.message || error);
    }
  }
};

const runOnce = async (iteration) => {
  const gw = new EWG(ip, port); // port default is 45000 and is optional
  log(`Request #${iteration} start`, { ip, port });
  const start = Date.now();
  try {
    const data = await gw.getLiveData();
    const elapsed = Date.now() - start;
    log(`Request #${iteration} success`, { ms: elapsed });
    summarizeData(data);
    if (verbose) {
      log("Raw payload:", safeStringify(data, pretty));
    }
  } catch (error) {
    const elapsed = Date.now() - start;
    log(`Request #${iteration} failed`, { ms: elapsed });
    log("Error:", error && error.message ? error.message : error);
    if (error && error.stack && verbose) {
      log(error.stack);
    }
  }
};

const run = async () => {
  log("WH2600test starting", {
    ip,
    port,
    repeat,
    intervalMs,
    pretty,
    verbose,
    showKeys
  });
  logModuleVersion();
  const safeRepeat = Number.isFinite(repeat) && repeat > 0 ? repeat : 1;
  for (let i = 1; i <= safeRepeat; i++) {
    await runOnce(i);
    if (i < safeRepeat) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  log("WH2600test done");
};

run();

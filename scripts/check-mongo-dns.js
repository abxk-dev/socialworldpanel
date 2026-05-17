const path = require("path");
const dnsModule = require("dns");
const dns = require("dns").promises;
const { URL } = require("url");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function ensureSrvDnsForCheck() {
  const shouldForcePublicDns =
    process.env.MONGO_FORCE_PUBLIC_DNS === "1" ||
    process.env.MONGO_FORCE_PUBLIC_DNS === "true";
  if (!shouldForcePublicDns) return;
  try {
    dnsModule.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  } catch (e) {
    // ignore
  }
}

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URL || "";
}

function getMongoFallbackUri() {
  return process.env.MONGODB_URI_FALLBACK || process.env.MONGO_URL_FALLBACK || "";
}

function extractHost(mongoUri) {
  try {
    return new URL(mongoUri).hostname || "";
  } catch (_) {
    const m = mongoUri.match(/@([^/?]+)/);
    return m?.[1]?.split(",")?.[0] || "";
  }
}

async function check(name, fn) {
  try {
    const result = await fn();
    console.log(`[OK] ${name}`);
    console.log(result);
    return true;
  } catch (e) {
    console.log(`[FAIL] ${name}`);
    console.log({ code: e?.code || null, message: e?.message || String(e) });
    return false;
  }
}

async function main() {
  ensureSrvDnsForCheck();
  const mongoUri = getMongoUri();
  const fallbackUri = getMongoFallbackUri();
  if (!mongoUri) {
    console.error("MONGODB_URI/MONGO_URL not set in .env");
    process.exit(1);
  }

  const host = extractHost(mongoUri);
  if (!host) {
    console.error("Could not parse Mongo host from URI");
    process.exit(1);
  }

  console.log("Mongo host:", host);
  const checks = await Promise.all([
    check("dns.lookup(host)", () => dns.lookup(host, { all: true })),
    check("dns.resolve4(host)", () => dns.resolve4(host)),
    check("dns.resolveSrv(_mongodb._tcp.host)", () => dns.resolveSrv(`_mongodb._tcp.${host}`)),
  ]);

  if (!checks.some(Boolean)) {
    console.error("\nAll DNS checks failed. This is a DNS/network problem, not a login-code problem.");
    if (fallbackUri) {
      console.error("Fallback URI is configured: app can try MONGODB_URI_FALLBACK / MONGO_URL_FALLBACK.");
    } else {
      console.error("Tip: set MONGODB_URI_FALLBACK to a non-SRV mongodb:// URI as a backup.");
    }
    process.exit(2);
  }

  console.log("\nAt least one DNS check passed.");
}

main().catch((e) => {
  console.error("Unexpected error:", e?.message || e);
  process.exit(1);
});


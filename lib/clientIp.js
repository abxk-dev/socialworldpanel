/**
 * Client IP + light VPN/proxy hints for security logging (heuristic only).
 */

function normalizeIp(ip) {
  let s = String(ip || "unknown").trim();
  if (s.startsWith("::ffff:")) s = s.slice(7);
  if (s === "::1") s = "127.0.0.1";
  return s || "unknown";
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  let fromXff = "";
  if (typeof xff === "string") {
    fromXff = xff.split(",")[0].trim();
  } else if (Array.isArray(xff) && xff.length) {
    fromXff = String(xff[0]).trim();
  }
  const raw =
    fromXff ||
    req.headers["cf-connecting-ip"] ||
    req.headers["true-client-ip"] ||
    req.headers["fastly-client-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-client-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.ip ||
    "unknown";
  return normalizeIp(raw);
}

function userAgentLooksSuspicious(userAgent) {
  const ua = String(userAgent || "").toLowerCase();
  if (!ua) return false;
  return /vpn|proxy|tunnel|wireguard|nordvpn|expressvpn|surfshark|protonvpn|mullvad|datacenter|hosting|ovh|digitalocean|linode|vultr|hetzner|amazonaws|googlecloud/.test(
    ua
  );
}

module.exports = {
  getClientIp,
  normalizeIp,
  userAgentLooksSuspicious,
};

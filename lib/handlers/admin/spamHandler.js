const { ObjectId } = require("mongodb");
const { getDb } = require("./_db");
const { parseAuth } = require("../_auth");
const ADMIN_ROLES = new Set(["admin", "main_admin", "support", "superadmin"]);

function requireAdmin(req, res) {
  const claims = parseAuth(req);
  if (!claims) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const role = claims.role || "user";
  if (!ADMIN_ROLES.has(role)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  req.adminActorId = String(claims.sub || claims.user_id || claims.email || "admin");
  req.user = { user_id: req.adminActorId };
  return claims;
}

function stripPassword(u) {
  if (!u || typeof u !== "object") return u;
  const { password_hash, password, ...safe } = u;
  return safe;
}

const getSpamUsers = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const db = await getDb();
    const page = parseInt(req.query?.page, 10) || 1;
    const limit = parseInt(req.query?.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const filterType = req.query?.type || "all";

    let userFilter = {};

    if (filterType === "shared_ip") {
      userFilter = { ip_flag: true };
    } else if (filterType === "referral_fraud") {
      userFilter = { referral_fraud_flag: true };
    } else if (filterType === "flagged") {
      userFilter = { is_flagged: true };
    } else if (filterType === "vpn") {
      const ids = await db
        .collection("user_login_history")
        .distinct("user_id", { is_suspicious: true });
      userFilter = {
        $or: [{ vpn_flag: true }, ...(ids.length ? [{ user_id: { $in: ids.map(String) } }] : [{ user_id: "__none__" }])],
      };
    } else {
      userFilter = {
        $or: [
          { ip_flag: true },
          { referral_fraud_flag: true },
          { is_flagged: true },
          { is_banned: true },
          { vpn_flag: true },
        ],
      };
    }

    const [users, total] = await Promise.all([
      db
        .collection("users")
        .find(userFilter)
        .sort({ ip_flag_date: -1, created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("users").countDocuments(userFilter),
    ]);

    const enriched = await Promise.all(
      users.map(async (u) => {
        const uid = String(u.user_id);

        const recentLogins = await db
          .collection("user_login_history")
          .find({ user_id: uid })
          .sort({ logged_in_at: -1 })
          .limit(5)
          .toArray();

        let sharedIpUsers = [];
        if (u.known_ips?.length > 0) {
          sharedIpUsers = await db
            .collection("users")
            .find({
              user_id: { $ne: uid },
              $or: [{ known_ips: { $in: u.known_ips } }, { last_login_ip: { $in: u.known_ips } }],
            })
            .project({
              user_id: 1,
              email: 1,
              username: 1,
              last_login_ip: 1,
              is_banned: 1,
            })
            .limit(10)
            .toArray();
        }

        const alerts = await db
          .collection("spam_alerts")
          .find({
            $or: [
              { affected_user_ids: uid },
              { referrer_user_id: uid },
              { referred_user_id: uid },
            ],
            status: "open",
          })
          .limit(5)
          .toArray();

        let riskScore = 0;
        if (u.ip_flag) riskScore += 2;
        if (u.referral_fraud_flag) riskScore += 3;
        if (u.is_flagged) riskScore += 1;
        if (sharedIpUsers.length >= 5) riskScore += 2;
        if (sharedIpUsers.length >= 10) riskScore += 3;

        const riskLevel = riskScore >= 5 ? "high" : riskScore >= 3 ? "medium" : "low";
        const safe = stripPassword(u);

        return {
          ...safe,
          recent_logins: recentLogins,
          shared_ip_users: sharedIpUsers,
          shared_ip_count: sharedIpUsers.length,
          alerts,
          alert_count: alerts.length,
          risk_level: riskLevel,
          risk_score: riskScore,
        };
      })
    );

    res.json({
      success: true,
      users: enriched,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error("getSpamUsers error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getSpamAlerts = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const db = await getDb();
    const page = parseInt(req.query?.page, 10) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = req.query?.status || "open";
    const type = req.query?.type;

    const filter = {};
    if (status !== "all") filter.status = status;
    if (type) filter.alert_type = type;

    const [alerts, total] = await Promise.all([
      db
        .collection("spam_alerts")
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("spam_alerts").countDocuments(filter),
    ]);

    res.json({
      success: true,
      alerts,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSpamStats = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const db = await getDb();

    const [suspiciousCount, openAlerts, bannedCount, highRiskCount, lastScan] = await Promise.all([
      db.collection("users").countDocuments({
        $or: [{ ip_flag: true }, { referral_fraud_flag: true }, { is_flagged: true }],
      }),
      db.collection("spam_alerts").countDocuments({ status: "open" }),
      db.collection("users").countDocuments({ is_banned: true }),
      db.collection("users").countDocuments({ ip_flag_severity: "high" }),
      db.collection("ip_scan_history").findOne({}, { sort: { scanned_at: -1 } }),
    ]);

    res.json({
      success: true,
      suspicious_users: suspiciousCount,
      open_alerts: openAlerts,
      banned_users: bannedCount,
      high_risk_users: highRiskCount,
      last_scan_at: lastScan?.scanned_at || null,
      next_scan_at: lastScan
        ? new Date(new Date(lastScan.scanned_at).getTime() + 6 * 60 * 60 * 1000).toISOString()
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUserLoginHistory = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const db = await getDb();
    const userId = String(req.params.userId || "");

    const history = await db
      .collection("user_login_history")
      .find({ user_id: userId })
      .sort({ logged_in_at: -1 })
      .limit(100)
      .toArray();

    const user = await db.collection("users").findOne({ user_id: userId });

    const uniqueIps = [...new Set(history.map((h) => h.ip_address))];
    const ipDetails = await Promise.all(
      uniqueIps.map(async (ip) => {
        if (!ip || ip === "unknown") return { ip, other_users: [], is_shared: false };
        const others = await db
          .collection("users")
          .find({
            user_id: { $ne: userId },
            $or: [{ known_ips: ip }, { last_login_ip: ip }],
          })
          .project({ user_id: 1, email: 1, username: 1 })
          .toArray();
        return { ip, other_users: others, is_shared: others.length > 0 };
      })
    );

    res.json({
      success: true,
      history,
      user_known_ips: user?.known_ips || [],
      last_login_ip: user?.last_login_ip,
      ip_details: ipDetails,
      total_logins: history.length,
      unique_ips: uniqueIps.length,
      shared_ip_users: ipDetails.flatMap((d) => d.other_users || []),
      ips: uniqueIps,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const banSpamUser = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const db = await getDb();
    const userId = String(req.params.userId || "");
    const {
      reason,
      ban_referrals,
      ban_shared_ip_users,
      revoke_referral_bonus,
    } = req.body || {};

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: "Ban reason is required" });
    }

    const user = await db.collection("users").findOne({ user_id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date().toISOString();
    const actor = req.adminActorId || "admin";
    const bannedUsers = [userId];

    await db.collection("users").updateOne(
      { user_id: userId },
      {
        $set: {
          is_banned: true,
          is_active: false,
          status: "banned",
          ban_reason: reason,
          banned_at: now,
          banned_by: actor,
        },
      }
    );

    if (ban_referrals && user.referral_code) {
      const referred = await db
        .collection("users")
        .find({ referred_by: user.referral_code })
        .project({ user_id: 1 })
        .toArray();

      if (referred.length > 0) {
        const referredIds = referred.map((r) => String(r.user_id));
        await db.collection("users").updateMany(
          { user_id: { $in: referredIds } },
          {
            $set: {
              is_banned: true,
              is_active: false,
              status: "banned",
              ban_reason: `Referred by banned spam user (${userId})`,
              banned_at: now,
            },
          }
        );
        bannedUsers.push(...referredIds);
      }
    }

    if (ban_shared_ip_users && user.known_ips?.length > 0) {
      const ipUsers = await db
        .collection("users")
        .find({
          user_id: { $nin: bannedUsers },
          $or: [{ known_ips: { $in: user.known_ips } }, { last_login_ip: { $in: user.known_ips } }],
        })
        .project({ user_id: 1 })
        .toArray();

      if (ipUsers.length > 0) {
        const ipUserIds = ipUsers.map((x) => String(x.user_id));
        await db.collection("users").updateMany(
          { user_id: { $in: ipUserIds } },
          {
            $set: {
              is_banned: true,
              is_active: false,
              status: "banned",
              ban_reason: `Shared IP with banned spam user (${userId})`,
              banned_at: now,
            },
          }
        );
        bannedUsers.push(...ipUserIds);
      }
    }

    if (revoke_referral_bonus) {
      try {
        const bonusTxns = await db
          .collection("loyalty_transactions")
          .find({
            user_id: userId,
            type: { $in: ["referral", "referral_bonus"] },
          })
          .toArray();

        const totalBonus = bonusTxns.reduce((s, t) => s + Number(t.amount || 0), 0);

        if (totalBonus > 0 && Number(user.balance || 0) > 0) {
          const deduct = Math.min(totalBonus, Number(user.balance || 0));
          await db.collection("users").updateOne({ user_id: userId }, { $inc: { balance: -deduct } });
          await db.collection("loyalty_transactions").insertOne({
            user_id: userId,
            type: "referral_bonus_revoked",
            amount: -deduct,
            description: "Referral bonus revoked due to fraud",
            created_at: now,
          });
        }
      } catch (_) {
        /* optional collection */
      }
    }

    const alertOr = bannedUsers.flatMap((id) => [
      { affected_user_ids: id },
      { referrer_user_id: id },
      { referred_user_id: id },
    ]);

    await db.collection("spam_alerts").updateMany({ $or: alertOr }, { $set: { status: "resolved", resolved_at: now } });

    try {
      await db.collection("admin_activity_logs").insertOne({
        admin_user_id: actor,
        action_type: "USER_BANNED",
        target_id: userId,
        action_description: `Banned spam user. Reason: ${reason}. Total banned: ${bannedUsers.length}`,
        risk_level: "high",
        timestamp: now,
      });
    } catch (_) {
      await db.collection("activity_logs").insertOne({
        event: "USER_BANNED",
        user_id: userId,
        admin_id: actor,
        reason,
        created_at: now,
      });
    }

    res.json({
      success: true,
      message: `Successfully banned ${bannedUsers.length} user(s)`,
      banned_user_ids: bannedUsers,
      banned_count: bannedUsers.length,
    });
  } catch (err) {
    console.error("banSpamUser error:", err);
    res.status(500).json({ error: err.message });
  }
};

const unbanSpamUser = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const db = await getDb();
    const userId = String(req.params.userId || "");
    const { reason } = req.body || {};
    const actor = req.adminActorId || "admin";
    const now = new Date().toISOString();

    await db.collection("users").updateOne(
      { user_id: userId },
      {
        $set: {
          is_banned: false,
          is_active: true,
          status: "active",
          is_flagged: false,
          ip_flag: false,
          referral_fraud_flag: false,
          unbanned_at: now,
          unbanned_by: actor,
          unban_reason: reason || "Manually unbanned",
        },
      }
    );

    try {
      await db.collection("admin_activity_logs").insertOne({
        admin_user_id: actor,
        action_type: "USER_UNBANNED",
        target_id: userId,
        action_description: `Unbanned user. Reason: ${reason || "Manual unban"}`,
        risk_level: "medium",
        timestamp: now,
      });
    } catch (_) {
      await db.collection("activity_logs").insertOne({
        event: "USER_UNBANNED",
        user_id: userId,
        admin_id: actor,
        created_at: now,
      });
    }

    res.json({ success: true, message: "User unbanned successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const dismissAlert = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { alertId } = req.params;
    if (!ObjectId.isValid(alertId)) {
      return res.status(400).json({ error: "Invalid alert id" });
    }

    await db.collection("spam_alerts").updateOne(
      { _id: new ObjectId(alertId) },
      {
        $set: {
          status: "dismissed",
          dismissed_at: new Date().toISOString(),
          dismissed_by: req.adminActorId,
        },
      }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getIpDetails = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const db = await getDb();
    const ip = decodeURIComponent(String(req.params.ip || ""));

    const users = await db
      .collection("users")
      .find({
        $or: [{ known_ips: ip }, { last_login_ip: ip }],
      })
      .project({
        user_id: 1,
        email: 1,
        username: 1,
        created_at: 1,
        balance: 1,
        is_banned: 1,
        referral_code: 1,
        referred_by: 1,
      })
      .toArray();

    const loginHistory = await db
      .collection("user_login_history")
      .find({ ip_address: ip })
      .sort({ logged_in_at: -1 })
      .limit(20)
      .toArray();

    const alerts = await db
      .collection("spam_alerts")
      .find({ ip_address: ip })
      .sort({ created_at: -1 })
      .toArray();

    res.json({
      success: true,
      ip,
      users_count: users.length,
      users,
      login_history: loginHistory,
      alerts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const runManualScan = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { runFullIpScan } = require("../../jobs/autoIpScanner");
    const result = await runFullIpScan({ scanType: "manual" });
    res.json({
      success: true,
      message: "IP scan completed",
      ...result,
    });
  } catch (err) {
    console.error("Manual scan error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getScanHistory = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const db = await getDb();
    const history = await db
      .collection("ip_scan_history")
      .find({})
      .sort({ scanned_at: -1 })
      .limit(20)
      .toArray();

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getSpamUsers,
  getSpamAlerts,
  getSpamStats,
  getUserLoginHistory,
  banSpamUser,
  unbanSpamUser,
  dismissAlert,
  getIpDetails,
  runManualScan,
  runIpScan: runManualScan,
  getScanHistory,
};

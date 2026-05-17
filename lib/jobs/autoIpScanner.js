const { getDb } = require("../handlers/_db");

let scanInterval = null;

/**
 * @param {{ scanType?: 'auto' | 'manual' }} [opts]
 */
async function runFullIpScan(opts = {}) {
  const scanType = opts.scanType === "manual" ? "manual" : "auto";
  console.log(`[AutoIPScan] Starting IP scan (${scanType})...`);
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[AutoIPScan] No DB");
      return { totalFlagged: 0, newAlerts: 0, sharedIpGroups: 0 };
    }
    const now = new Date().toISOString();
    let totalFlagged = 0;
    let newAlerts = 0;

    const sharedIpPipeline = [
      {
        $project: {
          user_id: 1,
          email: 1,
          username: 1,
          known_ips: 1,
          last_login_ip: 1,
          is_banned: 1,
        },
      },
      { $unwind: { path: "$known_ips", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$known_ips",
          users: {
            $push: {
              user_id: "$user_id",
              email: "$email",
              username: "$username",
              is_banned: "$is_banned",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ];

    const sharedIps = await db.collection("users").aggregate(sharedIpPipeline).toArray();

    for (const entry of sharedIps) {
      const ip = entry._id;
      if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") continue;

      const userIds = entry.users.map((u) => String(u.user_id)).filter(Boolean);
      const emails = entry.users.map((u) => u.email).filter(Boolean);
      const activeUsers = entry.users.filter((u) => !u.is_banned);

      if (activeUsers.length < 2) continue;

      await db.collection("users").updateMany(
        { user_id: { $in: userIds } },
        {
          $set: {
            ip_flag: true,
            ip_flag_reason: `Shared IP with ${userIds.length - 1} other accounts: ${ip}`,
            ip_flag_date: now,
            ip_flag_severity:
              entry.count >= 5 ? "high" : entry.count >= 3 ? "medium" : "low",
          },
        }
      );

      totalFlagged += userIds.length;

      const existing = await db.collection("spam_alerts").findOne({
        alert_type: "shared_ip",
        ip_address: ip,
      });

      const alertData = {
        alert_type: "shared_ip",
        ip_address: ip,
        affected_user_ids: userIds,
        affected_emails: emails,
        user_count: entry.count,
        details: `${entry.count} accounts share IP address ${ip}`,
        severity:
          entry.count >= 10 ? "high" : entry.count >= 5 ? "high" : entry.count >= 3 ? "medium" : "low",
        status: existing?.status === "resolved" ? "open" : existing?.status || "open",
        updated_at: now,
        last_scan_at: now,
      };

      if (!existing) {
        await db.collection("spam_alerts").insertOne({
          ...alertData,
          created_at: now,
        });
        newAlerts += 1;
      } else {
        await db.collection("spam_alerts").updateOne({ _id: existing._id }, { $set: alertData });
      }
    }

    const referralFraudPipeline = [
      { $match: { referred_by: { $exists: true, $nin: [null, ""] } } },
      {
        $lookup: {
          from: "users",
          let: {
            refCode: "$referred_by",
            userIps: { $ifNull: ["$known_ips", []] },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$referral_code", "$$refCode"] },
                    {
                      $gt: [
                        {
                          $size: {
                            $setIntersection: [{ $ifNull: ["$known_ips", []] }, "$$userIps"],
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "referrer_matches",
        },
      },
      { $match: { "referrer_matches.0": { $exists: true } } },
      {
        $project: {
          user_id: 1,
          email: 1,
          username: 1,
          referred_by: 1,
          known_ips: 1,
          referrer: { $arrayElemAt: ["$referrer_matches", 0] },
        },
      },
    ];

    const fraudCases = await db.collection("users").aggregate(referralFraudPipeline).toArray();

    for (const fraud of fraudCases) {
      const uid = String(fraud.user_id);
      await db.collection("users").updateOne(
        { user_id: uid },
        {
          $set: {
            referral_fraud_flag: true,
            referral_fraud_reason: `Same IP as referrer ${fraud.referrer?.user_id}`,
            referral_fraud_date: now,
          },
        }
      );

      const sharedIpsList = (fraud.known_ips || []).filter((x) =>
        (fraud.referrer?.known_ips || []).includes(x)
      );

      const refUid = fraud.referrer?.user_id != null ? String(fraud.referrer.user_id) : "";
      const existingFraud = await db.collection("spam_alerts").findOne({
        alert_type: "referral_fraud_same_ip",
        referrer_user_id: refUid,
        referred_user_id: uid,
      });

      if (!existingFraud) {
        await db.collection("spam_alerts").insertOne({
          alert_type: "referral_fraud_same_ip",
          ip_address: sharedIpsList[0] || "unknown",
          shared_ips: sharedIpsList,
          referrer_user_id: refUid,
          referrer_email: fraud.referrer?.email,
          referred_user_id: uid,
          referred_email: fraud.email,
          details: `Referral fraud: ${fraud.email} referred by ${fraud.referrer?.email} — same IP ${sharedIpsList[0] || "unknown"}`,
          severity: "high",
          status: "open",
          created_at: now,
          updated_at: now,
          last_scan_at: now,
        });
        newAlerts += 1;
      }
    }

    const recentPipeline = [
      {
        $match: {
          logged_in_at: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      },
      {
        $group: {
          _id: "$ip_address",
          users: { $addToSet: "$user_id" },
          login_events: { $sum: 1 },
          emails: { $addToSet: "$email" },
        },
      },
      { $match: { $expr: { $gt: [{ $size: "$users" }, 2] } } },
    ];

    const recentShared = await db.collection("user_login_history").aggregate(recentPipeline).toArray();

    for (const row of recentShared) {
      if (!row._id || row._id === "unknown") continue;
      const userList = (row.users || []).map(String).filter(Boolean);
      const emailList = (row.emails || []).filter(Boolean);
      await db.collection("spam_alerts").updateOne(
        {
          alert_type: "mass_login_same_ip",
          ip_address: row._id,
          status: "open",
        },
        {
          $set: {
            alert_type: "mass_login_same_ip",
            ip_address: row._id,
            affected_user_ids: userList,
            affected_emails: emailList,
            details: `${userList.length} distinct accounts, ${row.login_events} logins from same IP in last 24h: ${row._id}`,
            severity: row.login_events >= 10 ? "high" : "medium",
            status: "open",
            updated_at: now,
            last_scan_at: now,
          },
          $setOnInsert: { created_at: now },
        },
        { upsert: true }
      );
    }

    await db.collection("ip_scan_history").insertOne({
      scan_type: scanType,
      shared_ip_groups: sharedIps.length,
      flagged_users: totalFlagged,
      new_alerts: newAlerts,
      referral_fraud_cases: fraudCases.length,
      mass_login_cases: recentShared.length,
      scanned_at: now,
    });

    console.log(`[AutoIPScan] Complete. Flagged: ${totalFlagged}, New alerts: ${newAlerts}`);
    return {
      totalFlagged,
      newAlerts,
      sharedIpGroups: sharedIps.length,
      flagged_users: totalFlagged,
      shared_ip_groups: sharedIps.length,
    };
  } catch (err) {
    console.error("[AutoIPScan] Error:", err.message);
    throw err;
  }
}

function startAutoScanner() {
  if (scanInterval) return;

  setTimeout(() => {
    runFullIpScan({ scanType: "auto" }).catch((e) => console.error("[AutoIPScan]", e.message));
  }, 5000);

  const SIX_HOURS = 6 * 60 * 60 * 1000;
  scanInterval = setInterval(() => {
    console.log("[AutoIPScan] Running scheduled 6-hour scan...");
    runFullIpScan({ scanType: "auto" }).catch((e) => console.error("[AutoIPScan]", e.message));
  }, SIX_HOURS);

  console.log("[AutoIPScan] Scheduler started. Runs every 6 hours.");
}

function stopAutoScanner() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
}

module.exports = { runFullIpScan, startAutoScanner, stopAutoScanner };

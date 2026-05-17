/**
 * Sequential numeric user_id for new users (string digits), starting at 9898.
 * Uses MongoDB counters + aggregation pipeline for atomic, concurrent-safe allocation.
 */

const MIN_NUMERIC_USER_ID = 9898;
const COUNTER_ID = "numeric_user_id";

let didSync = false;

async function syncCounterFromExistingUsers(db) {
  const rows = await db.collection("users").find({}, { projection: { user_id: 1 } }).toArray();
  let maxN = 0;
  for (const r of rows) {
    const s = String(r.user_id ?? "").trim();
    if (/^\d{4,}$/.test(s)) {
      const n = parseInt(s, 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }
  if (maxN < MIN_NUMERIC_USER_ID) return;

  await db.collection("counters").updateOne(
    { _id: COUNTER_ID },
    [
      {
        $set: {
          seq: {
            $max: [maxN, { $ifNull: ["$seq", MIN_NUMERIC_USER_ID - 1] }],
          },
        },
      },
    ],
    { upsert: true }
  );
}

/**
 * @param {import('mongodb').Db} db
 * @returns {Promise<string>}
 */
async function allocateNextNumericUserId(db) {
  if (!db) throw new Error("allocateNextNumericUserId: db required");

  if (!didSync) {
    try {
      await syncCounterFromExistingUsers(db);
    } catch (e) {
      console.warn("[allocateUserId] sync skipped:", e.message);
    }
    didSync = true;
  }

  const col = db.collection("counters");
  const doc = await col.findOneAndUpdate(
    { _id: COUNTER_ID },
    [
      {
        $set: {
          seq: {
            $add: [{ $ifNull: ["$seq", MIN_NUMERIC_USER_ID - 1] }, 1],
          },
        },
      },
    ],
    { upsert: true, returnDocument: "after" }
  );

  const seq = doc && doc.seq;
  if (seq == null || !Number.isFinite(Number(seq))) {
    throw new Error("allocateNextNumericUserId: invalid counter result");
  }
  const n = Math.trunc(Number(seq));
  if (n < MIN_NUMERIC_USER_ID) {
    throw new Error(`allocateNextNumericUserId: seq ${n} below minimum ${MIN_NUMERIC_USER_ID}`);
  }
  return String(n);
}

module.exports = {
  allocateNextNumericUserId,
  MIN_NUMERIC_USER_ID,
  COUNTER_ID,
};

const express = require("express");
const router = express.Router();

const { parseAuth } = require("../lib/auth");
const { getDb } = require("../lib/handlers/_db");
const {
  getGrouped,
  reorderAll,
  moveCategory,
  getFlatList,
} = require("../lib/handlers/categoryMgmtHandler");

const {
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../lib/handlers/categoryHandler");

function verifyToken(req, res, next) {
  try {
    const claims = parseAuth(req);
    if (!claims) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!["admin", "main_admin", "support"].includes(claims.role)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    req.user = claims;
    return next();
  } catch (err) {
    console.error("verifyToken error:", err.message);
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
}

// Grouped view
router.get("/admin/category-management", verifyToken, getGrouped);

// Category CRUD for Category Management page (uses `categories` collection)
// Dedicated routes to avoid collisions with `/api/admin/categories` (service_categories handler).
router.post(
  "/admin/category-management/categories",
  verifyToken,
  createCategory
);

router.put(
  "/admin/category-management/categories/:id",
  verifyToken,
  updateCategory
);

router.delete(
  "/admin/category-management/categories/:id",
  verifyToken,
  deleteCategory
);

// Reorder platforms + categories
router.put(
  "/admin/category-management/reorder",
  verifyToken,
  reorderAll
);

// Move category to another platform
router.put(
  "/admin/category-management/move",
  verifyToken,
  moveCategory
);

// Flat list
router.get("/admin/category-management/flat", verifyToken, getFlatList);

// One-click migration endpoint
router.post(
  "/admin/category-management/migrate",
  verifyToken,
  async (req, res) => {
    try {
      const db = await getDb();

      const detectPlatform = (name) => {
        const n = (name || "").toLowerCase();
        if (n.includes("youtube") || n.includes(" yt ")) return "youtube";
        if (n.includes("facebook") || n.includes(" fb ")) return "facebook";
        if (n.includes("instagram") || n.includes(" ig ")) return "instagram";
        if (n.includes("tiktok") || n.includes("tik tok")) return "tiktok";
        if (n.includes("twitter") || n.includes("tweet")) return "twitter";
        if (n.includes("telegram")) return "telegram";
        if (n.includes("spotify")) return "spotify";
        return "other";
      };

      const platformsCount = await db.collection("platforms").countDocuments();

      if (platformsCount === 0) {
        await db.collection("platforms").insertMany([
          { name: "YouTube", slug: "youtube", icon: "🎬", color: "#FF0000", priority: 1, is_active: true, created_at: new Date() },
          { name: "Facebook", slug: "facebook", icon: "📘", color: "#1877F2", priority: 2, is_active: true, created_at: new Date() },
          { name: "Instagram", slug: "instagram", icon: "📸", color: "#E1306C", priority: 3, is_active: true, created_at: new Date() },
          { name: "TikTok", slug: "tiktok", icon: "🎵", color: "#010101", priority: 4, is_active: true, created_at: new Date() },
          { name: "Twitter", slug: "twitter", icon: "🐦", color: "#1DA1F2", priority: 5, is_active: true, created_at: new Date() },
          { name: "Telegram", slug: "telegram", icon: "✈️", color: "#0088CC", priority: 6, is_active: true, created_at: new Date() },
          { name: "Other", slug: "other", icon: "📦", color: "#64748b", priority: 7, is_active: true, created_at: new Date() },
        ]);
      }

      const platforms = await db.collection("platforms").find({}).toArray();
      const categories = await db.collection("categories").find({}).toArray();

      const grouped = {};
      platforms.forEach((p) => {
        grouped[p.slug] = [];
      });

      categories.forEach((cat) => {
        // If categories already have `platform_slug`, preserve it.
        // This avoids moving newly created categories into the wrong group
        // when the category name doesn't contain platform keywords.
        const slug = cat.platform_slug || detectPlatform(cat.name || "");
        if (!grouped[slug]) grouped[slug] = [];
        grouped[slug].push(cat);
      });

      const sortedPlatforms = platforms.sort(
        (a, b) => (a.priority || 0) - (b.priority || 0)
      );

      let globalOrder = 1;
      for (const platform of sortedPlatforms) {
        const cats = grouped[platform.slug] || [];
        for (let i = 0; i < cats.length; i++) {
          await db.collection("categories").updateOne(
            { _id: cats[i]._id },
            {
              $set: {
                platform_id: platform._id,
                platform_name: platform.name,
                platform_slug: platform.slug,
                sort_order: i + 1,
                global_order: globalOrder,
                updated_at: new Date(),
              },
            }
          );
          globalOrder++;
        }
      }

      res.json({
        success: true,
        message: `Migrated ${categories.length} categories`,
      });
    } catch (err) {
      console.error("category-management migrate error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;


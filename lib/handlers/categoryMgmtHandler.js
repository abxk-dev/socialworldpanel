const { getDb } = require("./_db");
const { ObjectId } = require("mongodb");

const getGrouped = async (req, res) => {
  try {
    const db = await getDb();

    const platforms = await db
      .collection("platforms")
      .find({ is_active: true })
      .sort({ priority: 1 })
      .toArray();

    const result = [];

    for (const platform of platforms) {
      const categories = await db
        .collection("categories")
        .find({ platform_slug: platform.slug })
        .sort({ sort_order: 1 })
        .toArray();

      const catsWithCount = await Promise.all(
        categories.map(async (cat) => {
          const count = await db.collection("services").countDocuments({
            $or: [
              { category: cat.name },
              // Some code paths store `category_id` as ObjectId, others as string.
              { category_id: cat._id },
              { category_id: cat._id?.toString?.() },
              { category_id: String(cat._id) },
              { category: cat._id.toString() },
            ],
          });
          return { ...cat, services_count: count };
        })
      );

      result.push({
        ...platform,
        categories: catsWithCount,
        categories_count: categories.length,
      });
    }

    res.json({ success: true, platforms: result });
  } catch (err) {
    console.error("getGrouped error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const reorderAll = async (req, res) => {
  try {
    const db = await getDb();
    const { platforms } = req.body || {};

    if (!Array.isArray(platforms)) {
      return res.status(400).json({
        success: false,
        error: "platforms array is required",
      });
    }

    let globalOrder = 1;

    for (const platformData of platforms) {
      if (!platformData.platform_id) continue;

      await db.collection("platforms").updateOne(
        { _id: new ObjectId(platformData.platform_id) },
        { $set: { priority: platformData.priority || 1 } }
      );

      for (const catData of platformData.categories || []) {
        if (!catData.category_id) continue;
        await db.collection("categories").updateOne(
          { _id: new ObjectId(catData.category_id) },
          {
            $set: {
              sort_order: catData.sort_order || 1,
              global_order: globalOrder,
              // Keep user-side ordering fields in sync
              priority: catData.sort_order || 1,
              global_priority: globalOrder,
            },
          }
        );
        globalOrder++;
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("reorderAll error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const moveCategory = async (req, res) => {
  try {
    const db = await getDb();
    const { category_id, new_platform_slug } = req.body || {};

    if (!category_id || !new_platform_slug) {
      return res.status(400).json({
        success: false,
        error: "category_id and new_platform_slug are required",
      });
    }

    const platform = await db.collection("platforms").findOne({
      slug: new_platform_slug,
    });

    if (!platform) {
      return res.status(404).json({
        success: false,
        error: "Platform not found",
      });
    }

    const lastCat = await db.collection("categories").findOne(
      { platform_slug: new_platform_slug },
      { sort: { sort_order: -1 } }
    );
    const newSortOrder = lastCat ? lastCat.sort_order + 1 : 1;

    await db.collection("categories").updateOne(
      { _id: new ObjectId(category_id) },
      {
        $set: {
          platform_id: platform._id,
          platform_name: platform.name,
          platform_slug: platform.slug,
          sort_order: newSortOrder,
          priority: newSortOrder,
          updated_at: new Date(),
        },
      }
    );

    await db.collection("services").updateMany(
      {
        $or: [
          { category_id: String(category_id) },
          { category_id: new ObjectId(category_id) },
        ],
      },
      {
        $set: {
          category_id: String(category_id),
          platform_slug: platform.slug,
          updated_at: new Date(),
        },
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("moveCategory error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const getFlatList = async (req, res) => {
  try {
    const db = await getDb();
    const categories = await db
      .collection("categories")
      .find({})
      .sort({ global_order: 1 })
      .toArray();
    res.json({ success: true, categories });
  } catch (err) {
    console.error("getFlatList error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

module.exports = {
  getGrouped,
  reorderAll,
  moveCategory,
  getFlatList,
};


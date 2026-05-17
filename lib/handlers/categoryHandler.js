const { getDb } = require("./_db");
const { ObjectId } = require("mongodb");
const { seedPlatforms } = require("../seedPlatforms");

const categoryServiceFilter = (category) => {
  const idStr = String(category?._id || "");
  return {
    $or: [
      { category_id: idStr },
      { category_id: category?._id },
      { category: category?.name },
      { category_name: category?.name },
    ],
  };
};

const getPlatforms = async (req, res) => {
  try {
    const db = await getDb();

    let platforms = await db
      .collection("platforms")
      .find({})
      .sort({ priority: 1 })
      .toArray();

    // If no platforms exist yet, try to seed defaults once and reload.
    if (!platforms.length) {
      try {
        await seedPlatforms();
        platforms = await db
          .collection("platforms")
          .find({})
          .sort({ priority: 1 })
          .toArray();
      } catch (seedErr) {
        console.error("getPlatforms seedPlatforms error:", seedErr);
      }
    }

    const result = await Promise.all(
      platforms.map(async (platform) => {
        const categories = await db
          .collection("categories")
          .find({ platform_id: platform._id })
          .sort({ priority: 1 })
          .toArray();

        const categoriesWithCounts = await Promise.all(
          categories.map(async (cat) => {
          const servicesCount = await db
            .collection("services")
            .countDocuments(categoryServiceFilter(cat));
            return { ...cat, services_count: servicesCount };
          })
        );

        return {
          ...platform,
          categories_count: categories.length,
          categories: categoriesWithCounts,
        };
      })
    );

    res.json({ success: true, platforms: result });
  } catch (err) {
    console.error("getPlatforms error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const createPlatform = async (req, res) => {
  try {
    const db = await getDb();
    const { name, slug, icon, color, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Name is required",
      });
    }

    const lastPlatform = await db
      .collection("platforms")
      .findOne({}, { sort: { priority: -1 } });
    const priority = lastPlatform ? lastPlatform.priority + 1 : 1;

    const platform = {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      icon: icon || "📱",
      color: color || "#00d2ff",
      description: description || "",
      priority,
      is_active: true,
      is_visible: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("platforms").insertOne(platform);

    res.json({
      success: true,
      platform: { ...platform, _id: result.insertedId },
    });
  } catch (err) {
    console.error("createPlatform error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const updatePlatform = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const updates = req.body || {};

    delete updates._id;
    updates.updated_at = new Date();

    await db.collection("platforms").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updates,
      }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const reorderPlatforms = async (req, res) => {
  try {
    const db = await getDb();
    const { platforms } = req.body;

    if (!platforms || !Array.isArray(platforms)) {
      return res.status(400).json({
        success: false,
        error: "platforms array required",
      });
    }

    await Promise.all(
      platforms.map(({ id, priority }) =>
        db.collection("platforms").updateOne(
          { _id: new ObjectId(id) },
          { $set: { priority, updated_at: new Date() } }
        )
      )
    );

    await recalculateGlobalPriority(db);

    res.json({ success: true });
  } catch (err) {
    console.error("reorderPlatforms error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const deletePlatform = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const force = req.query.force === "true";

    const categoriesCount = await db
      .collection("categories")
      .countDocuments({ platform_id: new ObjectId(id) });

    if (categoriesCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        error: `Platform has ${categoriesCount} categories. Use force=true to delete anyway.`,
      });
    }

    if (force) {
      await db
        .collection("categories")
        .deleteMany({ platform_id: new ObjectId(id) });
    }

    await db.collection("platforms").deleteOne({
      _id: new ObjectId(id),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const db = await getDb();

    const platforms = await db
      .collection("platforms")
      .find({})
      .sort({ priority: 1 })
      .toArray();

    const grouped = {};
    const flat = [];

    for (const platform of platforms) {
      const categories = await db
        .collection("categories")
        .find({ platform_id: platform._id })
        .sort({ priority: 1 })
        .toArray();

      const categoriesWithCounts = await Promise.all(
        categories.map(async (cat) => {
          const services_count = await db
            .collection("services")
            .countDocuments(categoryServiceFilter(cat));
          return { ...cat, services_count };
        })
      );

      grouped[platform.slug] = {
        platform,
        categories: categoriesWithCounts,
      };

      flat.push(...categoriesWithCounts);
    }

    res.json({ success: true, grouped, flat });
  } catch (err) {
    console.error("getCategories error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const db = await getDb();
    const { name, slug, description, icon, platform_id, priority } = req.body;

    if (!name || !platform_id) {
      return res.status(400).json({
        success: false,
        error: "Name and platform_id required",
      });
    }

    const platform = await db.collection("platforms").findOne({
      _id: new ObjectId(platform_id),
    });

    if (!platform) {
      return res.status(404).json({
        success: false,
        error: "Platform not found",
      });
    }

    const lastCat = await db.collection("categories").findOne(
      {
        platform_id: new ObjectId(platform_id),
      },
      { sort: { priority: -1 } }
    );
    const fallbackBase =
      lastCat && typeof lastCat.priority === "number"
        ? lastCat.priority
        : lastCat && typeof lastCat.sort_order === "number"
          ? lastCat.sort_order
          : 0;
    const catPriority =
      priority !== undefined && priority !== null && priority !== ""
        ? Number(priority)
        : fallbackBase + 1;
    const safeCatPriority = Number.isFinite(catPriority) ? catPriority : 1;

    const category = {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      description: description || "",
      icon: icon || "📂",
      platform_id: new ObjectId(platform_id),
      platform_name: platform.name,
      platform_slug: platform.slug,
      priority: safeCatPriority,
      // Admin category management sorts by `sort_order` / `global_order`,
      // while user-facing lists sort by `priority`.
      sort_order: safeCatPriority,
      global_priority: 999,
      global_order: 999,
      is_active: true,
      is_visible: true,
      services_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("categories").insertOne(category);

    await recalculateGlobalPriority(db);

    res.json({
      success: true,
      category: { ...category, _id: result.insertedId },
    });
  } catch (err) {
    console.error("createCategory error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const updates = req.body || {};
    const existing = await db.collection("categories").findOne({ _id: new ObjectId(id) });

    if (updates.platform_id) {
      const platform = await db.collection("platforms").findOne({
        _id: new ObjectId(updates.platform_id),
      });
      if (platform) {
        updates.platform_name = platform.name;
        updates.platform_slug = platform.slug;
        updates.platform_id = new ObjectId(updates.platform_id);
      }
    }

    delete updates._id;
    updates.updated_at = new Date();

    await db.collection("categories").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updates,
      }
    );

    const nextCategoryDoc = { ...(existing || {}), ...updates, _id: new ObjectId(id) };
    await db.collection("services").updateMany(
      existing ? categoryServiceFilter(existing) : { category_id: String(id) },
      {
        $set: {
          category_id: String(id),
          category: nextCategoryDoc.name || null,
          category_name: nextCategoryDoc.name || null,
          platform_slug: nextCategoryDoc.platform_slug || null,
          updated_at: new Date(),
        },
      }
    );

    await recalculateGlobalPriority(db);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const reorderCategories = async (req, res) => {
  try {
    const db = await getDb();
    const { platform_id, categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        error: "categories array required",
      });
    }

    await Promise.all(
      categories.map(({ id, priority }) =>
        db.collection("categories").updateOne(
          { _id: new ObjectId(id) },
          { $set: { priority, updated_at: new Date() } }
        )
      )
    );

    await recalculateGlobalPriority(db);

    res.json({ success: true });
  } catch (err) {
    console.error("reorderCategories error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { move_services_to } = req.body || {};
    const force = req.query.force === "true";

    const categoryDoc = await db.collection("categories").findOne({ _id: new ObjectId(id) });
    const servicesCount = categoryDoc
      ? await db.collection("services").countDocuments(categoryServiceFilter(categoryDoc))
      : 0;

    if (servicesCount > 0 && !force && !move_services_to) {
      return res.status(400).json({
        success: false,
        error: `Category has ${servicesCount} services. Specify move_services_to or use force=true`,
      });
    }

    if (move_services_to) {
      const target = await db.collection("categories").findOne({ _id: new ObjectId(move_services_to) });
      const targetId = String(move_services_to);
      await db.collection("services").updateMany(
        categoryDoc ? categoryServiceFilter(categoryDoc) : { category_id: String(id) },
        {
          $set: {
            category_id: targetId,
            category: target?.name || null,
            category_name: target?.name || null,
            platform_slug: target?.platform_slug || null,
            updated_at: new Date(),
          },
        }
      );
    }

    await db.collection("categories").deleteOne({
      _id: new ObjectId(id),
    });

    await recalculateGlobalPriority(db);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getPublicCategories = async (req, res) => {
  try {
    const db = await getDb();

    const platforms = await db
      .collection("platforms")
      .find({ is_active: true, is_visible: true })
      .sort({ priority: 1 })
      .toArray();

    const grouped = {};

    for (const platform of platforms) {
      const categories = await db
        .collection("categories")
        .find({
          platform_id: platform._id,
          is_active: true,
          is_visible: true,
        })
        .sort({ priority: 1 })
        .toArray();

      if (categories.length > 0) {
        grouped[platform.slug] = { platform, categories };
      }
    }

    res.json({ success: true, grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getCategoriesWithServices = async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.collection("categories").aggregate([
      { $match: { is_active: { $ne: false } } },
      {
        $lookup: {
          from: "services",
          let: { categoryIdStr: { $toString: "$_id" } },
          pipeline: [
            { $match: { is_active: true } },
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: "$category_id" }, "$$categoryIdStr"],
                },
              },
            },
            { $sort: { sort_order: 1, _id: 1 } },
          ],
          as: "services",
        },
      },
      { $sort: { sort_order: 1, global_order: 1, name: 1 } },
      {
        $project: {
          _id: { $toString: "$_id" },
          name: 1,
          services: 1,
        },
      },
    ]).toArray();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const recalculateGlobalPriority = async (db) => {
  try {
    const platforms = await db
      .collection("platforms")
      .find({})
      .sort({ priority: 1 })
      .toArray();

    let globalCounter = 1;

    for (const platform of platforms) {
      const categories = await db
        .collection("categories")
        .find({ platform_id: platform._id })
        .sort({ priority: 1 })
        .toArray();

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const localPriority =
          typeof category.priority === "number"
            ? category.priority
            : typeof category.sort_order === "number"
              ? category.sort_order
              : i + 1;

        await db.collection("categories").updateOne(
          { _id: category._id },
          {
            $set: {
              // User-side ordering
              priority: localPriority,
              global_priority: globalCounter,
              // Admin-side ordering (Category Management page)
              sort_order: localPriority,
              global_order: globalCounter,
              platform_name: platform.name,
              platform_slug: platform.slug,
            },
          }
        );
        globalCounter++;
      }
    }
  } catch (err) {
    console.error("recalculateGlobalPriority error:", err);
  }
};

module.exports = {
  getPlatforms,
  createPlatform,
  updatePlatform,
  reorderPlatforms,
  deletePlatform,
  getCategories,
  createCategory,
  updateCategory,
  reorderCategories,
  deleteCategory,
  getPublicCategories,
  getCategoriesWithServices,
  recalculateGlobalPriority,
};


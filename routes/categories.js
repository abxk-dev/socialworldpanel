const express = require("express");
const router = express.Router();

const { parseAuth } = require("../lib/handlers/_auth");
const {
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
} = require("../lib/handlers/categoryHandler");

// Simple admin auth guard using existing JWT helpers
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

// PUBLIC routes (no auth)
router.get("/public/categories", getPublicCategories);
router.get("/categories-with-services", getCategoriesWithServices);
router.get("/public/platforms", getPlatforms);

// ADMIN routes (auth required)
router.get("/admin/platforms", verifyToken, getPlatforms);
router.post("/admin/platforms", verifyToken, createPlatform);
router.put("/admin/platforms/reorder", verifyToken, reorderPlatforms);
router.put("/admin/platforms/:id", verifyToken, updatePlatform);
router.delete("/admin/platforms/:id", verifyToken, deletePlatform);

router.get("/admin/categories", verifyToken, getCategories);
router.get("/admin/categories/flat", verifyToken, getCategories);
router.post("/admin/categories", verifyToken, createCategory);
router.put("/admin/categories/reorder", verifyToken, reorderCategories);
router.put("/admin/categories/:id", verifyToken, updateCategory);
router.delete("/admin/categories/:id", verifyToken, deleteCategory);

module.exports = router;


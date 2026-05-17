const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const blogAdmin = require("../lib/handlers/blogAdminHandler");

const router = express.Router();

// Admin blog CRUD
router.get("/", wrap(blogAdmin.listPosts));
router.get("/:id", wrap(blogAdmin.getPost));
router.post("/", wrap(blogAdmin.createPost));
router.put("/:id", wrap(blogAdmin.updatePost));
router.delete("/:id", wrap(blogAdmin.deletePost));

module.exports = router;


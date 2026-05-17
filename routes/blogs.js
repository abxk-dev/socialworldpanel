const express = require("express");
const { wrap } = require("../lib/wrapHandler");
const blogHandler = require("../lib/handlers/blogHandler");

const router = express.Router();

// Public blog listing
router.get("/", wrap(blogHandler.listPublicPosts));

// Public blog single post by slug
router.get("/:slug", wrap(blogHandler.getPostBySlug));

module.exports = router;


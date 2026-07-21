const express = require("express");
const router = express.Router();

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  upload,
} = require("../middleware/uploadMiddleware");

const {
  createPost,
  getPosts,
  getUserPosts,
  likePost,
  unlikePost,
  commentPost,
  getComments,
  updatePostCaption,
  deletePost,
  savePost,
  unsavePost,
  getSavedPosts,
} = require("../controllers/postController");

// =========================
// CREATE POST
// =========================
router.post(
  "/create",
  protect,
  upload.single("postImage"),
  createPost
);

// =========================
// SAVED POSTS
// Keep static route before
// dynamic routes
// =========================
router.get(
  "/saved",
  protect,
  getSavedPosts
);

// =========================
// USER POSTS
// =========================
router.get(
  "/user/:username",
  protect,
  getUserPosts
);

// =========================
// ALL POSTS
// =========================
router.get(
  "/",
  protect,
  getPosts
);

// =========================
// LIKE / UNLIKE
// =========================
router.put(
  "/like/:id",
  protect,
  likePost
);

router.put(
  "/unlike/:id",
  protect,
  unlikePost
);

// =========================
// COMMENTS
// =========================
router.post(
  "/comment/:id",
  protect,
  commentPost
);

router.get(
  "/comments/:id",
  protect,
  getComments
);

// =========================
// SAVE / UNSAVE
// =========================
router.put(
  "/save/:id",
  protect,
  savePost
);

router.put(
  "/unsave/:id",
  protect,
  unsavePost
);

// =========================
// UPDATE POST CAPTION
// =========================
router.patch(
  "/:id/caption",
  protect,
  updatePostCaption
);

// =========================
// DELETE POST
// Keep generic dynamic route last
// =========================
router.delete(
  "/:id",
  protect,
  deletePost
);

module.exports = router;
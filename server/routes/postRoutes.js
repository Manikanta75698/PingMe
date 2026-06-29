const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const postUpload = require("../middleware/postUpload");

const {
  createPost,
  likePost,
  unlikePost,
  addComment,
  getPosts,
  getUserPosts,
  savePost,
  getSavedPosts,
  deletePost,
  editPost,
} = require("../controllers/postController");

router.post(
  "/create",
  protect,
  postUpload.single("image"),
  createPost
);

router.post(
  "/like/:id",
  protect,
  likePost
);

router.post(
  "/unlike/:id",
  protect,
  unlikePost
);

router.post(
  "/comment/:id",
  protect,
  addComment
);

router.get(
  "/",
  protect,
  getPosts
);

router.post(
  "/save/:id",
  protect,
  savePost
);

router.get(
  "/saved",
  protect,
  getSavedPosts
);

router.put(
  "/:id",
  protect,
  editPost
);

router.delete(
  "/:id",
  protect,
  deletePost
);

router.get(
  "/user/:id",
  protect,
  getUserPosts
);

module.exports = router;
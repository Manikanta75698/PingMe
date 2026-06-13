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

module.exports = router;
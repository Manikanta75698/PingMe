const express = require("express");
const router = express.Router();

const multer =
  require("../config/multer");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  createStory,
  getStories,
} = require(
  "../controllers/storyController"
);

router.post(
  "/create",
  protect,
  multer.single("image"),
  createStory
);

router.get(
  "/",
  protect,
  getStories
);

module.exports = router;
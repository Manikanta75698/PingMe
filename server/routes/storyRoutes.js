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
  deleteStory,
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

router.delete(
  "/:id",
  protect,
  deleteStory
);

module.exports = router;
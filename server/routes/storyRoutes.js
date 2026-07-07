const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const {
  createStory,
  getStories,
  deleteStory,
  viewStory,
} = require("../controllers/storyController");

router.post(
  "/create",
  protect,
  upload.single("storyImage"),
  createStory
);

router.get("/", protect, getStories);

router.delete("/:id", protect, deleteStory);

router.put("/view/:id", protect, viewStory);

module.exports = router;
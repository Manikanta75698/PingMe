const express = require("express");

const router = express.Router();

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  upload,
} = require("../middleware/uploadMiddleware");

const {
  sendMessage,
  getMessages,
  getChatSummaries,
  toggleReaction,
  editMessage,
  deleteMessage,
} = require(
  "../controllers/messageController"
);

router.post(
  "/send",
  protect,
  upload.single("image"),
  sendMessage
);

router.get(
  "/summaries",
  protect,
  getChatSummaries
);

router.patch(
  "/:messageId/reaction",
  protect,
  toggleReaction
);

router.patch(
  "/:messageId",
  protect,
  editMessage
);

router.delete(
  "/:messageId",
  protect,
  deleteMessage
);

router.get(
  "/conversation/:userId",
  protect,
  getMessages
);

module.exports = router;
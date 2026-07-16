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
  getPinnedMessage,
  getChatSummaries,
  toggleReaction,
  editMessage,
  forwardMessage,
  togglePinMessage,
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
  "/:messageId/pin",
  protect,
  togglePinMessage
);

router.patch(
  "/:messageId",
  protect,
  editMessage
);

router.post(
  "/:messageId/forward",
  protect,
  forwardMessage
);

router.delete(
  "/:messageId",
  protect,
  deleteMessage
);

router.get(
  "/conversation/:userId/pinned",
  protect,
  getPinnedMessage
);

router.get(
  "/conversation/:userId",
  protect,
  getMessages
);

module.exports = router;
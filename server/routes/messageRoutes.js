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
  deleteMessage,
} = require("../controllers/messageController");

/* =========================
   SEND MESSAGE
========================= */

router.post(
  "/send",
  protect,
  upload.single("image"),
  sendMessage
);

/* =========================
   CHAT SUMMARIES
========================= */

router.get(
  "/summaries",
  protect,
  getChatSummaries
);

/* =========================
   MESSAGE REACTION
========================= */

router.patch(
  "/:messageId/reaction",
  protect,
  toggleReaction
);

/* =========================
   DELETE MESSAGE
========================= */

router.delete(
  "/:messageId",
  protect,
  deleteMessage
);

/* =========================
   GET CONVERSATION
========================= */

router.get(
  "/conversation/:userId",
  protect,
  getMessages
);

module.exports = router;
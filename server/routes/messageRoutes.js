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
  deleteMessage,
} = require("../controllers/messageController");

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
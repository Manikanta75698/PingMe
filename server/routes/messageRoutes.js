const express = require("express");
const router = express.Router();

const upload = require("../config/multer");

const {
  sendMessage,
  getMessages,
  markAsSeen,
} = require("../controllers/messageController");

// Send text or image message
router.post(
  "/",
  upload.single("image"),
  sendMessage
);

// Get all messages
router.get("/", getMessages);

// Mark messages as seen
router.put("/seen", markAsSeen);

module.exports = router;
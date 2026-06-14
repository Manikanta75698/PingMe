const express = require("express");
const router = express.Router();

const upload = require("../config/multer");

const {
  sendMessage,
  getMessages,
  markAsSeen,
  deleteForMe,
  deleteForEveryone,
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


// Delete message only for current user
router.put("/delete-for-me/:id", deleteForMe);


// Delete message for everyone
router.put(
  "/delete-for-everyone/:id",
  deleteForEveryone
);


module.exports = router;
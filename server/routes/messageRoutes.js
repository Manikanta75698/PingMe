const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
  markAsSeen,
} = require("../controllers/messageController");

router.post("/", sendMessage);
router.get("/", getMessages);
router.put("/seen", markAsSeen);

module.exports = router;
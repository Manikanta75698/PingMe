const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  sendRequest,
  getReceivedRequests,
  getSentRequests,
  acceptRequest,
  declineRequest,
} = require("../controllers/chatRequestController");

router.post("/send", protect, sendRequest);

router.get("/received", protect, getReceivedRequests);

router.get("/sent", protect, getSentRequests);

router.patch("/accept/:id", protect, acceptRequest);

router.patch("/decline/:id", protect, declineRequest);

module.exports = router;
const express = require("express");

const router = express.Router();

const {
  getNotifications,
} = require("../controllers/notificationController");

const {
  protect,
} = require("../middleware/authMiddleware");


// Get all notifications
router.get(
  "/",
  protect,
  getNotifications
);


module.exports = router;
const express = require("express");
const router = express.Router();

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  markLikesAsRead,
} = require(
  "../controllers/notificationController"
);

router.get(
  "/",
  protect,
  getNotifications
);

router.put(
  "/read-likes",
  protect,
  markLikesAsRead
);

router.put(
  "/read-all",
  protect,
  markAllAsRead
);

router.put(
  "/read/:id",
  protect,
  markAsRead
);
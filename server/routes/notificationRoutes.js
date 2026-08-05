const express = require("express");

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  markLikesAsRead,
} = require(
  "../controllers/notificationController"
);

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();

router.get(
  "/",
  protect,
  getNotifications
);

router.put(
  "/read/:id",
  protect,
  markAsRead
);

router.put(
  "/read-all",
  protect,
  markAllAsRead
);

router.put(
  "/read-likes",
  protect,
  markLikesAsRead
);

module.exports = router;
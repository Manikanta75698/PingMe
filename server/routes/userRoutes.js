const express = require("express");

const router = express.Router();

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const {
  getUsers,
  getExploreUsers,
} = require(
  "../controllers/userController"
);

/* =========================
   EXPLORE USERS
========================= */

router.get(
  "/explore",
  protect,
  getExploreUsers
);

/* =========================
   GENERAL USERS
========================= */

router.get(
  "/",
  protect,
  getUsers
);

module.exports = router;
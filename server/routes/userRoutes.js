const express = require("express");
const router = express.Router();

const upload = require("../config/multer");

const {
  uploadProfilePic,
  updateProfile,
  followUser,
  unfollowUser,
  getUserProfile,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");


// Upload Profile Picture
router.put(
  "/upload",
  protect,
  upload.single("profilePic"),
  uploadProfilePic
);


// Update Profile Details
router.put(
  "/update",
  protect,
  updateProfile
);


// Follow User
router.put(
  "/follow/:id",
  protect,
  followUser
);


// Unfollow User
router.put(
  "/unfollow/:id",
  protect,
  unfollowUser
);


// Get User Profile
router.get(
  "/:id",
  protect,
  getUserProfile
);


module.exports = router;
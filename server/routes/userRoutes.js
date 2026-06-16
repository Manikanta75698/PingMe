const express = require("express");
const router = express.Router();

const upload = require("../config/multer");

const {
  uploadProfilePic,
  updateProfile,
  followUser,
  unfollowUser,
  searchUsers,
  getFollowers,
  getFollowing,
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


// Get Followers
router.get(
  "/followers/:id",
  protect,
  getFollowers
);


// Get Following
router.get(
  "/following/:id",
  protect,
  getFollowing
);


// Get User Profile (Always Last)
router.get(
  "/:id",
  protect,
  getUserProfile
);

router.get(
  "/search",
  protect,
  searchUsers
);

module.exports = router;
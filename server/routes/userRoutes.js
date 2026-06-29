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
  getAllUsers,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");


// Upload Profile Picture
router.put(
  "/upload",
  protect,
  upload.single("profilePic"),
  uploadProfilePic
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

router.get(
  "/search",
  protect,
  searchUsers
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

router.get(
  "/all",
  protect,
  getAllUsers
);

// Get User Profile (Always Last)
router.get(
  "/:id",
  protect,
  getUserProfile
);

router.put(
  "/update-profile",
  protect,
  updateProfile
);



module.exports = router;
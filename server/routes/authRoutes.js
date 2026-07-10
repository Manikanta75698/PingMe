const express = require("express");
const router = express.Router();

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  singleProfileUpload,
  singleCoverUpload,
} = require("../middleware/uploadMiddleware");

const {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
  googleLogin,
  getProfile,
  updateProfile,
  uploadProfilePicture,
  uploadCoverPhoto,
  followUser,
  unfollowUser,
  getUserProfile,
  searchUsers,
  checkUsernameAvailability,
  setPassword,
  changePassword,
} = require("../controllers/authController");

// =========================
// AUTH ROUTES
// =========================

router.post(
  "/register",
  registerUser
);

router.post(
  "/login",
  loginUser
);

router.post(
  "/verify-otp",
  verifyOtp
);

router.post(
  "/resend-otp",
  resendOtp
);

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/verify-reset-otp",
  verifyPasswordResetOtp
);

router.post(
  "/reset-password",
  resetPassword
);

router.post(
  "/google",
  googleLogin
);

// =========================
// PUBLIC USERNAME ROUTES
// =========================

// Must stay public for Register page
router.get(
  "/username-availability",
  checkUsernameAvailability
);

// =========================
// PROFILE ROUTES
// =========================

router.get(
  "/profile",
  protect,
  getProfile
);

router.put(
  "/profile",
  protect,
  updateProfile
);

router.put(
  "/profile-picture",
  protect,
  singleProfileUpload,
  uploadProfilePicture
);

router.put(
  "/cover-photo",
  protect,
  singleCoverUpload,
  uploadCoverPhoto
);

// =========================
// FOLLOW ROUTES
// =========================

router.put(
  "/follow/:id",
  protect,
  followUser
);

router.put(
  "/unfollow/:id",
  protect,
  unfollowUser
);

router.put("/change-password", protect, changePassword);

router.post("/set-password", protect, setPassword);

// =========================
// USER ROUTES
// =========================

router.get(
  "/search",
  protect,
  searchUsers
);

router.get(
  "/user/:username",
  protect,
  getUserProfile
);

module.exports = router;
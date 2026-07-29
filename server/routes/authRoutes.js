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
  getPrivacySettings,
  updatePrivacySettings,
  updateProfile,
  uploadProfilePicture,
  uploadCoverPhoto,

  followUser,
  unfollowUser,
  getReceivedFollowRequests,
  getSentFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
  cancelFollowRequest,

  getUserProfile,
  searchUsers,
  checkUsernameAvailability,
  setPassword,
  changePassword,
  blockUser,
  unblockUser,
  getBlockStatus,
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

// =========================
// PRIVACY SETTINGS ROUTES
// =========================

router.get(
  "/privacy-settings",
  protect,
  getPrivacySettings
);

router.patch(
  "/privacy-settings",
  protect,
  updatePrivacySettings
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

router.post(
  "/follow/:id",
  protect,
  followUser
);

router.delete(
  "/follow/:id",
  protect,
  unfollowUser
);

// =========================
// FOLLOW REQUEST ROUTES
// =========================

router.get(
  "/follow-requests/received",
  protect,
  getReceivedFollowRequests
);

router.get(
  "/follow-requests/sent",
  protect,
  getSentFollowRequests
);

router.patch(
  "/follow-requests/:requestId/accept",
  protect,
  acceptFollowRequest
);

router.patch(
  "/follow-requests/:requestId/decline",
  protect,
  declineFollowRequest
);

router.delete(
  "/follow-requests/:requestId",
  protect,
  cancelFollowRequest
);

router.put(
  "/change-password",
  protect,
  changePassword
);

router.post(
  "/set-password",
  protect,
  setPassword
);


// =========================
// USER ROUTES
// =========================

router.get(
  "/search",
  protect,
  searchUsers
);

/* =========================
   BLOCK USER
========================= */

router.get(
  "/users/:userId/block-status",
  protect,
  getBlockStatus
);

router.post(
  "/users/:userId/block",
  protect,
  blockUser
);

router.delete(
  "/users/:userId/block",
  protect,
  unblockUser
);

router.get(
  "/user/:username",
  protect,
  getUserProfile
);

module.exports = router;
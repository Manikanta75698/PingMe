const express = require("express");

const router = express.Router();

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const {
  singleProfileUpload,
} = require(
  "../middleware/uploadMiddleware"
);

const {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,

  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,

  googleLogin,

  setPassword,
  changePassword,

  getProfile,
  getCurrentMood,
  updateCurrentMood,

  getCurrentIntent,
  updateCurrentIntent,

  updateProfile,
  uploadProfilePicture,

  getPrivacySettings,
  updatePrivacySettings,

  followUser,
  unfollowUser,

  getReceivedFollowRequests,
  getSentFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
  cancelFollowRequest,

  searchUsers,
  checkUsernameAvailability,
  getUserProfile,

  blockUser,
  unblockUser,
  getBlockStatus,
} = require(
  "../controllers/authController"
);

/* =========================
   AUTHENTICATION
========================= */

router.post(
  "/register",
  registerUser
);

router.post(
  "/login",
  loginUser
);

router.post(
  "/google",
  googleLogin
);

/* =========================
   EMAIL VERIFICATION
========================= */

router.post(
  "/verify-otp",
  verifyOtp
);

router.post(
  "/resend-otp",
  resendOtp
);

/* =========================
   PASSWORD RESET
========================= */

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

/* =========================
   PASSWORD MANAGEMENT
========================= */

router.post(
  "/set-password",
  protect,
  setPassword
);

router.put(
  "/change-password",
  protect,
  changePassword
);

/* =========================
   PUBLIC USERNAME CHECK
========================= */

router.get(
  "/username-availability",
  checkUsernameAvailability
);

/* =========================
   CURRENT USER PROFILE
========================= */

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


/* =========================
   MOOD MATCH
========================= */

router.get(
  "/mood",
  protect,
  getCurrentMood
);

router.patch(
  "/mood",
  protect,
  updateCurrentMood
);


router.get(
  "/intent",
  protect,
  getCurrentIntent
);

router.patch(
  "/intent",
  protect,
  updateCurrentIntent
);

/* =========================
   PRIVACY SETTINGS
========================= */

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

/* =========================
   FOLLOW / UNFOLLOW
========================= */

/*
 * Public account:
 * → direct follow
 *
 * Private account:
 * → pending follow request
 *
 * Ee decision followUser controller
 * lopala jaruguthundi.
 */
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

/* =========================
   FOLLOW REQUESTS
========================= */

/*
 * Current user ki vachina
 * pending follow requests.
 */
router.get(
  "/follow-requests/received",
  protect,
  getReceivedFollowRequests
);

/*
 * Current user pampina
 * pending follow requests.
 */
router.get(
  "/follow-requests/sent",
  protect,
  getSentFollowRequests
);

/*
 * Private-account owner
 * request accept chesthadu.
 */
router.patch(
  "/follow-requests/:requestId/accept",
  protect,
  acceptFollowRequest
);

/*
 * Private-account owner
 * request decline chesthadu.
 */
router.patch(
  "/follow-requests/:requestId/decline",
  protect,
  declineFollowRequest
);

/*
 * Request pampina user
 * pending request cancel chesthadu.
 */
router.delete(
  "/follow-requests/:requestId",
  protect,
  cancelFollowRequest
);

/* =========================
   USER SEARCH
========================= */

router.get(
  "/search",
  protect,
  searchUsers
);

/* =========================
   BLOCK MANAGEMENT
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

/* =========================
   PUBLIC USER PROFILE
========================= */


router.get(
  "/user/:username",
  protect,
  getUserProfile
);

module.exports = router;
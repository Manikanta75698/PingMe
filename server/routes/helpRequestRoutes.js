const express = require("express");

const router = express.Router();

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const {
  createHelpRequest,
  getHelpRequests,
  getHelpRequestById,
  getMyHelpRequests,
  updateHelpRequest,
  offerHelp,
  withdrawHelpOffer,
  acceptHelper,
  resolveHelpRequest,
  cancelHelpRequest,
  reportHelpRequest,
  deleteHelpRequest,
} = require(
  "../controllers/helpRequestController"
);

/* =========================
   HELP REQUEST FEED
========================= */

/**
 * Create a new community help request.
 *
 * POST /api/help-requests
 */
router.post(
  "/",
  protect,
  createHelpRequest
);

/**
 * Get the community help-request feed.
 *
 * Supported query parameters:
 * page
 * limit
 * category
 * urgency
 * status
 * city
 * search
 * sort
 *
 * GET /api/help-requests
 */
router.get(
  "/",
  protect,
  getHelpRequests
);

/* =========================
   CURRENT USER REQUESTS
========================= */

/**
 * Get requests created by the logged-in user.
 *
 * This route must stay above "/:requestId"
 * so Express does not treat "my" as an ID.
 *
 * GET /api/help-requests/my/requests
 */
router.get(
  "/my/requests",
  protect,
  getMyHelpRequests
);

/* =========================
   HELP OFFERS
========================= */

/**
 * Offer help for a request.
 *
 * POST /api/help-requests/:requestId/offer
 */
router.post(
  "/:requestId/offer",
  protect,
  offerHelp
);

/**
 * Withdraw the logged-in user's help offer.
 *
 * DELETE /api/help-requests/:requestId/offer
 */
router.delete(
  "/:requestId/offer",
  protect,
  withdrawHelpOffer
);

/**
 * Request owner accepts one helper.
 *
 * PATCH
 * /api/help-requests/:requestId/helpers/:helperId/accept
 */
router.patch(
  "/:requestId/helpers/:helperId/accept",
  protect,
  acceptHelper
);

/* =========================
   REQUEST STATUS
========================= */

/**
 * Mark a request as resolved.
 *
 * PATCH /api/help-requests/:requestId/resolve
 */
router.patch(
  "/:requestId/resolve",
  protect,
  resolveHelpRequest
);

/**
 * Cancel a request.
 *
 * PATCH /api/help-requests/:requestId/cancel
 */
router.patch(
  "/:requestId/cancel",
  protect,
  cancelHelpRequest
);

/* =========================
   SAFETY
========================= */

/**
 * Report a suspicious or unsafe request.
 *
 * POST /api/help-requests/:requestId/report
 */
router.post(
  "/:requestId/report",
  protect,
  reportHelpRequest
);

/* =========================
   SINGLE REQUEST
========================= */

/**
 * Get complete request details.
 *
 * GET /api/help-requests/:requestId
 */
router.get(
  "/:requestId",
  protect,
  getHelpRequestById
);

/**
 * Update a request created by the logged-in user.
 *
 * PATCH /api/help-requests/:requestId
 */
router.patch(
  "/:requestId",
  protect,
  updateHelpRequest
);

/**
 * Permanently delete a request created by
 * the logged-in user.
 *
 * DELETE /api/help-requests/:requestId
 */
router.delete(
  "/:requestId",
  protect,
  deleteHelpRequest
);

module.exports = router;
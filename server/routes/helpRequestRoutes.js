const express = require("express");

const router = express.Router();

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  updateNearbyHelpLocation,
  createHelpRequest,
  getHelpRequests,
  getHelpRequestById,
  getMyHelpRequests,
  getMyHelpHistory,
  getCommunityImpact,
  updateHelpRequest,
  offerHelp,
  withdrawHelpOffer,
  acceptHelper,
  resolveHelpRequest,
  cancelHelpRequest,
  reportHelpRequest,
  deleteHelpRequest,
} = require("../controllers/helpRequestController");

router.patch(
  "/my/location",
  protect,
  updateNearbyHelpLocation
);

router.get(
  "/my/requests",
  protect,
  getMyHelpRequests
);

router.get(
  "/my/history",
  protect,
  getMyHelpHistory
);

router.get(
  "/community/impact",
  protect,
  getCommunityImpact
);

router.post(
  "/",
  protect,
  createHelpRequest
);

router.get(
  "/",
  protect,
  getHelpRequests
);

router.post(
  "/:requestId/offer",
  protect,
  offerHelp
);

router.delete(
  "/:requestId/offer",
  protect,
  withdrawHelpOffer
);

router.patch(
  "/:requestId/helpers/:helperId/accept",
  protect,
  acceptHelper
);

router.patch(
  "/:requestId/resolve",
  protect,
  resolveHelpRequest
);

router.patch(
  "/:requestId/cancel",
  protect,
  cancelHelpRequest
);

router.post(
  "/:requestId/report",
  protect,
  reportHelpRequest
);

router.get(
  "/:requestId",
  protect,
  getHelpRequestById
);

router.patch(
  "/:requestId",
  protect,
  updateHelpRequest
);

router.delete(
  "/:requestId",
  protect,
  deleteHelpRequest
);

module.exports = router;

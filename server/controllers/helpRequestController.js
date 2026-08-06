const mongoose = require("mongoose");
const HelpRequest = require("../models/HelpRequest");

const ALLOWED_CATEGORIES = [
  "emergency",
  "blood",
  "lost-found",
  "education",
  "transport",
  "food",
  "medical",
  "volunteer",
  "event",
  "other",
];

const ALLOWED_URGENCY_LEVELS = [
  "low",
  "medium",
  "high",
  "critical",
];

const ALLOWED_STATUSES = [
  "open",
  "in-progress",
  "resolved",
  "expired",
  "cancelled",
];

const getAuthenticatedUserId = (req) => {
  return req.user?._id || req.user?.id || null;
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeText = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizePhone = (value) => {
  return typeof value === "string"
    ? value.replace(/[^\d+\-\s()]/g, "").trim()
    : "";
};

const sanitizeHelpRequest = (helpRequest, currentUserId) => {
  const request =
    typeof helpRequest.toObject === "function"
      ? helpRequest.toObject()
      : { ...helpRequest };

  const creatorId =
    request.creator?._id?.toString?.() ||
    request.creator?.toString?.() ||
    "";

  const isOwner =
    currentUserId &&
    creatorId === currentUserId.toString();

  if (!isOwner) {
    delete request.contactPhone;
  }

  return {
    ...request,
    isOwner,
    helperCount: Array.isArray(request.helpers)
      ? request.helpers.length
      : 0,
  };
};

/**
 * @desc    Create a new help request
 * @route   POST /api/help-requests
 * @access  Private
 */
const createHelpRequest = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      title,
      description,
      category = "other",
      urgency = "medium",
      city = "",
      area = "",
      latitude,
      longitude,
      contactPreference = "chat",
      contactPhone = "",
      expiresInDays = 7,
      image = "",
    } = req.body;

    const cleanedTitle = normalizeText(title);
    const cleanedDescription = normalizeText(description);
    const cleanedCity = normalizeText(city);
    const cleanedArea = normalizeText(area);
    const cleanedPhone = normalizePhone(contactPhone);
    const cleanedImage = normalizeText(image);

    if (!cleanedTitle || cleanedTitle.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Title must contain at least 3 characters",
      });
    }

    if (!cleanedDescription || cleanedDescription.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Description must contain at least 5 characters",
      });
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid help request category",
      });
    }

    if (!ALLOWED_URGENCY_LEVELS.includes(urgency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid urgency level",
      });
    }

    if (!["chat", "phone", "both"].includes(contactPreference)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact preference",
      });
    }

    if (
      ["phone", "both"].includes(contactPreference) &&
      !cleanedPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is required for phone contact preference",
      });
    }

    const parsedLatitude =
      latitude === "" ||
        latitude === null ||
        latitude === undefined
        ? null
        : Number(latitude);

    const parsedLongitude =
      longitude === "" ||
        longitude === null ||
        longitude === undefined
        ? null
        : Number(longitude);

    if (
      parsedLatitude !== null &&
      (!Number.isFinite(parsedLatitude) ||
        parsedLatitude < -90 ||
        parsedLatitude > 90)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude",
      });
    }

    if (
      parsedLongitude !== null &&
      (!Number.isFinite(parsedLongitude) ||
        parsedLongitude < -180 ||
        parsedLongitude > 180)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude",
      });
    }

    const parsedExpiryDays = Math.min(
      Math.max(Number(expiresInDays) || 7, 1),
      30
    );

    const expiresAt = new Date(
      Date.now() +
      parsedExpiryDays * 24 * 60 * 60 * 1000
    );

    const helpRequest = await HelpRequest.create({
      creator: userId,
      title: cleanedTitle,
      description: cleanedDescription,
      category,
      urgency,
      location: {
        city: cleanedCity,
        area: cleanedArea,
        coordinates: {
          latitude: parsedLatitude,
          longitude: parsedLongitude,
        },
      },
      contactPreference,
      contactPhone: cleanedPhone,
      image: cleanedImage,
      expiresAt,
    });

    await helpRequest.populate(
      "creator",
      "username name profilePic"
    );

    return res.status(201).json({
      success: true,
      message: "Help request created successfully",
      helpRequest: sanitizeHelpRequest(
        helpRequest,
        userId
      ),
    });
  } catch (error) {
    console.error("Create help request error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          Object.values(error.errors)[0]?.message ||
          "Invalid help request data",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create help request",
    });
  }
};

/**
 * @desc    Get public/open help request feed
 * @route   GET /api/help-requests
 * @access  Private
 */
const getHelpRequests = async (req, res) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      30
    );
    const skip = (page - 1) * limit;

    const {
      category,
      urgency,
      status = "open",
      city,
      search,
      sort = "latest",
    } = req.query;

    const filter = {};

    if (category && category !== "all") {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category filter",
        });
      }

      filter.category = category;
    }

    if (urgency && urgency !== "all") {
      if (!ALLOWED_URGENCY_LEVELS.includes(urgency)) {
        return res.status(400).json({
          success: false,
          message: "Invalid urgency filter",
        });
      }

      filter.urgency = urgency;
    }

    if (status && status !== "all") {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
        });
      }

      filter.status = status;
    }

    if (city) {
      filter["location.city"] = {
        $regex: escapeRegex(normalizeText(city)),
        $options: "i",
      };
    }

    if (search) {
      const safeSearch = escapeRegex(
        normalizeText(search)
      );

      filter.$or = [
        {
          title: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          "location.city": {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          "location.area": {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const now = new Date();

    await HelpRequest.updateMany(
      {
        status: "open",
        expiresAt: { $lte: now },
      },
      {
        $set: {
          status: "expired",
        },
      }
    );

    let sortOptions = {
      createdAt: -1,
    };

    if (sort === "urgent") {
      sortOptions = {
        urgency: -1,
        createdAt: -1,
      };
    }

    if (sort === "oldest") {
      sortOptions = {
        createdAt: 1,
      };
    }

    if (sort === "expiring") {
      sortOptions = {
        expiresAt: 1,
        createdAt: -1,
      };
    }

    const [helpRequests, total] = await Promise.all([
      HelpRequest.find(filter)
        .populate(
          "creator",
          "username name profilePic"
        )
        .populate(
          "acceptedHelper",
          "username name profilePic"
        )
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),

      HelpRequest.countDocuments(filter),
    ]);

    const formattedRequests = helpRequests.map(
      (request) =>
        sanitizeHelpRequest(request, currentUserId)
    );

    return res.status(200).json({
      success: true,
      helpRequests: formattedRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get help requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load help requests",
    });
  }
};

/**
 * @desc    Get one help request
 * @route   GET /api/help-requests/:requestId
 * @access  Private
 */
const getHelpRequestById = async (req, res) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const { requestId } = req.params;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid help request ID",
      });
    }

    const helpRequest = await HelpRequest.findById(
      requestId
    )
      .select("+contactPhone")
      .populate(
        "creator",
        "username name profilePic"
      )
      .populate(
        "helpers.user",
        "username name profilePic"
      )
      .populate(
        "acceptedHelper",
        "username name profilePic"
      );

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    if (
      helpRequest.status === "open" &&
      helpRequest.expiresAt <= new Date()
    ) {
      helpRequest.status = "expired";
    }

    const creatorId =
      helpRequest.creator?._id?.toString() ||
      helpRequest.creator?.toString();

    if (
      !currentUserId ||
      creatorId !== currentUserId.toString()
    ) {
      helpRequest.views += 1;
    }

    await helpRequest.save();

    return res.status(200).json({
      success: true,
      helpRequest: sanitizeHelpRequest(
        helpRequest,
        currentUserId
      ),
    });
  } catch (error) {
    console.error("Get help request error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load help request",
    });
  }
};

/**
 * @desc    Get current user's created requests
 * @route   GET /api/help-requests/my/requests
 * @access  Private
 */
const getMyHelpRequests = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      30
    );
    const skip = (page - 1) * limit;

    const filter = {
      creator: userId,
    };

    if (
      req.query.status &&
      req.query.status !== "all"
    ) {
      if (!ALLOWED_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
        });
      }

      filter.status = req.query.status;
    }

    const [helpRequests, total] = await Promise.all([
      HelpRequest.find(filter)
        .select("+contactPhone")
        .populate(
          "creator",
          "username name profilePic"
        )
        .populate(
          "acceptedHelper",
          "username name profilePic"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      HelpRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      helpRequests: helpRequests.map((request) =>
        sanitizeHelpRequest(request, userId)
      ),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get my help requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load your help requests",
    });
  }
};

/**
 * @desc    Update owner's help request
 * @route   PATCH /api/help-requests/:requestId
 * @access  Private
 */
const updateHelpRequest = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { requestId } = req.params;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid help request ID",
      });
    }

    const helpRequest = await HelpRequest.findById(
      requestId
    ).select("+contactPhone");

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    if (
      helpRequest.creator.toString() !==
      userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can update only your own help request",
      });
    }

    if (
      ["resolved", "cancelled", "expired"].includes(
        helpRequest.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Closed help requests cannot be edited",
      });
    }

    const {
      title,
      description,
      category,
      urgency,
      city,
      area,
      contactPreference,
      contactPhone,
      image,
      expiresInDays,
    } = req.body;

    if (title !== undefined) {
      const cleanedTitle = normalizeText(title);

      if (cleanedTitle.length < 3) {
        return res.status(400).json({
          success: false,
          message:
            "Title must contain at least 3 characters",
        });
      }

      helpRequest.title = cleanedTitle;
    }

    if (description !== undefined) {
      const cleanedDescription =
        normalizeText(description);

      if (cleanedDescription.length < 5) {
        return res.status(400).json({
          success: false,
          message:
            "Description must contain at least 5 characters",
        });
      }

      helpRequest.description =
        cleanedDescription;
    }

    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      helpRequest.category = category;
    }

    if (urgency !== undefined) {
      if (
        !ALLOWED_URGENCY_LEVELS.includes(urgency)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid urgency level",
        });
      }

      helpRequest.urgency = urgency;
    }

    if (city !== undefined) {
      helpRequest.location.city =
        normalizeText(city);
    }

    if (area !== undefined) {
      helpRequest.location.area =
        normalizeText(area);
    }

    if (contactPreference !== undefined) {
      if (
        !["chat", "phone", "both"].includes(
          contactPreference
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid contact preference",
        });
      }

      helpRequest.contactPreference =
        contactPreference;
    }

    if (contactPhone !== undefined) {
      helpRequest.contactPhone =
        normalizePhone(contactPhone);
    }

    if (
      ["phone", "both"].includes(
        helpRequest.contactPreference
      ) &&
      !helpRequest.contactPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is required for the selected contact preference",
      });
    }

    if (image !== undefined) {
      helpRequest.image = normalizeText(image);
    }

    if (expiresInDays !== undefined) {
      const parsedExpiryDays = Math.min(
        Math.max(Number(expiresInDays) || 1, 1),
        30
      );

      helpRequest.expiresAt = new Date(
        Date.now() +
        parsedExpiryDays * 24 * 60 * 60 * 1000
      );
    }

    await helpRequest.save();

    await helpRequest.populate(
      "creator",
      "username name profilePic"
    );

    return res.status(200).json({
      success: true,
      message: "Help request updated successfully",
      helpRequest: sanitizeHelpRequest(
        helpRequest,
        userId
      ),
    });
  } catch (error) {
    console.error("Update help request error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update help request",
    });
  }
};

/**
 * @desc    Offer help
 * @route   POST /api/help-requests/:requestId/offer
 * @access  Private
 */
const offerHelp = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { requestId } = req.params;
    const message = normalizeText(req.body.message);

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid help request ID",
      });
    }

    if (message.length > 300) {
      return res.status(400).json({
        success: false,
        message:
          "Offer message cannot exceed 300 characters",
      });
    }

    const helpRequest = await HelpRequest.findById(
      requestId
    );

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    if (
      helpRequest.creator.toString() ===
      userId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot offer help to your own request",
      });
    }

    if (
      helpRequest.status !== "open" ||
      helpRequest.expiresAt <= new Date()
    ) {
      if (
        helpRequest.status === "open" &&
        helpRequest.expiresAt <= new Date()
      ) {
        helpRequest.status = "expired";
        await helpRequest.save();
      }

      return res.status(400).json({
        success: false,
        message:
          "This help request is no longer accepting offers",
      });
    }

    const alreadyOffered = helpRequest.helpers.some(
      (helper) =>
        helper.user.toString() === userId.toString()
    );

    if (alreadyOffered) {
      return res.status(409).json({
        success: false,
        message:
          "You have already offered help for this request",
      });
    }

    helpRequest.helpers.push({
      user: userId,
      message,
      status: "offered",
    });

    await helpRequest.save();

    await helpRequest.populate(
      "helpers.user",
      "username name profilePic"
    );

    const createdOffer =
      helpRequest.helpers[
      helpRequest.helpers.length - 1
      ];

    return res.status(201).json({
      success: true,
      message: "Your help offer was sent",
      offer: createdOffer,
      helperCount: helpRequest.helpers.length,
    });
  } catch (error) {
    console.error("Offer help error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send help offer",
    });
  }
};

/**
 * @desc    Withdraw current user's help offer
 * @route   DELETE /api/help-requests/:requestId/offer
 * @access  Private
 */
const withdrawHelpOffer = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { requestId } = req.params;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid help request ID",
      });
    }

    const helpRequest = await HelpRequest.findById(
      requestId
    );

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    const helper = helpRequest.helpers.find(
      (item) =>
        item.user.toString() === userId.toString()
    );

    if (!helper) {
      return res.status(404).json({
        success: false,
        message: "Help offer not found",
      });
    }

    if (
      helper.status === "accepted" ||
      helpRequest.acceptedHelper?.toString() ===
      userId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "An accepted help offer cannot be withdrawn",
      });
    }

    helpRequest.helpers = helpRequest.helpers.filter(
      (item) =>
        item.user.toString() !== userId.toString()
    );

    await helpRequest.save();

    return res.status(200).json({
      success: true,
      message: "Help offer withdrawn",
      helperCount: helpRequest.helpers.length,
    });
  } catch (error) {
    console.error(
      "Withdraw help offer error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to withdraw help offer",
    });
  }
};

/**
 * @desc    Accept a helper
 * @route   PATCH /api/help-requests/:requestId/helpers/:helperId/accept
 * @access  Private
 */
const acceptHelper = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { requestId, helperId } = req.params;

    if (
      !isValidObjectId(requestId) ||
      !isValidObjectId(helperId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request or helper ID",
      });
    }

    const helpRequest = await HelpRequest.findById(
      requestId
    );

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    if (
      helpRequest.creator.toString() !==
      userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the request owner can accept a helper",
      });
    }

    if (helpRequest.status !== "open") {
      return res.status(400).json({
        success: false,
        message:
          "A helper can be accepted only for an open request",
      });
    }

    const selectedHelper =
      helpRequest.helpers.find(
        (helper) =>
          helper.user.toString() === helperId
      );

    if (!selectedHelper) {
      return res.status(404).json({
        success: false,
        message: "Help offer not found",
      });
    }

    helpRequest.helpers.forEach((helper) => {
      helper.status =
        helper.user.toString() === helperId
          ? "accepted"
          : "declined";
    });

    helpRequest.acceptedHelper = helperId;
    helpRequest.status = "in-progress";

    await helpRequest.save();

    await helpRequest.populate(
      "acceptedHelper",
      "username name profilePic"
    );

    return res.status(200).json({
      success: true,
      message: "Helper accepted successfully",
      acceptedHelper:
        helpRequest.acceptedHelper,
      status: helpRequest.status,
    });
  } catch (error) {
    console.error("Accept helper error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to accept helper",
    });
  }
};

/**
 * @desc    Mark request resolved
 * @route   PATCH /api/help-requests/:requestId/resolve
 * @access  Private
 */
const resolveHelpRequest = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { requestId } = req.params;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid help request ID",
      });
    }

    const helpRequest = await HelpRequest.findById(
      requestId
    );

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    if (
      helpRequest.creator.toString() !==
      userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the request owner can resolve it",
      });
    }

    if (
      ["resolved", "cancelled", "expired"].includes(
        helpRequest.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "This request is already closed",
      });
    }

    helpRequest.status = "resolved";
    helpRequest.resolvedAt = new Date();

    if (helpRequest.acceptedHelper) {
      const acceptedHelper =
        helpRequest.helpers.find(
          (helper) =>
            helper.user.toString() ===
            helpRequest.acceptedHelper.toString()
        );

      if (acceptedHelper) {
        acceptedHelper.status = "completed";
      }
    }

    await helpRequest.save();

    return res.status(200).json({
      success: true,
      message: "Help request marked as resolved",
      status: helpRequest.status,
      resolvedAt: helpRequest.resolvedAt,
    });
  } catch (error) {
    console.error(
      "Resolve help request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to resolve help request",
    });
  }
};

/**
 * @desc    Cancel owner's request
 * @route   PATCH /api/help-requests/:requestId/cancel
 * @access  Private
 */
const cancelHelpRequest = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { requestId } = req.params;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid help request ID",
      });
    }

    const helpRequest = await HelpRequest.findById(
      requestId
    );

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    if (
      helpRequest.creator.toString() !==
      userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the request owner can cancel it",
      });
    }

    if (
      ["resolved", "cancelled", "expired"].includes(
        helpRequest.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "This request is already closed",
      });
    }

    helpRequest.status = "cancelled";

    helpRequest.helpers.forEach((helper) => {
      if (helper.status === "accepted") {
        helper.status = "declined";
      }
    });

    helpRequest.acceptedHelper = null;

    await helpRequest.save();

    return res.status(200).json({
      success: true,
      message: "Help request cancelled",
      status: helpRequest.status,
    });
  } catch (error) {
    console.error(
      "Cancel help request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to cancel help request",
    });
  }
};

/**
 * @desc    Report a help request
 * @route   POST /api/help-requests/:requestId/report
 * @access  Private
 */
const reportHelpRequest = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { requestId } = req.params;
    const { reason = "other" } = req.body;

    const allowedReasons = [
      "spam",
      "fake",
      "unsafe",
      "inappropriate",
      "misleading",
      "other",
    ];

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid help request ID",
      });
    }

    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report reason",
      });
    }

    const helpRequest = await HelpRequest.findById(
      requestId
    );

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    if (
      helpRequest.creator.toString() ===
      userId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot report your own help request",
      });
    }

    const alreadyReported =
      helpRequest.reports.some(
        (report) =>
          report.user.toString() ===
          userId.toString()
      );

    if (alreadyReported) {
      return res.status(409).json({
        success: false,
        message:
          "You have already reported this request",
      });
    }

    helpRequest.reports.push({
      user: userId,
      reason,
    });

    await helpRequest.save();

    return res.status(201).json({
      success: true,
      message: "Help request reported",
    });
  } catch (error) {
    console.error(
      "Report help request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to report help request",
    });
  }
};

/**
 * @desc    Permanently delete owner's request
 * @route   DELETE /api/help-requests/:requestId
 * @access  Private
 */
const deleteHelpRequest = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { requestId } = req.params;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid help request ID",
      });
    }

    const helpRequest = await HelpRequest.findById(
      requestId
    );

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    if (
      helpRequest.creator.toString() !==
      userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can delete only your own help request",
      });
    }

    await helpRequest.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Help request deleted successfully",
      requestId,
    });
  } catch (error) {
    console.error(
      "Delete help request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to delete help request",
    });
  }
};

module.exports = {
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
};
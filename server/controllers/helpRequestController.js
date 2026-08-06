const mongoose = require("mongoose");
const HelpRequest = require("../models/HelpRequest");
const User = require("../models/User");
const Notification = require("../models/Notification");

const CATEGORIES = [
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

const URGENCIES = [
  "low",
  "medium",
  "high",
  "critical",
];

const STATUSES = [
  "open",
  "in-progress",
  "resolved",
  "expired",
  "cancelled",
];

const ACTIVE_STATUSES = [
  "open",
  "in-progress",
];

const CLOSED_STATUSES = [
  "resolved",
  "expired",
  "cancelled",
];

const getUserId = (req) => {
  return req.user?._id || req.user?.id || null;
};

const isValidId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const normalizeText = (value) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const normalizePhone = (value) => {
  return typeof value === "string"
    ? value
        .replace(/[^\d+\-\s()]/g, "")
        .trim()
    : "";
};

const idString = (value) => {
  return (
    value?._id?.toString?.() ||
    value?.toString?.() ||
    ""
  );
};

const parseCoordinates = (
  latitude,
  longitude
) => {
  const lat =
    latitude === "" ||
    latitude === null ||
    latitude === undefined
      ? null
      : Number(latitude);

  const lng =
    longitude === "" ||
    longitude === null ||
    longitude === undefined
      ? null
      : Number(longitude);

  if (lat === null && lng === null) {
    return {
      latitude: null,
      longitude: null,
      hasCoordinates: false,
    };
  }

  if (
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return {
      error:
        "Valid latitude and longitude are required",
    };
  }

  return {
    latitude: lat,
    longitude: lng,
    hasCoordinates: true,
  };
};

const privateSelect =
  "+contactPhone " +
  "+location.exactAddress " +
  "+location.coordinates.latitude " +
  "+location.coordinates.longitude";

const populateRequest = async (
  helpRequest
) => {
  await helpRequest.populate([
    {
      path: "creator",
      select:
        "username name profilePic",
    },
    {
      path: "helpers.user",
      select:
        "username name profilePic",
    },
    {
      path: "acceptedHelper",
      select:
        "username name profilePic",
    },
  ]);

  return helpRequest;
};

const sanitizeRequest = (
  source,
  currentUserId
) => {
  const request =
    typeof source?.toObject ===
    "function"
      ? source.toObject()
      : { ...source };

  const currentId =
    currentUserId?.toString?.() || "";

  const creatorId = idString(
    request.creator
  );

  const acceptedHelperId = idString(
    request.acceptedHelper
  );

  const isOwner =
    currentId === creatorId;

  const isAcceptedHelper =
    currentId === acceptedHelperId;

  const canViewPrivateDetails =
    isOwner || isAcceptedHelper;

  if (!canViewPrivateDetails) {
    delete request.contactPhone;

    if (request.location) {
      delete request.location
        .exactAddress;

      delete request.location
        .coordinates;

      delete request.location.geo;
    }
  }

  let googleMapsUrl = "";

  if (
    canViewPrivateDetails &&
    request.location?.coordinates
  ) {
    const {
      latitude,
      longitude,
    } =
      request.location.coordinates;

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      googleMapsUrl =
        "https://www.google.com/maps/dir/" +
        "?api=1&destination=" +
        `${latitude},${longitude}`;
    }
  }

  return {
    ...request,
    isOwner,
    isAcceptedHelper,
    canViewPrivateDetails,
    googleMapsUrl,
    helperCount:
      Array.isArray(request.helpers)
        ? request.helpers.length
        : 0,
  };
};

const expireRequests = async () => {
  const now = new Date();

  await HelpRequest.updateMany(
    {
      isDeleted: false,
      status: {
        $in: ACTIVE_STATUSES,
      },
      expiresAt: {
        $lte: now,
      },
    },
    {
      $set: {
        status: "expired",
        expiredAt: now,
      },
    }
  );
};

const createNotification = async (
  payload
) => {
  try {
    return await Notification.create(
      payload
    );
  } catch (error) {
    if (error?.code !== 11000) {
      console.error(
        "Notification error:",
        error
      );
    }

    return null;
  }
};

const notifyNearbyUsers = async ({
  creatorId,
  request,
  latitude,
  longitude,
}) => {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return 0;
  }

  const freshSince = new Date(
    Date.now() -
      24 * 60 * 60 * 1000
  );

  let users = [];

  try {
    users = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [
              longitude,
              latitude,
            ],
          },

          key:
            "nearbyHelpLocation",

          distanceField:
            "distanceMeters",

          spherical: true,
          maxDistance: 3000,

          query: {
            _id: {
              $ne:
                new mongoose.Types.ObjectId(
                  creatorId
                ),
            },

            nearbyHelpNotifications:
              true,

            nearbyHelpLocationUpdatedAt:
              {
                $gte: freshSince,
              },
          },
        },
      },

      {
        $match: {
          $expr: {
            $lte: [
              "$distanceMeters",

              {
                $multiply: [
                  {
                    $ifNull: [
                      "$nearbyHelpRadiusKm",
                      3,
                    ],
                  },

                  1000,
                ],
              },
            ],
          },
        },
      },

      {
        $project: {
          _id: 1,
          distanceMeters: 1,
          blockedUsers: 1,
        },
      },

      {
        $limit: 200,
      },
    ]);
  } catch (error) {
    console.error(
      "Nearby search error:",
      error
    );

    return 0;
  }

  const notifications = users
    .filter((user) => {
      const blocked =
        Array.isArray(
          user.blockedUsers
        )
          ? user.blockedUsers.map(
              String
            )
          : [];

      return !blocked.includes(
        creatorId.toString()
      );
    })
    .map((user) => {
      const distanceKm = Number(
        (
          user.distanceMeters /
          1000
        ).toFixed(1)
      );

      return {
        sender: creatorId,
        receiver: user._id,
        helpRequest: request._id,
        type: "nearby_help",

        title:
          "Someone nearby needs help",

        message:
          `${request.title} was posted ` +
          `within ${distanceKm} km of you.`,

        actionPath:
          `/help/${request._id}`,

        helpPreview: {
          category:
            request.category,

          urgency:
            request.urgency,

          city:
            request.location
              ?.city || "",

          area:
            request.location
              ?.area || "",

          distanceKm,
        },
      };
    });

  if (!notifications.length) {
    return 0;
  }

  try {
    const result =
      await Notification.insertMany(
        notifications,
        {
          ordered: false,
        }
      );

    return result.length;
  } catch (error) {
    if (error?.code !== 11000) {
      console.error(
        "Nearby notifications error:",
        error
      );
    }

    return (
      error?.insertedDocs?.length ||
      0
    );
  }
};

const updateNearbyHelpLocation =
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const parsed =
        parseCoordinates(
          req.body.latitude,
          req.body.longitude
        );

      if (
        parsed.error ||
        !parsed.hasCoordinates
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              parsed.error ||
              "Location is required",
          });
      }

      const radiusKm =
        [2, 3].includes(
          Number(
            req.body.radiusKm
          )
        )
          ? Number(
              req.body.radiusKm
            )
          : 3;

      const enabled =
        req.body
          .notificationsEnabled ===
        undefined
          ? true
          : Boolean(
              req.body
                .notificationsEnabled
            );

      const updatedAt =
        new Date();

      await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            nearbyHelpLocation: {
              type: "Point",

              coordinates: [
                parsed.longitude,
                parsed.latitude,
              ],
            },

            nearbyHelpLocationUpdatedAt:
              updatedAt,

            nearbyHelpNotifications:
              enabled,

            nearbyHelpRadiusKm:
              radiusKm,
          },
        }
      );

      return res.json({
        success: true,
        message:
          "Nearby Help location updated",
        nearbyHelp: {
          radiusKm,
          notificationsEnabled:
            enabled,
          updatedAt,
        },
      });
    } catch (error) {
      console.error(
        "Update location error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to update location",
        });
    }
  };

const createHelpRequest =
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const title =
        normalizeText(
          req.body.title
        );

      const description =
        normalizeText(
          req.body.description
        );

      if (title.length < 3) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Title must contain at least 3 characters",
          });
      }

      if (
        description.length < 5
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Description must contain at least 5 characters",
          });
      }

      const category =
        req.body.category ||
        "other";

      const urgency =
        req.body.urgency ||
        "medium";

      if (
        !CATEGORIES.includes(
          category
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid category",
          });
      }

      if (
        !URGENCIES.includes(
          urgency
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid urgency",
          });
      }

      const contactPreference =
        req.body
          .contactPreference ||
        "chat";

      const contactPhone =
        normalizePhone(
          req.body.contactPhone
        );

      if (
        ["phone", "both"].includes(
          contactPreference
        ) &&
        !contactPhone
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Phone number is required",
          });
      }

      const parsed =
        parseCoordinates(
          req.body.latitude,
          req.body.longitude
        );

      if (parsed.error) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              parsed.error,
          });
      }

      const days = Math.min(
        Math.max(
          Number(
            req.body
              .expiresInDays
          ) || 7,
          1
        ),
        30
      );

      const location = {
        city:
          normalizeText(
            req.body.city
          ),

        area:
          normalizeText(
            req.body.area
          ),

        exactAddress:
          normalizeText(
            req.body
              .exactAddress
          ) ||
          normalizeText(
            req.body
              .locationName
          ),

        coordinates: {
          latitude:
            parsed.latitude,

          longitude:
            parsed.longitude,
        },
      };

      if (
        parsed.hasCoordinates
      ) {
        location.geo = {
          type: "Point",

          coordinates: [
            parsed.longitude,
            parsed.latitude,
          ],
        };
      }

      const helpRequest =
        await HelpRequest.create(
          {
            creator: userId,
            title,
            description,
            category,
            urgency,
            location,
            contactPreference,
            contactPhone,
            image:
              normalizeText(
                req.body.image
              ),

            expiresAt:
              new Date(
                Date.now() +
                  days *
                    24 *
                    60 *
                    60 *
                    1000
              ),
          }
        );

      if (
        parsed.hasCoordinates
      ) {
        await User.findByIdAndUpdate(
          userId,
          {
            $set: {
              nearbyHelpLocation: {
                type: "Point",

                coordinates: [
                  parsed.longitude,
                  parsed.latitude,
                ],
              },

              nearbyHelpLocationUpdatedAt:
                new Date(),
            },
          }
        );
      }

      await populateRequest(
        helpRequest
      );

      const count =
        await notifyNearbyUsers({
          creatorId: userId,
          request: helpRequest,
          latitude:
            parsed.latitude,
          longitude:
            parsed.longitude,
        });

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Help request created successfully",
          nearbyNotificationsSent:
            count,
          helpRequest:
            sanitizeRequest(
              helpRequest,
              userId
            ),
        });
    } catch (error) {
      console.error(
        "Create help request error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to create help request",
        });
    }
  };

const getHelpRequests =
  async (req, res) => {
    try {
      await expireRequests();

      const userId =
        getUserId(req);

      const page = Math.max(
        Number(req.query.page) ||
          1,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(
            req.query.limit
          ) || 10,
          1
        ),
        30
      );

      const filter = {
        isDeleted: false,
      };

      const status =
        req.query.status;

      if (
        !status ||
        status === "active"
      ) {
        filter.status = {
          $in: ACTIVE_STATUSES,
        };
      } else if (
        status !== "all"
      ) {
        if (
          !STATUSES.includes(
            status
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Invalid status",
            });
        }

        filter.status =
          status;
      }

      if (
        req.query.category &&
        req.query.category !==
          "all"
      ) {
        filter.category =
          req.query.category;
      }

      if (
        req.query.urgency &&
        req.query.urgency !==
          "all"
      ) {
        filter.urgency =
          req.query.urgency;
      }

      if (req.query.city) {
        filter[
          "location.city"
        ] = {
          $regex:
            normalizeText(
              req.query.city
            ),
          $options: "i",
        };
      }

      if (req.query.search) {
        const search =
          normalizeText(
            req.query.search
          ).replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        filter.$or = [
          {
            title: {
              $regex: search,
              $options: "i",
            },
          },
          {
            description: {
              $regex: search,
              $options: "i",
            },
          },
          {
            "location.city": {
              $regex: search,
              $options: "i",
            },
          },
          {
            "location.area": {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }

      const skip =
        (page - 1) * limit;

      const sort =
        req.query.sort ===
        "oldest"
          ? {
              createdAt: 1,
            }
          : req.query.sort ===
              "expiring"
            ? {
                expiresAt: 1,
                createdAt: -1,
              }
            : {
                createdAt: -1,
              };

      const [
        requests,
        total,
      ] = await Promise.all([
        HelpRequest.find(
          filter
        )
          .populate(
            "creator",
            "username name profilePic"
          )
          .populate(
            "acceptedHelper",
            "username name profilePic"
          )
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),

        HelpRequest.countDocuments(
          filter
        ),
      ]);

      return res.json({
        success: true,

        helpRequests:
          requests.map(
            (request) =>
              sanitizeRequest(
                request,
                userId
              )
          ),

        pagination: {
          currentPage: page,

          totalPages:
            Math.ceil(
              total / limit
            ),

          totalItems: total,

          hasNextPage:
            page * limit <
            total,

          hasPreviousPage:
            page > 1,
        },
      });
    } catch (error) {
      console.error(
        "Get requests error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to load requests",
        });
    }
  };

const getHelpRequestById =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      if (
        !isValidId(
          req.params.requestId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid request ID",
          });
      }

      const helpRequest =
        await HelpRequest.findById(
          req.params.requestId
        ).select(privateSelect);

      if (
        !helpRequest ||
        helpRequest.isDeleted
      ) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Help request not found",
          });
      }

      helpRequest.syncExpiryStatus();

      if (
        idString(
          helpRequest.creator
        ) !== userId.toString()
      ) {
        helpRequest.views += 1;
      }

      await helpRequest.save();
      await populateRequest(
        helpRequest
      );

      return res.json({
        success: true,
        helpRequest:
          sanitizeRequest(
            helpRequest,
            userId
          ),
      });
    } catch (error) {
      console.error(
        "Get request error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to load request",
        });
    }
  };

const getMyHelpRequests =
  async (req, res) => {
    try {
      await expireRequests();

      const userId =
        getUserId(req);

      const page = Math.max(
        Number(req.query.page) ||
          1,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(
            req.query.limit
          ) || 10,
          1
        ),
        30
      );

      const filter = {
        creator: userId,
        isDeleted: false,
      };

      if (
        req.query.status &&
        req.query.status !==
          "all"
      ) {
        filter.status =
          req.query.status;
      }

      const [
        requests,
        total,
      ] = await Promise.all([
        HelpRequest.find(
          filter
        )
          .select(
            privateSelect
          )
          .populate(
            "creator",
            "username name profilePic"
          )
          .populate(
            "acceptedHelper",
            "username name profilePic"
          )
          .sort({
            createdAt: -1,
          })
          .skip(
            (page - 1) *
              limit
          )
          .limit(limit),

        HelpRequest.countDocuments(
          filter
        ),
      ]);

      return res.json({
        success: true,
        helpRequests:
          requests.map(
            (request) =>
              sanitizeRequest(
                request,
                userId
              )
          ),
        pagination: {
          currentPage: page,
          totalPages:
            Math.ceil(
              total / limit
            ),
          totalItems: total,
        },
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to load your requests",
        });
    }
  };

const getMyHelpHistory =
  async (req, res) => {
    try {
      await expireRequests();

      const userId =
        getUserId(req);

      const [
        requested,
        provided,
      ] = await Promise.all([
        HelpRequest.find({
          creator: userId,
          isDeleted: false,
          status: {
            $in:
              CLOSED_STATUSES,
          },
        })
          .populate(
            "creator",
            "username name profilePic"
          )
          .populate(
            "acceptedHelper",
            "username name profilePic"
          )
          .sort({
            updatedAt: -1,
          })
          .lean(),

        HelpRequest.find({
          acceptedHelper:
            userId,
          isDeleted: false,
          status: {
            $in: [
              "in-progress",
              ...CLOSED_STATUSES,
            ],
          },
        })
          .populate(
            "creator",
            "username name profilePic"
          )
          .populate(
            "acceptedHelper",
            "username name profilePic"
          )
          .sort({
            updatedAt: -1,
          })
          .lean(),
      ]);

      return res.json({
        success: true,

        stats: {
          requestedTotal:
            requested.length,

          providedTotal:
            provided.length,

          activeProvided:
            provided.filter(
              (item) =>
                item.status ===
                "in-progress"
            ).length,

          completedProvided:
            provided.filter(
              (item) =>
                item.status ===
                "resolved"
            ).length,
        },

        requested:
          requested.map(
            (request) =>
              sanitizeRequest(
                request,
                userId
              )
          ),

        provided:
          provided.map(
            (request) =>
              sanitizeRequest(
                request,
                userId
              )
          ),
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to load history",
        });
    }
  };

const getCommunityImpact =
  async (_req, res) => {
    try {
      await expireRequests();

      const [
        completedRequests,
        helperIds,
        categoryBreakdown,
        recentActivity,
      ] = await Promise.all([
        HelpRequest.countDocuments(
          {
            isDeleted: false,
            status: "resolved",
          }
        ),

        HelpRequest.distinct(
          "acceptedHelper",
          {
            isDeleted: false,
            status: "resolved",
            acceptedHelper: {
              $ne: null,
            },
          }
        ),

        HelpRequest.aggregate([
          {
            $match: {
              isDeleted: false,
              status:
                "resolved",
            },
          },

          {
            $group: {
              _id:
                "$category",
              count: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              count: -1,
            },
          },
        ]),

        HelpRequest.find({
          isDeleted: false,
          status: "resolved",
        })
          .select(
            "title category location.city resolvedAt acceptedHelper"
          )
          .populate(
            "acceptedHelper",
            "username name profilePic"
          )
          .sort({
            resolvedAt: -1,
          })
          .limit(20)
          .lean(),
      ]);

      return res.json({
        success: true,

        stats: {
          completedRequests,

          peopleHelped:
            completedRequests,

          communityHelpers:
            helperIds.filter(
              Boolean
            ).length,
        },

        categoryBreakdown:
          categoryBreakdown.map(
            (item) => ({
              category:
                item._id,
              count:
                item.count,
            })
          ),

        recentActivity,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to load community impact",
        });
    }
  };

const updateHelpRequest =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const helpRequest =
        await HelpRequest.findById(
          req.params.requestId
        ).select(privateSelect);

      if (
        !helpRequest ||
        helpRequest.isDeleted
      ) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Help request not found",
          });
      }

      if (
        idString(
          helpRequest.creator
        ) !== userId.toString()
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Only owner can update",
          });
      }

      if (
        CLOSED_STATUSES.includes(
          helpRequest.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Closed request cannot be edited",
          });
      }

      const textFields = [
        "title",
        "description",
        "image",
      ];

      textFields.forEach(
        (field) => {
          if (
            req.body[field] !==
            undefined
          ) {
            helpRequest[field] =
              normalizeText(
                req.body[field]
              );
          }
        }
      );

      if (
        req.body.city !==
        undefined
      ) {
        helpRequest.location.city =
          normalizeText(
            req.body.city
          );
      }

      if (
        req.body.area !==
        undefined
      ) {
        helpRequest.location.area =
          normalizeText(
            req.body.area
          );
      }

      if (
        req.body
          .exactAddress !==
          undefined ||
        req.body
          .locationName !==
          undefined
      ) {
        helpRequest.location.exactAddress =
          normalizeText(
            req.body
              .exactAddress
          ) ||
          normalizeText(
            req.body
              .locationName
          );
      }

      if (
        req.body.category !==
        undefined
      ) {
        helpRequest.category =
          req.body.category;
      }

      if (
        req.body.urgency !==
        undefined
      ) {
        helpRequest.urgency =
          req.body.urgency;
      }

      if (
        req.body
          .contactPreference !==
        undefined
      ) {
        helpRequest.contactPreference =
          req.body
            .contactPreference;
      }

      if (
        req.body
          .contactPhone !==
        undefined
      ) {
        helpRequest.contactPhone =
          normalizePhone(
            req.body
              .contactPhone
          );
      }

      const parsed =
        parseCoordinates(
          req.body.latitude,
          req.body.longitude
        );

      if (parsed.error) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              parsed.error,
          });
      }

      if (
        parsed.hasCoordinates
      ) {
        helpRequest.location.coordinates.latitude =
          parsed.latitude;

        helpRequest.location.coordinates.longitude =
          parsed.longitude;

        helpRequest.location.geo = {
          type: "Point",

          coordinates: [
            parsed.longitude,
            parsed.latitude,
          ],
        };
      }

      await helpRequest.save();
      await populateRequest(
        helpRequest
      );

      return res.json({
        success: true,
        message:
          "Help request updated",
        helpRequest:
          sanitizeRequest(
            helpRequest,
            userId
          ),
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to update request",
        });
    }
  };

const offerHelp =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const helpRequest =
        await HelpRequest.findById(
          req.params.requestId
        ).select(privateSelect);

      if (
        !helpRequest ||
        helpRequest.isDeleted
      ) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Help request not found",
          });
      }

      helpRequest.syncExpiryStatus();

      if (
        idString(
          helpRequest.creator
        ) === userId.toString()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "You cannot help your own request",
          });
      }

      if (
        helpRequest.status !==
        "open"
      ) {
        await helpRequest.save();

        return res
          .status(400)
          .json({
            success: false,
            message:
              "Request is not accepting offers",
          });
      }

      const exists =
        helpRequest.helpers.some(
          (helper) =>
            idString(
              helper.user
            ) ===
            userId.toString()
        );

      if (exists) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "You already offered help",
          });
      }

      helpRequest.helpers.push({
        user: userId,
        message:
          normalizeText(
            req.body.message
          ),
      });

      await helpRequest.save();

      await createNotification({
        sender: userId,
        receiver:
          helpRequest.creator,
        helpRequest:
          helpRequest._id,
        type: "help_offer",
        title:
          "New help offer",
        message:
          "Someone offered to help with your request.",
        actionPath:
          `/help/${helpRequest._id}`,
      });

      await populateRequest(
        helpRequest
      );

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Help offer sent",
          helpRequest:
            sanitizeRequest(
              helpRequest,
              userId
            ),
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to send offer",
        });
    }
  };

const withdrawHelpOffer =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const helpRequest =
        await HelpRequest.findById(
          req.params.requestId
        ).select(privateSelect);

      if (!helpRequest) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Request not found",
          });
      }

      const helper =
        helpRequest.helpers.find(
          (item) =>
            idString(
              item.user
            ) ===
            userId.toString()
        );

      if (!helper) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Offer not found",
          });
      }

      if (
        helper.status ===
          "accepted" ||
        idString(
          helpRequest
            .acceptedHelper
        ) === userId.toString()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Accepted offer cannot be withdrawn",
          });
      }

      helpRequest.helpers =
        helpRequest.helpers.filter(
          (item) =>
            idString(
              item.user
            ) !==
            userId.toString()
        );

      await helpRequest.save();
      await populateRequest(
        helpRequest
      );

      return res.json({
        success: true,
        message:
          "Offer withdrawn",
        helpRequest:
          sanitizeRequest(
            helpRequest,
            userId
          ),
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to withdraw offer",
        });
    }
  };

const acceptHelper =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const {
        requestId,
        helperId,
      } = req.params;

      const helpRequest =
        await HelpRequest.findById(
          requestId
        ).select(privateSelect);

      if (!helpRequest) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Request not found",
          });
      }

      if (
        idString(
          helpRequest.creator
        ) !== userId.toString()
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Only owner can accept a helper",
          });
      }

      if (
        helpRequest.status !==
        "open"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Request already has a helper",
          });
      }

      const selected =
        helpRequest.helpers.find(
          (helper) =>
            idString(
              helper.user
            ) === helperId
        );

      if (!selected) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Help offer not found",
          });
      }

      const now =
        new Date();

      helpRequest.helpers.forEach(
        (helper) => {
          const isSelected =
            idString(
              helper.user
            ) === helperId;

          helper.status =
            isSelected
              ? "accepted"
              : "declined";

          if (isSelected) {
            helper.acceptedAt =
              now;
          } else {
            helper.declinedAt =
              now;
          }
        }
      );

      helpRequest.acceptedHelper =
        helperId;

      helpRequest.acceptedAt =
        now;

      helpRequest.status =
        "in-progress";

      await helpRequest.save();

      await createNotification({
        sender: userId,
        receiver: helperId,
        helpRequest:
          helpRequest._id,
        type:
          "help_offer_accepted",
        title:
          "Your offer was accepted",
        message:
          "Contact and Google Maps details are now unlocked.",
        actionPath:
          `/help/${helpRequest._id}`,
      });

      await populateRequest(
        helpRequest
      );

      return res.json({
        success: true,
        message:
          "Helper accepted",
        helpRequest:
          sanitizeRequest(
            helpRequest,
            userId
          ),
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to accept helper",
        });
    }
  };

const resolveHelpRequest =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const helpRequest =
        await HelpRequest.findById(
          req.params.requestId
        ).select(privateSelect);

      if (!helpRequest) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Request not found",
          });
      }

      if (
        idString(
          helpRequest.creator
        ) !== userId.toString()
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Only owner can resolve",
          });
      }

      if (
        CLOSED_STATUSES.includes(
          helpRequest.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Request already closed",
          });
      }

      const now =
        new Date();

      helpRequest.status =
        "resolved";

      helpRequest.resolvedAt =
        now;

      helpRequest.resolvedBy =
        userId;

      helpRequest.helpers.forEach(
        (helper) => {
          if (
            idString(
              helper.user
            ) ===
            idString(
              helpRequest
                .acceptedHelper
            )
          ) {
            helper.status =
              "completed";

            helper.completedAt =
              now;
          }
        }
      );

      await helpRequest.save();

      if (
        helpRequest
          .acceptedHelper
      ) {
        await createNotification({
          sender: userId,
          receiver:
            helpRequest
              .acceptedHelper,
          helpRequest:
            helpRequest._id,
          type:
            "help_resolved",
          title:
            "Help completed",
          message:
            "The requester marked this request as resolved.",
          actionPath:
            `/help/${helpRequest._id}`,
        });
      }

      await populateRequest(
        helpRequest
      );

      return res.json({
        success: true,
        message:
          "Request resolved",
        helpRequest:
          sanitizeRequest(
            helpRequest,
            userId
          ),
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to resolve request",
        });
    }
  };

const cancelHelpRequest =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const helpRequest =
        await HelpRequest.findById(
          req.params.requestId
        ).select(privateSelect);

      if (!helpRequest) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Request not found",
          });
      }

      if (
        idString(
          helpRequest.creator
        ) !== userId.toString()
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Only owner can cancel",
          });
      }

      helpRequest.status =
        "cancelled";

      helpRequest.cancelledAt =
        new Date();

      helpRequest.helpers.forEach(
        (helper) => {
          if (
            helper.status ===
            "accepted"
          ) {
            helper.status =
              "cancelled";
          }
        }
      );

      await helpRequest.save();
      await populateRequest(
        helpRequest
      );

      return res.json({
        success: true,
        message:
          "Request cancelled",
        helpRequest:
          sanitizeRequest(
            helpRequest,
            userId
          ),
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to cancel request",
        });
    }
  };

const reportHelpRequest =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const helpRequest =
        await HelpRequest.findById(
          req.params.requestId
        );

      if (!helpRequest) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Request not found",
          });
      }

      const exists =
        helpRequest.reports.some(
          (report) =>
            idString(
              report.user
            ) ===
            userId.toString()
        );

      if (exists) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Already reported",
          });
      }

      helpRequest.reports.push({
        user: userId,
        reason:
          req.body.reason ||
          "other",
      });

      await helpRequest.save();

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Request reported",
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to report request",
        });
    }
  };

const deleteHelpRequest =
  async (req, res) => {
    try {
      const userId =
        getUserId(req);

      const helpRequest =
        await HelpRequest.findById(
          req.params.requestId
        );

      if (!helpRequest) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Request not found",
          });
      }

      if (
        idString(
          helpRequest.creator
        ) !== userId.toString()
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Only owner can delete",
          });
      }

      helpRequest.isDeleted =
        true;

      helpRequest.deletedAt =
        new Date();

      helpRequest.deletedBy =
        userId;

      await helpRequest.save();

      await Notification.updateMany(
        {
          helpRequest:
            helpRequest._id,
        },
        {
          $set: {
            isDeleted: true,
            deletedAt:
              new Date(),
          },
        }
      );

      return res.json({
        success: true,
        message:
          "Request deleted",
        requestId:
          helpRequest._id,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to delete request",
        });
    }
  };

module.exports = {
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
};

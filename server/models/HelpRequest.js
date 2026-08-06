const mongoose = require("mongoose");

const helpRequestSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1000,
    },

    category: {
      type: String,
      enum: [
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
      ],
      default: "other",
      index: true,
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },

    location: {
      city: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      area: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "",
      },

      coordinates: {
        latitude: {
          type: Number,
          min: -90,
          max: 90,
          default: null,
        },

        longitude: {
          type: Number,
          min: -180,
          max: 180,
          default: null,
        },
      },
    },

    contactPreference: {
      type: String,
      enum: ["chat", "phone", "both"],
      default: "chat",
    },

    contactPhone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
      select: false,
    },

    image: {
      type: String,
      default: "",
    },

    helpers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        message: {
          type: String,
          trim: true,
          maxlength: 300,
          default: "",
        },

        status: {
          type: String,
          enum: ["offered", "accepted", "declined", "completed"],
          default: "offered",
        },

        offeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    acceptedHelper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "expired", "cancelled"],
      default: "open",
      index: true,
    },

    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      },
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        reason: {
          type: String,
          enum: [
            "spam",
            "fake",
            "unsafe",
            "inappropriate",
            "misleading",
            "other",
          ],
          default: "other",
        },

        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevent the same user from offering help more than once.
helpRequestSchema.path("helpers").validate(function (helpers) {
  const userIds = helpers.map((helper) => helper.user.toString());
  return userIds.length === new Set(userIds).size;
}, "A user can offer help only once");

// Automatically identify expired requests when reading the document.
helpRequestSchema.methods.syncExpiryStatus = function () {
  if (
    this.status === "open" &&
    this.expiresAt &&
    this.expiresAt.getTime() <= Date.now()
  ) {
    this.status = "expired";
  }

  return this;
};

helpRequestSchema.index({
  creator: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  status: 1,
  urgency: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  category: 1,
  status: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  "location.city": 1,
  status: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  expiresAt: 1,
  status: 1,
});

helpRequestSchema.index({
  title: "text",
  description: "text",
  "location.city": "text",
  "location.area": "text",
});

module.exports = mongoose.model(
  "HelpRequest",
  helpRequestSchema
);
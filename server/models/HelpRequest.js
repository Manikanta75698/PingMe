const mongoose = require("mongoose");

const helperSchema = new mongoose.Schema(
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
      enum: [
        "offered",
        "accepted",
        "declined",
        "completed",
        "cancelled",
      ],
      default: "offered",
    },

    offeredAt: {
      type: Date,
      default: Date.now,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    declinedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: true,
  }
);

const reportSchema = new mongoose.Schema(
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
  {
    _id: true,
  }
);

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

      exactAddress: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
        select: false,
      },

      coordinates: {
        latitude: {
          type: Number,
          min: -90,
          max: 90,
          default: null,
          select: false,
        },

        longitude: {
          type: Number,
          min: -180,
          max: 180,
          default: null,
          select: false,
        },
      },

      geo: {
        type: {
          type: String,
          enum: ["Point"],
          default: undefined,
        },

        coordinates: {
          type: [Number],
          default: undefined,
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

    helpers: {
      type: [helperSchema],
      default: [],
    },

    acceptedHelper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "open",
        "in-progress",
        "resolved",
        "expired",
        "cancelled",
      ],
      default: "open",
      index: true,
    },

    expiresAt: {
      type: Date,
      default() {
        return new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        );
      },
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    reports: {
      type: [reportSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

helpRequestSchema.path("helpers").validate(
  function (helpers) {
    const userIds = helpers.map((helper) =>
      helper.user.toString()
    );

    return userIds.length === new Set(userIds).size;
  },
  "A user can offer help only once"
);

helpRequestSchema.methods.syncExpiryStatus =
  function () {
    const canExpire = ["open", "in-progress"].includes(
      this.status
    );

    const hasExpired =
      this.expiresAt &&
      this.expiresAt.getTime() <= Date.now();

    if (canExpire && hasExpired) {
      this.status = "expired";

      if (!this.expiredAt) {
        this.expiredAt = new Date();
      }
    }

    return this;
  };

helpRequestSchema.index({
  creator: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  acceptedHelper: 1,
  status: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  "helpers.user": 1,
  status: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  status: 1,
  isDeleted: 1,
  urgency: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  category: 1,
  status: 1,
  isDeleted: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  "location.city": 1,
  status: 1,
  isDeleted: 1,
  createdAt: -1,
});

helpRequestSchema.index({
  expiresAt: 1,
  status: 1,
  isDeleted: 1,
});

helpRequestSchema.index({
  "location.geo": "2dsphere",
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

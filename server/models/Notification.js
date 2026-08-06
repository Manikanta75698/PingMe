const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
      index: true,
    },

    followRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FollowRequest",
      default: null,
      index: true,
    },

    helpRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HelpRequest",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "follow",
        "follow_request",
        "nearby_help",
        "help_offer",
        "help_offer_accepted",
        "help_offer_declined",
        "help_resolved",
        "help_cancelled",
        "help_expired",
      ],
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    message: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    actionPath: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    helpPreview: {
      category: {
        type: String,
        trim: true,
        maxlength: 50,
        default: "",
      },

      urgency: {
        type: String,
        enum: ["", "low", "medium", "high", "critical"],
        default: "",
      },

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

      distanceKm: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
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
  },
  {
    timestamps: true,
  }
);

notificationSchema.methods.markAsRead = function () {
  this.isRead = true;

  if (!this.readAt) {
    this.readAt = new Date();
  }

  return this;
};

notificationSchema.methods.softDelete = function () {
  this.isDeleted = true;

  if (!this.deletedAt) {
    this.deletedAt = new Date();
  }

  return this;
};

notificationSchema.index({
  receiver: 1,
  isDeleted: 1,
  createdAt: -1,
});

notificationSchema.index({
  receiver: 1,
  isRead: 1,
  isDeleted: 1,
  createdAt: -1,
});

notificationSchema.index({
  receiver: 1,
  type: 1,
  isDeleted: 1,
  createdAt: -1,
});

notificationSchema.index({
  helpRequest: 1,
  receiver: 1,
  type: 1,
  createdAt: -1,
});

notificationSchema.index(
  {
    receiver: 1,
    followRequest: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      followRequest: {
        $type: "objectId",
      },

      type: "follow_request",
      isDeleted: false,
    },
  }
);

notificationSchema.index(
  {
    receiver: 1,
    helpRequest: 1,
    type: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      helpRequest: {
        $type: "objectId",
      },

      type: "nearby_help",
      isDeleted: false,
    },
  }
);

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);

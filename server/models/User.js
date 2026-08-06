const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, default: "" },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    profilePic: { type: String, default: "" },
    coverPhoto: { type: String, default: "" },
    bio: { type: String, default: "" },
    website: { type: String, default: "" },
    location: { type: String, default: "" },

    nearbyHelpLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: undefined,
      },
      coordinates: {
        type: [Number],
        default: undefined,
        validate: {
          validator(value) {
            if (!value) return true;

            return (
              Array.isArray(value) &&
              value.length === 2 &&
              Number.isFinite(value[0]) &&
              Number.isFinite(value[1]) &&
              value[0] >= -180 &&
              value[0] <= 180 &&
              value[1] >= -90 &&
              value[1] <= 90
            );
          },
          message:
            "Nearby Help coordinates must be [longitude, latitude]",
        },
      },
    },

    nearbyHelpLocationUpdatedAt: {
      type: Date,
      default: null,
    },

    nearbyHelpNotifications: {
      type: Boolean,
      default: true,
    },

    nearbyHelpRadiusKm: {
      type: Number,
      enum: [2, 3],
      default: 3,
    },

    currentIntent: {
      type: String,
      enum: ["", "chat", "gaming", "study", "music", "fun", "advice"],
      default: "",
    },

    intentUpdatedAt: {
      type: Date,
      default: null,
    },

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
      default: "",
      select: false,
    },

    otpExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    otpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetOtp: {
      type: String,
      default: "",
      select: false,
    },

    passwordResetOtpExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    passwordResetOtpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    passwordResetTokenHash: {
      type: String,
      default: "",
      select: false,
    },

    passwordResetTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    theme: {
      type: String,
      enum: ["system", "light", "dark"],
      default: "system",
    },

    privacySettings: {
      privateAccount: {
        type: Boolean,
        default: false,
      },

      showOnlineStatus: {
        type: Boolean,
        default: true,
      },

      showLastSeen: {
        type: Boolean,
        default: true,
      },

      readReceipts: {
        type: Boolean,
        default: true,
      },

      messagePermission: {
        type: String,
        enum: ["everyone", "followers", "following", "no-one"],
        default: "everyone",
      },
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ blockedUsers: 1 });
userSchema.index({ name: "text", username: "text" });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ nearbyHelpLocation: "2dsphere" });
userSchema.index({
  nearbyHelpNotifications: 1,
  nearbyHelpLocationUpdatedAt: -1,
});

module.exports = mongoose.model("User", userSchema);

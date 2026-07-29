const mongoose = require("mongoose");

const followRequestSchema =
  new mongoose.Schema(
    {
      sender: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      receiver: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "accepted",
          "declined",
        ],
        default: "pending",
        index: true,
      },

      respondedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * Same sender → receiver pair ki
 * duplicate request documents prevent.
 */
followRequestSchema.index(
  {
    sender: 1,
    receiver: 1,
  },
  {
    unique: true,
  }
);

/*
 * Received/sent pending request lists
 * fast ga load avvadaniki.
 */
followRequestSchema.index({
  receiver: 1,
  status: 1,
  createdAt: -1,
});

followRequestSchema.index({
  sender: 1,
  status: 1,
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "FollowRequest",
    followRequestSchema
  );
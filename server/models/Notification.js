const mongoose =
  require("mongoose");

const notificationSchema =
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

      post: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Post",

        default: null,

        index: true,
      },

      followRequest: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "FollowRequest",

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
        ],

        required: true,

        index: true,
      },

      isRead: {
        type: Boolean,

        default: false,

        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * Notification page and unread badge
 * fast ga load avvadaniki.
 */
notificationSchema.index({
  receiver: 1,
  createdAt: -1,
});

/*
 * Unread notification count fast ga
 * calculate cheyyadaniki.
 */
notificationSchema.index({
  receiver: 1,
  isRead: 1,
  createdAt: -1,
});

/*
 * Same follow request ki duplicate
 * notification documents prevent.
 *
 * partialFilterExpression valla
 * followRequest null unna like/comment/
 * follow notifications affect avvavu.
 */
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
    },
  }
);

module.exports =
  mongoose.model(
    "Notification",
    notificationSchema
  );
const mongoose = require(
  "mongoose"
);

const STORY_DURATION_MS =
  24 * 60 * 60 * 1000;

const storySchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      image: {
        type: String,

        required: [
          true,
          "Story image is required",
        ],

        trim: true,
      },

      viewers: {
        type: [
          {
            type:
              mongoose.Schema.Types
                .ObjectId,

            ref: "User",
          },
        ],

        default: [],
      },

      expiresAt: {
        type: Date,

        default: () =>
          new Date(
            Date.now() +
            STORY_DURATION_MS
          ),

        required: true,

        index: true,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    }
  );

/* =========================
   STORY ACTIVE STATUS
========================= */

storySchema.virtual(
  "isExpired"
).get(function getIsExpired() {
  return (
    this.expiresAt?.getTime?.() <=
    Date.now()
  );
});

/* =========================
   VIEWER COUNT
========================= */

storySchema.virtual(
  "viewersCount"
).get(function getViewersCount() {
  return Array.isArray(
    this.viewers
  )
    ? this.viewers.length
    : 0;
});

/* =========================
   INDEXES
========================= */

storySchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

/*
 * Faster user story queries:
 * newest story first.
 */
storySchema.index({
  user: 1,
  createdAt: -1,
});

/*
 * Faster active-story feed query.
 */
storySchema.index({
  expiresAt: 1,
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "Story",
    storySchema
  );
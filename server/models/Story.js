const mongoose = require(
  "mongoose"
);

const STORY_DURATION_MS =
  24 * 60 * 60 * 1000;

/* =========================
   VIEW SUBDOCUMENT
========================= */

const storyViewSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      viewedAt: {
        type: Date,

        default: Date.now,

        required: true,
      },
    },
    {
      _id: false,
      versionKey: false,
    }
  );

/* =========================
   STORY SCHEMA
========================= */

const storySchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
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


      views: {
        type: [
          storyViewSchema,
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
  if (!this.expiresAt) {
    return false;
  }

  const expiryTime =
    new Date(
      this.expiresAt
    ).getTime();

  if (
    Number.isNaN(
      expiryTime
    )
  ) {
    return false;
  }

  return (
    expiryTime <=
    Date.now()
  );
});

/* =========================
   VIEWERS COUNT
========================= */

storySchema.virtual(
  "viewersCount"
).get(function getViewersCount() {
  const viewerIds =
    new Set();

  if (
    Array.isArray(
      this.viewers
    )
  ) {
    this.viewers.forEach(
      (viewer) => {
        const viewerId =
          String(
            viewer?._id ||
            viewer ||
            ""
          ).trim();

        if (viewerId) {
          viewerIds.add(
            viewerId
          );
        }
      }
    );
  }

  if (
    Array.isArray(
      this.views
    )
  ) {
    this.views.forEach(
      (view) => {
        const viewerId =
          String(
            view?.user?._id ||
            view?.user ||
            ""
          ).trim();

        if (viewerId) {
          viewerIds.add(
            viewerId
          );
        }
      }
    );
  }

  return viewerIds.size;
});

/* =========================
   TTL INDEX
========================= */

storySchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,

    name:
      "story_expiry_ttl",
  }
);

/* =========================
   USER STORIES INDEX
========================= */

storySchema.index(
  {
    user: 1,
    createdAt: -1,
  },
  {
    name:
      "story_user_created_at",
  }
);

/* =========================
   ACTIVE STORIES INDEX
========================= */

storySchema.index(
  {
    expiresAt: 1,
    createdAt: -1,
  },
  {
    name:
      "story_expiry_created_at",
  }
);

/* =========================
   VIEWER LOOKUP INDEX
========================= */

storySchema.index(
  {
    _id: 1,
    "views.user": 1,
  },
  {
    name:
      "story_view_user",
  }
);

module.exports =
  mongoose.model(
    "Story",
    storySchema
  );
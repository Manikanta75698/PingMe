const mongoose = require(
  "mongoose"
);

const ALLOWED_REACTIONS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "👍",
  "🔥",
];

const reactionSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
      },

      emoji: {
        type: String,
        enum: ALLOWED_REACTIONS,
        required: true,
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
    }
  );

const messageSchema =
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

      text: {
        type: String,
        default: "",
        trim: true,
        maxlength: [
          5000,
          "Message cannot exceed 5000 characters",
        ],
      },

      image: {
        type: String,
        default: "",
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "sent",
          "delivered",
          "read",
        ],
        default: "sent",
        index: true,
      },

      replyTo: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Message",
        default: null,
      },

      reactions: {
        type: [reactionSchema],
        default: [],
      },

      /*
       * Normal messages ki null.
       * Disappearing messages feature
       * add chesinappudu date set chestham.
       */
      expiresAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

/* =========================
   VALIDATION
========================= */

messageSchema.pre(
  "validate",
  function validateMessage(next) {
    const hasText =
      Boolean(this.text?.trim());

    const hasImage =
      Boolean(this.image?.trim());

    if (!hasText && !hasImage) {
      return next(
        new Error(
          "Message must contain text or an image"
        )
      );
    }

    next();
  }
);

/*
 * Schema save operations lo same user
 * duplicate reaction prevent chesthundi.
 *
 * Controller lo atomic update pipeline
 * kuda use chestham, concurrency safe kosam.
 */
messageSchema.path(
  "reactions"
).validate({
  validator(reactions) {
    const userIds = reactions.map(
      (reaction) =>
        String(reaction.user)
    );

    return (
      new Set(userIds).size ===
      userIds.length
    );
  },

  message:
    "A user can have only one reaction per message",
});

/* =========================
   QUERY INDEXES
========================= */

/*
 * Conversation messages fast ga
 * chronological order lo load avvadaniki.
 */
messageSchema.index({
  sender: 1,
  receiver: 1,
  createdAt: -1,
});

/*
 * Delivered/read processing fast ga
 * handle avvadaniki.
 */
messageSchema.index({
  receiver: 1,
  status: 1,
});

/*
 * Only expiresAt date unna messages
 * matrame automatic ga delete avutayi.
 */
messageSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      expiresAt: {
        $type: "date",
      },
    },
  }
);

/* =========================
   MODEL HELPERS
========================= */

messageSchema.statics.getAllowedReactions =
  function getAllowedReactions() {
    return [
      ...ALLOWED_REACTIONS,
    ];
  };

module.exports =
  mongoose.model(
    "Message",
    messageSchema
  );
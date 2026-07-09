const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: String,

    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    image: String,
  },
  {
    timestamps: true,
  }
);

messageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }
);

module.exports = mongoose.model("Message", messageSchema);
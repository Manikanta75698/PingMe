const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
    },

    receiver: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      default: "",
    },

    storyReply: {
      type: Boolean,
      default: false,
    },

    storyId: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },

    // Delete for everyone
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Delete only for selected users
    deletedFor: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
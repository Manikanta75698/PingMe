const Message = require("../models/Message");

const sendMessage = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const {
      sender,
      receiver,
      text,
      storyReply,
      storyId
    } = req.body;

    const message = await Message.create({
      sender,
      receiver,
      text: text || "",

      storyReply:
        storyReply || false,

      storyId:
        storyId || "",

      image:
        req.file
          ? req.file.path
          : "",

      status: "delivered",
    });

    console.log("SAVED:", message);

    res.status(201).json(message);

  } catch (error) {
    console.log("SEND ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


const getMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: 1 });

    res.json(messages);

  } catch (error) {
    console.log("ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};


const markAsSeen = async (req, res) => {
  try {
    const { sender, receiver } = req.body;

    await Message.updateMany(
      {
        sender,
        receiver,
        status: "delivered",
      },
      {
        status: "seen",
      }
    );

    res.json({
      message: "Messages marked as seen",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// Delete for Me
const deleteForMe = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const message = await Message.findByIdAndUpdate(
      id,
      {
        $addToSet: {
          deletedFor: userId,
        },
      },
      { new: true }
    );

    res.json(message);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


// Delete for Everyone
const deleteForEveryone = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    // Sender only can delete for everyone
    if (message.sender !== userId) {
      return res.status(403).json({
        message: "You can delete only your messages",
      });
    }

    message.isDeleted = true;
    message.text = "";
    message.image = "";

    await message.save();

    res.json({
      message: "Message deleted for everyone",
      data: message,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


module.exports = {
  sendMessage,
  getMessages,
  markAsSeen,
  deleteForMe,
  deleteForEveryone,
};
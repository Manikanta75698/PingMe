const Message = require("../models/Message");


const {
  getIO,
  getSocketId,
} = require("../socket/socketInstance");


const sendMessage = async (req, res) => {
  console.log("🚀 sendMessage API HIT");
  try {
    const {
      receiver,
      text,
      replyTo,
    } = req.body;

    if (!receiver) {
      return res.status(400).json({
        success: false,
        message: "Receiver is required",
      });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver,
      text: text || "",
      replyTo: replyTo || null,
    });

    await message.populate(
      "sender",
      "name username profilePic"
    );

    // 🔥 Real-time emit
    const io = getIO();

    const receiverSocket = getSocketId(receiver);

    console.log("========== SEND ==========");
    console.log("Receiver:", receiver);
    console.log("Receiver Socket:", receiverSocket);

    if (receiverSocket) {
      console.log("EMITTING newMessage");
      io.to(receiverSocket).emit("newMessage", message);
    } else {
      console.log("❌ Receiver socket not found");
    }

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        {
          sender: req.user._id,
          receiver: userId,
        },
        {
          sender: userId,
          receiver: req.user._id,
        },
      ],
    })
      .populate("sender", "name username profilePic")
      .populate("receiver", "name username profilePic")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name username profilePic",
        },
      })
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Get Messages Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
};
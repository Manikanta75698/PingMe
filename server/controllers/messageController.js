const Message = require("../models/Message");

const ChatRequest = require("../models/ChatRequest");

const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const {
  getIO,
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

    const receiverId = String(receiver);
    const senderId = String(req.user._id);

    const chatAllowed = await ChatRequest.findOne({
      status: "accepted",
      $or: [
        {
          sender: senderId,
          receiver: receiverId,
        },
        {
          sender: receiverId,
          receiver: senderId,
        },
      ],
    });

    if (!chatAllowed) {
      return res.status(403).json({
        success: false,
        message: "Chat request not accepted",
      });
    }

    let image = "";

    if (req.file) {
      const uploadFromBuffer = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "pingme/messages",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );

          streamifier
            .createReadStream(req.file.buffer)
            .pipe(stream);
        });

      const uploaded = await uploadFromBuffer();
      image = uploaded.secure_url;
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      text: text || "",
      image,
      replyTo: replyTo || null,
    });

    await message.populate(
      "sender",
      "name username profilePic"
    );

    const io = getIO();
    io.to(receiverId).emit("newMessage", message);

    console.log(
      "NEW MESSAGE EMITTED TO USER ROOM:",
      receiverId
    );

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const chatAllowed = await ChatRequest.findOne({
      status: "accepted",
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
    });

    if (!chatAllowed) {
      return res.status(403).json({
        success: false,
        message: "Chat request not accepted",
      });
    }

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

const getChatSummaries = async (req, res) => {
  try {
    const currentUserId = String(req.user._id);

    const acceptedRequests = await ChatRequest.find({
      status: "accepted",
      $or: [
        { sender: currentUserId },
        { receiver: currentUserId },
      ],
    })
      .populate(
        "sender",
        "name username profilePic"
      )
      .populate(
        "receiver",
        "name username profilePic"
      )
      .lean();

    const summaries = await Promise.all(
      acceptedRequests.map(async (request) => {
        const senderId = String(
          request.sender?._id || request.sender
        );

        const otherUser =
          senderId === currentUserId
            ? request.receiver
            : request.sender;

        const otherUserId = String(
          otherUser?._id || otherUser
        );

        const lastMessage = await Message.findOne({
          $or: [
            {
              sender: currentUserId,
              receiver: otherUserId,
            },
            {
              sender: otherUserId,
              receiver: currentUserId,
            },
          ],
        })
          .sort({ createdAt: -1 })
          .select(
            "text image sender receiver status createdAt"
          )
          .lean();

        const unreadCount = await Message.countDocuments({
          sender: otherUserId,
          receiver: currentUserId,
          status: {
            $ne: "read",
          },
        });

        return {
          user: otherUser,
          lastMessage,
          unreadCount,
        };
      })
    );

    summaries.sort((first, second) => {
      const firstTime = first.lastMessage?.createdAt
        ? new Date(first.lastMessage.createdAt).getTime()
        : 0;

      const secondTime = second.lastMessage?.createdAt
        ? new Date(second.lastMessage.createdAt).getTime()
        : 0;

      return secondTime - firstTime;
    });

    return res.status(200).json({
      success: true,
      chats: summaries,
    });
  } catch (error) {
    console.error(
      "Get Chat Summaries Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load chat summaries",
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getChatSummaries,
};
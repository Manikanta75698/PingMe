const Message = require("../models/Message");

const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

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
      sender: req.user._id,
      receiver,
      text: text || "",
      image,
      replyTo: replyTo || null,
    });

    await message.populate(
      "sender",
      "name username profilePic"
    );

    const io = getIO();
    const receiverSocket = getSocketId(receiver);

    if (receiverSocket) {
      io.to(receiverSocket).emit("newMessage", message);
    }

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
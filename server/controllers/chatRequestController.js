const ChatRequest = require("../models/ChatRequest");

const {
  getIO,
  getSocketId,
} = require("../socket/socketInstance");

// ==========================
// SEND CHAT REQUEST
// ==========================
const sendRequest = async (req, res) => {
  try {
    const { receiver } = req.body;

    if (!receiver) {
      return res.status(400).json({
        success: false,
        message: "Receiver is required",
      });
    }

    if (receiver === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You can't send request to yourself",
      });
    }

    const existingRequest = await ChatRequest.findOne({
      $or: [
        {
          sender: req.user._id,
          receiver,
        },
        {
          sender: receiver,
          receiver: req.user._id,
        },
      ],
    });

    if (existingRequest) {

      if (existingRequest.status === "pending") {
        return res.status(400).json({
          success: false,
          message: "Chat request already pending",
        });
      }

      if (existingRequest.status === "accepted") {
        return res.status(400).json({
          success: false,
          message: "Chat already enabled",
        });
      }

      if (existingRequest.status === "declined") {
        await ChatRequest.findByIdAndDelete(existingRequest._id);
      }
    }

    const request = await ChatRequest.create({
      sender: req.user._id,
      receiver,
    });

    const io = getIO();

    const receiverSocket = getSocketId(receiver);

    if (receiverSocket) {
      io.to(receiverSocket).emit(
        "newChatRequest",
        request
      );
    }

    return res.status(201).json({
      success: true,
      message: "Chat request sent",
      request,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// RECEIVED REQUESTS
// ==========================
const getReceivedRequests = async (req, res) => {
  try {

    const requests = await ChatRequest.find({
      receiver: req.user._id,
    }).populate(
      "sender",
      "name username profilePic"
    );

    return res.json({
      success: true,
      requests,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// SENT REQUESTS
// ==========================
const getSentRequests = async (req, res) => {
  try {

    const requests = await ChatRequest.find({
      sender: req.user._id,
    }).populate(
      "receiver",
      "name username profilePic"
    );

    return res.json({
      success: true,
      requests,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// ACCEPT REQUEST
// ==========================
const acceptRequest = async (req, res) => {
  try {

    const request = await ChatRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    request.status = "accepted";

    await request.save();

    const io = getIO();

    const senderSocket = getSocketId(
      request.sender
    );

    if (senderSocket) {
      io.to(senderSocket).emit(
        "chatRequestAccepted",
        request
      );
    }

    return res.json({
      success: true,
      message: "Chat request accepted",
      request,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// DECLINE REQUEST
// ==========================
const declineRequest = async (req, res) => {
  try {

    const request = await ChatRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    request.status = "declined";

    await request.save();

    const io = getIO();

    const senderSocket = getSocketId(
      request.sender
    );

    if (senderSocket) {
      io.to(senderSocket).emit(
        "chatRequestDeclined",
        request
      );
    }

    return res.json({
      success: true,
      message: "Chat request declined",
      request,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  sendRequest,
  getReceivedRequests,
  getSentRequests,
  acceptRequest,
  declineRequest,
};
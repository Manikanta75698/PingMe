const User = require("../models/User");

const ChatRequest = require("../models/ChatRequest");

const getUsers = async (req, res) => {
  try {
    const currentUserId =
      req.user._id.toString();

    const acceptedRequests =
      await ChatRequest.find({
        status: "accepted",

        $or: [
          {
            sender: req.user._id,
          },
          {
            receiver: req.user._id,
          },
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
        .sort({ updatedAt: -1 });

    const users = acceptedRequests
      .map((request) => {
        const senderId =
          request.sender?._id?.toString();

        if (senderId === currentUserId) {
          return request.receiver;
        }

        return request.sender;
      })
      .filter(Boolean);

    // Prevent duplicate users
    const uniqueUsers = Array.from(
      new Map(
        users.map((user) => [
          user._id.toString(),
          user,
        ])
      ).values()
    );

    return res.status(200).json({
      success: true,
      count: uniqueUsers.length,
      users: uniqueUsers,
    });
  } catch (error) {
    console.error(
      "Get Chat Users Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getUsers,
};
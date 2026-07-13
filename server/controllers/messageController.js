const mongoose = require("mongoose");
const streamifier = require("streamifier");

const Message = require("../models/Message");
const ChatRequest = require("../models/ChatRequest");

const cloudinary = require(
  "../config/cloudinary"
);

const {
  getIO,
} = require("../socket/socketInstance");

const MAX_MESSAGE_LENGTH = 5000;

const DEFAULT_REACTIONS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "👍",
  "🔥",
];

/* =========================
   HELPERS
========================= */

const normalizeId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(
      value?._id ||
      value?.id ||
      value?.userId ||
      ""
    ).trim();
  }

  return String(value).trim();
};

const isValidObjectId = (value) =>
  mongoose.isValidObjectId(
    normalizeId(value)
  );

const getAllowedReactions = () => {
  if (
    typeof Message.getAllowedReactions ===
    "function"
  ) {
    return Message.getAllowedReactions();
  }

  return [...DEFAULT_REACTIONS];
};

const isChatAccepted = async (
  firstUserId,
  secondUserId
) =>
  ChatRequest.exists({
    status: "accepted",
    $or: [
      {
        sender: firstUserId,
        receiver: secondUserId,
      },
      {
        sender: secondUserId,
        receiver: firstUserId,
      },
    ],
  });

const uploadImageFromBuffer = (
  fileBuffer
) =>
  new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder: "pingme/messages",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

    streamifier
      .createReadStream(fileBuffer)
      .pipe(uploadStream);
  });

const getCloudinaryPublicId = (
  imageUrl
) => {
  if (!imageUrl) {
    return "";
  }

  try {
    const parsedUrl =
      new URL(imageUrl);

    const uploadMarker = "/upload/";

    const uploadIndex =
      parsedUrl.pathname.indexOf(
        uploadMarker
      );

    if (uploadIndex === -1) {
      return "";
    }

    let publicPath =
      parsedUrl.pathname.slice(
        uploadIndex +
        uploadMarker.length
      );

    publicPath = publicPath.replace(
      /^v\d+\//,
      ""
    );

    publicPath = publicPath.replace(
      /\.[^/.]+$/,
      ""
    );

    return decodeURIComponent(
      publicPath
    );
  } catch {
    return "";
  }
};

const deleteCloudinaryImage =
  async (imageUrl) => {
    const publicId =
      getCloudinaryPublicId(
        imageUrl
      );

    if (!publicId) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(
        publicId,
        {
          resource_type: "image",
        }
      );
    } catch (error) {
      /*
       * Message already deleted.
       * Media cleanup failure request ni
       * fail cheyyakudadhu.
       */
      console.error(
        "CLOUDINARY MESSAGE CLEANUP ERROR:",
        error
      );
    }
  };

const emitToParticipants = (
  firstUserId,
  secondUserId,
  eventName,
  payload
) => {
  const io = getIO();

  io.to(
    normalizeId(firstUserId)
  ).emit(eventName, payload);

  if (
    normalizeId(firstUserId) !==
    normalizeId(secondUserId)
  ) {
    io.to(
      normalizeId(secondUserId)
    ).emit(eventName, payload);
  }
};

const getControllerErrorResponse = (
  error,
  fallbackMessage
) => {
  if (
    error?.name ===
    "ValidationError" ||
    error?.name === "CastError"
  ) {
    return {
      status: 400,
      message:
        error.message ||
        "Invalid request data",
    };
  }

  return {
    status: 500,
    message: fallbackMessage,
  };
};

/* =========================
   SEND MESSAGE
========================= */

const sendMessage = async (
  req,
  res
) => {
  try {
    const senderId =
      normalizeId(req.user);

    const receiverId =
      normalizeId(
        req.body?.receiver
      );

    const replyToId =
      normalizeId(
        req.body?.replyTo
      );

    const normalizedText =
      String(
        req.body?.text || ""
      ).trim();

    if (
      !receiverId ||
      !isValidObjectId(receiverId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid receiver is required",
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot send a message to yourself",
      });
    }

    if (
      normalizedText.length >
      MAX_MESSAGE_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
      });
    }

    if (
      !normalizedText &&
      !req.file
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message must contain text or an image",
      });
    }

    if (
      replyToId &&
      !isValidObjectId(replyToId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid reply message",
      });
    }

    const chatAllowed =
      await isChatAccepted(
        senderId,
        receiverId
      );

    if (!chatAllowed) {
      return res.status(403).json({
        success: false,
        message:
          "Chat request not accepted",
      });
    }

    /*
     * User vere conversation message ID ni
     * replyTo ga manually pampinchakunda check.
     */
    if (replyToId) {
      const repliedMessage =
        await Message.exists({
          _id: replyToId,
          $or: [
            {
              sender: senderId,
              receiver:
                receiverId,
            },
            {
              sender:
                receiverId,
              receiver: senderId,
            },
          ],
        });

      if (!repliedMessage) {
        return res.status(400).json({
          success: false,
          message:
            "Reply message was not found in this conversation",
        });
      }
    }

    let imageUrl = "";

    if (req.file) {
      const uploaded =
        await uploadImageFromBuffer(
          req.file.buffer
        );

      imageUrl =
        uploaded?.secure_url || "";
    }

    const message =
      await Message.create({
        sender: senderId,
        receiver: receiverId,
        text: normalizedText,
        image: imageUrl,
        replyTo:
          replyToId || null,
        reactions: [],
      });

    await message.populate([
      {
        path: "sender",
        select:
          "name username profilePic",
      },
      {
        path: "receiver",
        select:
          "name username profilePic",
      },
      {
        path: "replyTo",
        populate: {
          path: "sender",
          select:
            "name username profilePic",
        },
      },
      {
        path: "reactions.user",
        select:
          "name username profilePic",
      },
    ]);

    const io = getIO();

    io.to(receiverId).emit(
      "newMessage",
      message
    );

    return res.status(201).json({
      success: true,
      message:
        "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    const result =
      getControllerErrorResponse(
        error,
        "Unable to send message"
      );

    return res
      .status(result.status)
      .json({
        success: false,
        message: result.message,
      });
  }
};

/* =========================
   GET CONVERSATION
========================= */

const getMessages = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeId(req.user);

    const otherUserId =
      normalizeId(
        req.params?.userId
      );

    if (
      !otherUserId ||
      !isValidObjectId(otherUserId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    if (
      currentUserId ===
      otherUserId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid conversation",
      });
    }

    const requestedLimit =
      Number.parseInt(
        req.query?.limit,
        10
      );

    const limit = Math.min(
      Math.max(
        Number.isNaN(
          requestedLimit
        )
          ? 30
          : requestedLimit,
        1
      ),
      50
    );

    const before =
      req.query?.before;

    const chatAllowed =
      await isChatAccepted(
        currentUserId,
        otherUserId
      );

    if (!chatAllowed) {
      return res.status(403).json({
        success: false,
        message:
          "Chat request not accepted",
      });
    }

    const conversationQuery = {
      $or: [
        {
          sender: currentUserId,
          receiver: otherUserId,
        },
        {
          sender: otherUserId,
          receiver:
            currentUserId,
        },
      ],
    };

    if (before) {
      const beforeDate =
        new Date(before);

      if (
        Number.isNaN(
          beforeDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid pagination cursor",
        });
      }

      conversationQuery.createdAt = {
        $lt: beforeDate,
      };
    }

    const fetchedMessages =
      await Message.find(
        conversationQuery
      )
        .populate(
          "sender",
          "name username profilePic"
        )
        .populate(
          "receiver",
          "name username profilePic"
        )
        .populate({
          path: "replyTo",
          populate: {
            path: "sender",
            select:
              "name username profilePic",
          },
        })
        .populate(
          "reactions.user",
          "name username profilePic"
        )
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .limit(limit + 1)
        .lean();

    const hasMore =
      fetchedMessages.length >
      limit;

    const pageMessages =
      hasMore
        ? fetchedMessages.slice(
          0,
          limit
        )
        : fetchedMessages;

    /*
     * Database latest-first.
     * UI oldest-first.
     */
    pageMessages.reverse();

    const nextCursor =
      hasMore &&
        pageMessages.length > 0
        ? pageMessages[0]
          .createdAt
        : null;

    return res.status(200).json({
      success: true,
      count:
        pageMessages.length,
      messages: pageMessages,

      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error(
      "GET MESSAGES ERROR:",
      error
    );

    const result =
      getControllerErrorResponse(
        error,
        "Unable to load messages"
      );

    return res
      .status(result.status)
      .json({
        success: false,
        message: result.message,
      });
  }
};

/* =========================
   TOGGLE MESSAGE REACTION
========================= */

const toggleReaction = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeId(req.user);

    const messageId =
      normalizeId(
        req.params?.messageId
      );

    const emoji =
      String(
        req.body?.emoji || ""
      ).trim();

    const allowedReactions =
      getAllowedReactions();

    if (
      !messageId ||
      !isValidObjectId(messageId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid message ID",
      });
    }

    if (
      !emoji ||
      !allowedReactions.includes(
        emoji
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported reaction",
        allowedReactions,
      });
    }

    const userObjectId =
      new mongoose.Types.ObjectId(
        currentUserId
      );

    const reactionCreatedAt =
      new Date();

    /*
     * Atomic pipeline:
     *
     * Existing same emoji -> remove
     * Existing different emoji -> replace
     * No reaction -> add
     *
     * Oka user ki one reaction matrame.
     */
    const updatedMessage =
      await Message.findOneAndUpdate(
        {
          _id: messageId,

          /*
           * Sender or receiver matrame
           * reaction add cheyyagalru.
           */
          $or: [
            {
              sender:
                currentUserId,
            },
            {
              receiver:
                currentUserId,
            },
          ],
        },
        [
          {
            $set: {
              reactions: {
                $let: {
                  vars: {
                    existingReaction: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: {
                              $ifNull: [
                                "$reactions",
                                [],
                              ],
                            },

                            as: "reaction",

                            cond: {
                              $eq: [
                                "$$reaction.user",
                                userObjectId,
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },

                  in: {
                    $cond: [
                      /*
                       * Same reaction click:
                       * toggle off.
                       */
                      {
                        $eq: [
                          "$$existingReaction.emoji",
                          emoji,
                        ],
                      },

                      {
                        $filter: {
                          input: {
                            $ifNull: [
                              "$reactions",
                              [],
                            ],
                          },

                          as: "reaction",

                          cond: {
                            $ne: [
                              "$$reaction.user",
                              userObjectId,
                            ],
                          },
                        },
                      },

                      /*
                       * Add or replace reaction.
                       */
                      {
                        $concatArrays: [
                          {
                            $filter: {
                              input: {
                                $ifNull: [
                                  "$reactions",
                                  [],
                                ],
                              },

                              as: "reaction",

                              cond: {
                                $ne: [
                                  "$$reaction.user",
                                  userObjectId,
                                ],
                              },
                            },
                          },

                          [
                            {
                              user:
                                userObjectId,
                              emoji,
                              createdAt:
                                reactionCreatedAt,
                            },
                          ],
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
        {
          new: true,
        }
      )
        .populate(
          "reactions.user",
          "name username profilePic"
        );

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message:
          "Message not found or you cannot react to it",
      });
    }

    const senderId =
      normalizeId(
        updatedMessage.sender
      );

    const receiverId =
      normalizeId(
        updatedMessage.receiver
      );

    const currentReaction =
      updatedMessage.reactions.find(
        (reaction) =>
          normalizeId(
            reaction?.user
          ) === currentUserId
      );

    const action =
      currentReaction
        ? "set"
        : "removed";

    const reactionPayload = {
      messageId: String(
        updatedMessage._id
      ),

      reactions:
        updatedMessage.reactions,

      updatedBy:
        currentUserId,

      action,
    };

    emitToParticipants(
      senderId,
      receiverId,
      "messageReactionUpdated",
      reactionPayload
    );

    return res.status(200).json({
      success: true,
      message:
        action === "removed"
          ? "Reaction removed"
          : "Reaction updated",

      data: reactionPayload,
    });
  } catch (error) {
    console.error(
      "TOGGLE REACTION ERROR:",
      error
    );

    const result =
      getControllerErrorResponse(
        error,
        "Unable to update reaction"
      );

    return res
      .status(result.status)
      .json({
        success: false,
        message: result.message,
      });
  }
};

/* =========================
   DELETE MESSAGE
========================= */

const deleteMessage = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeId(req.user);

    const messageId =
      normalizeId(
        req.params?.messageId
      );

    if (
      !messageId ||
      !isValidObjectId(messageId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid message ID",
      });
    }

    /*
     * Sender matrame message delete
     * cheyyagaladu.
     */
    const message =
      await Message.findOne({
        _id: messageId,
        sender: currentUserId,
      });

    if (!message) {
      return res.status(404).json({
        success: false,
        message:
          "Message not found or you cannot delete it",
      });
    }

    const receiverId =
      normalizeId(
        message.receiver
      );

    const imageUrl =
      message.image || "";

    await Message.deleteOne({
      _id: message._id,
    });

    const deletePayload = {
      messageId: String(
        message._id
      ),
    };

    emitToParticipants(
      currentUserId,
      receiverId,
      "messageDeleted",
      deletePayload
    );

    /*
     * MongoDB response wait cheyyakunda
     * Cloudinary cleanup background lo.
     */
    if (imageUrl) {
      void deleteCloudinaryImage(
        imageUrl
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Message deleted successfully",
      messageId: String(
        message._id
      ),
    });
  } catch (error) {
    console.error(
      "DELETE MESSAGE ERROR:",
      error
    );

    const result =
      getControllerErrorResponse(
        error,
        "Unable to delete message"
      );

    return res
      .status(result.status)
      .json({
        success: false,
        message: result.message,
      });
  }
};

/* =========================
   CHAT SUMMARIES
========================= */

const getChatSummaries =
  async (req, res) => {
    try {
      const currentUserId =
        normalizeId(req.user);

      const acceptedRequests =
        await ChatRequest.find({
          status: "accepted",

          $or: [
            {
              sender:
                currentUserId,
            },
            {
              receiver:
                currentUserId,
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
          .lean();

      const summaries =
        await Promise.all(
          acceptedRequests.map(
            async (request) => {
              const senderId =
                normalizeId(
                  request.sender
                );

              const otherUser =
                senderId ===
                  currentUserId
                  ? request.receiver
                  : request.sender;

              const otherUserId =
                normalizeId(
                  otherUser
                );

              const [
                lastMessage,
                unreadCount,
              ] = await Promise.all([
                Message.findOne({
                  $or: [
                    {
                      sender:
                        currentUserId,
                      receiver:
                        otherUserId,
                    },
                    {
                      sender:
                        otherUserId,
                      receiver:
                        currentUserId,
                    },
                  ],
                })
                  .sort({
                    createdAt: -1,
                    _id: -1,
                  })
                  .select(
                    "text image sender receiver status createdAt"
                  )
                  .lean(),

                Message.countDocuments({
                  sender:
                    otherUserId,
                  receiver:
                    currentUserId,
                  status: {
                    $ne: "read",
                  },
                }),
              ]);

              return {
                user: otherUser,
                lastMessage,
                unreadCount,
              };
            }
          )
        );

      summaries.sort(
        (first, second) => {
          const firstTime =
            first.lastMessage
              ?.createdAt
              ? new Date(
                first.lastMessage
                  .createdAt
              ).getTime()
              : 0;

          const secondTime =
            second.lastMessage
              ?.createdAt
              ? new Date(
                second.lastMessage
                  .createdAt
              ).getTime()
              : 0;

          return (
            secondTime -
            firstTime
          );
        }
      );

      return res.status(200).json({
        success: true,
        chats: summaries,
      });
    } catch (error) {
      console.error(
        "GET CHAT SUMMARIES ERROR:",
        error
      );

      const result =
        getControllerErrorResponse(
          error,
          "Unable to load chat summaries"
        );

      return res
        .status(result.status)
        .json({
          success: false,
          message: result.message,
        });
    }
  };

/* =========================
   EXPORTS
========================= */

module.exports = {
  sendMessage,
  getMessages,
  toggleReaction,
  deleteMessage,
  getChatSummaries,
};
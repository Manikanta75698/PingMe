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
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;

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
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value).trim();
  }

  /*
   * Mongoose ObjectId ni first handle cheyyali.
   * value.id getter ni mundu access cheyyakudadhu.
   */
  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value.toHexString();
  }

  if (
    typeof value?.toHexString ===
    "function"
  ) {
    try {
      return String(
        value.toHexString()
      ).trim();
    } catch {
      return "";
    }
  }

  if (typeof value === "object") {
    if (
      value._id &&
      value._id !== value
    ) {
      return normalizeId(
        value._id
      );
    }

    if (
      value.userId &&
      value.userId !== value
    ) {
      return normalizeId(
        value.userId
      );
    }

    /*
     * Own id property unte matrame access.
     * ObjectId prototype getter ni avoid chesthundi.
     */
    if (
      Object.prototype
        .hasOwnProperty.call(
          value,
          "id"
        )
    ) {
      const ownId = value.id;

      if (
        ownId &&
        ownId !== value
      ) {
        return normalizeId(
          ownId
        );
      }
    }

    return "";
  }

  const stringValue =
    String(value).trim();

  return stringValue ===
    "[object Object]"
    ? ""
    : stringValue;
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

/*
 * getIO() initialize kakapothe
 * controller crash avvakunda safe access.
 */
const getSafeIO = () => {
  try {
    return getIO();
  } catch (error) {
    console.error(
      "SOCKET IO ACCESS ERROR:",
      error?.message || error
    );

    return null;
  }
};

const emitToParticipants = (
  firstUserId,
  secondUserId,
  eventName,
  payload
) => {
  const io = getSafeIO();

  if (!io) {
    return false;
  }

  const firstId =
    normalizeId(firstUserId);

  const secondId =
    normalizeId(secondUserId);

  if (firstId) {
    io.to(firstId).emit(
      eventName,
      payload
    );
  }

  if (
    secondId &&
    secondId !== firstId
  ) {
    io.to(secondId).emit(
      eventName,
      payload
    );
  }

  return Boolean(
    firstId ||
    secondId
  );
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
    if (!fileBuffer) {
      reject(
        new Error(
          "Image buffer is missing"
        )
      );

      return;
    }

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

          if (!result?.secure_url) {
            reject(
              new Error(
                "Cloudinary did not return an image URL"
              )
            );

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

    const uploadMarker =
      "/upload/";

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

    /*
     * Cloudinary version section remove:
     * v1234567890/
     */
    publicPath =
      publicPath.replace(
        /^v\d+\//,
        ""
      );

    /*
     * File extension remove.
     */
    publicPath =
      publicPath.replace(
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
       * Media cleanup fail aina
       * API request fail cheyyakudadhu.
       */
      console.error(
        "CLOUDINARY MESSAGE CLEANUP ERROR:",
        error
      );
    }
  };

const populateMessage = async (
  message
) => {
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

  return message;
};

const getControllerErrorResponse = (
  error,
  fallbackMessage
) => {
  if (
    error?.name ===
    "ValidationError" ||
    error?.name ===
    "CastError"
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
  /*
   * Image upload success ayyi
   * database save fail ayithe,
   * orphan Cloudinary image cleanup.
   */
  let uploadedImageUrl = "";
  let persistedMessage = null;

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
      !senderId ||
      !isValidObjectId(senderId)
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

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

        message:
          `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
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
     * Vere conversation message ID ni
     * replyTo ga manually pampinchakunda
     * authorization check.
     */
    if (replyToId) {
      const repliedMessageExists =
        await Message.exists({
          _id: replyToId,

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

      if (!repliedMessageExists) {
        return res.status(400).json({
          success: false,

          message:
            "Reply message was not found in this conversation",
        });
      }
    }

    if (req.file) {
      const uploaded =
        await uploadImageFromBuffer(
          req.file.buffer
        );

      uploadedImageUrl =
        uploaded.secure_url;
    }

    persistedMessage =
      await Message.create({
        sender: senderId,
        receiver: receiverId,

        text: normalizedText,
        image: uploadedImageUrl,

        status: "sent",

        replyTo:
          replyToId || null,

        reactions: [],
      });

    await populateMessage(
      persistedMessage
    );

    /*
     * Mongoose document badhulu
     * clean plain JavaScript payload.
     */
    const messagePayload =
      persistedMessage.toObject();

    const io = getSafeIO();

    if (io) {
      /*
       * Authenticated receiver room ki
       * real-time message emit.
       */
      io.to(receiverId).emit(
        "newMessage",
        messagePayload
      );
    }

    return res.status(201).json({
      success: true,

      message:
        "Message sent successfully",

      data: messagePayload,
    });
  } catch (error) {
    /*
     * DB lo message save kakapothe
     * uploaded image cleanup.
     */
    if (
      uploadedImageUrl &&
      !persistedMessage
    ) {
      void deleteCloudinaryImage(
        uploadedImageUrl
      );
    }

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
      !currentUserId ||
      !isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !otherUserId ||
      !isValidObjectId(
        otherUserId
      )
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
          ? DEFAULT_PAGE_SIZE
          : requestedLimit,
        1
      ),
      MAX_PAGE_SIZE
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

      messages:
        pageMessages,

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

    if (
      !currentUserId ||
      !isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !messageId ||
      !isValidObjectId(
        messageId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid message ID",
      });
    }

    const allowedReactions =
      getAllowedReactions();

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

    /*
     * Sender or receiver matrame
     * message ki react cheyyagalaru.
     */
    const message =
      await Message.findOne({
        _id: messageId,

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
      });

    if (!message) {
      return res.status(404).json({
        success: false,

        message:
          "Message not found or you cannot react to it",
      });
    }

    if (
      !Array.isArray(
        message.reactions
      )
    ) {
      message.reactions = [];
    }

    const existingIndex =
      message.reactions.findIndex(
        (reaction) =>
          normalizeId(
            reaction?.user
          ) === currentUserId
      );

    let action = "set";

    /*
     * Same reaction:
     * remove.
     */
    if (
      existingIndex >= 0 &&
      message.reactions[
        existingIndex
      ]?.emoji === emoji
    ) {
      message.reactions.splice(
        existingIndex,
        1
      );

      action = "removed";
    } else if (
      existingIndex >= 0
    ) {
      /*
       * Different reaction:
       * replace.
       */
      message.reactions[
        existingIndex
      ].emoji = emoji;

      message.reactions[
        existingIndex
      ].createdAt =
        new Date();
    } else {
      /*
       * First reaction:
       * add.
       */
      message.reactions.push({
        user: currentUserId,
        emoji,
        createdAt:
          new Date(),
      });
    }

    /*
     * Nested array changes
     * Mongoose ki explicitly mark.
     */
    message.markModified(
      "reactions"
    );

    await message.save();

    await message.populate(
      "reactions.user",
      "name username profilePic"
    );

    const senderId =
      normalizeId(
        message.sender
      );

    const receiverId =
      normalizeId(
        message.receiver
      );

    const messageObject =
      message.toObject();

    const reactionPayload = {
      messageId:
        normalizeId(
          messageObject._id
        ),

      reactions:
        messageObject.reactions ||
        [],

      updatedBy:
        currentUserId,

      action,
    };

    /*
     * Sender and receiver authenticated
     * rooms rendu update avutayi.
     */
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

      data:
        reactionPayload,
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
      !currentUserId ||
      !isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !messageId ||
      !isValidObjectId(
        messageId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid message ID",
      });
    }

    /*
     * Sender matrame delete
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

    const senderId =
      normalizeId(
        message.sender
      );

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
      messageId:
        normalizeId(
          message._id
        ),
    };

    /*
     * Both participants UI nunchi
     * immediate removal.
     */
    emitToParticipants(
      senderId,
      receiverId,
      "messageDeleted",
      deletePayload
    );

    /*
     * Response wait cheyyakunda
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

      messageId:
        deletePayload.messageId,
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

const getChatSummaries = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeId(req.user);

    if (
      !currentUserId ||
      !isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

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

    /*
     * Duplicate accepted requests unte
     * same user duplicate summary
     * create kakunda Map use chestham.
     */
    const uniqueUsers =
      new Map();

    acceptedRequests.forEach(
      (request) => {
        const requestSenderId =
          normalizeId(
            request.sender
          );

        const otherUser =
          requestSenderId ===
            currentUserId
            ? request.receiver
            : request.sender;

        const otherUserId =
          normalizeId(
            otherUser
          );

        if (
          otherUserId &&
          !uniqueUsers.has(
            otherUserId
          )
        ) {
          uniqueUsers.set(
            otherUserId,
            otherUser
          );
        }
      }
    );

    const summaries =
      await Promise.all(
        Array.from(
          uniqueUsers.entries()
        ).map(
          async ([
            otherUserId,
            otherUser,
          ]) => {
            const conversationFilter = {
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
            };

            const [
              lastMessage,
              unreadCount,
            ] = await Promise.all([
              Message.findOne(
                conversationFilter
              )
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
                  $in: [
                    "sent",
                    "delivered",
                  ],
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
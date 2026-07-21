const mongoose = require("mongoose");
const streamifier = require("streamifier");

const Message = require("../models/Message");
const Post = require("../models/Post");

const User = require(
  "../models/User"
);

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

const getUserBlockState =
  async (
    firstUserId,
    secondUserId
  ) => {
    const firstId =
      normalizeId(firstUserId);

    const secondId =
      normalizeId(secondUserId);

    if (
      !firstId ||
      !secondId
    ) {
      return {
        blockedByFirst: false,
        blockedBySecond: false,
        isBlocked: false,
      };
    }

    const users =
      await User.find({
        _id: {
          $in: [
            firstId,
            secondId,
          ],
        },
      })
        .select(
          "_id blockedUsers"
        )
        .lean();

    const userMap =
      new Map(
        users.map((user) => [
          normalizeId(user?._id),
          user,
        ])
      );

    const firstUser =
      userMap.get(firstId);

    const secondUser =
      userMap.get(secondId);

    const blockedByFirst =
      Array.isArray(
        firstUser?.blockedUsers
      ) &&
      firstUser.blockedUsers.some(
        (userId) =>
          normalizeId(userId) ===
          secondId
      );

    const blockedBySecond =
      Array.isArray(
        secondUser?.blockedUsers
      ) &&
      secondUser.blockedUsers.some(
        (userId) =>
          normalizeId(userId) ===
          firstId
      );

    return {
      blockedByFirst,
      blockedBySecond,

      isBlocked:
        blockedByFirst ||
        blockedBySecond,
    };
  };

const getOtherMessageParticipantId = (
  message,
  currentUserId
) => {
  const senderId =
    normalizeId(
      message?.sender
    );

  const receiverId =
    normalizeId(
      message?.receiver
    );

  if (
    senderId ===
    normalizeId(currentUserId)
  ) {
    return receiverId;
  }

  if (
    receiverId ===
    normalizeId(currentUserId)
  ) {
    return senderId;
  }

  return "";
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

const deleteCloudinaryImageIfUnused =
  async (imageUrl) => {
    if (!imageUrl) {
      return;
    }

    try {
      /*
       * Forwarded messages same image URL
       * use chestayi. Vere message image ni
       * use chesthunte Cloudinary asset delete cheyyam.
       */
      const imageStillUsed =
        await Message.exists({
          image: imageUrl,
        });

      if (imageStillUsed) {
        return;
      }

      await deleteCloudinaryImage(
        imageUrl
      );
    } catch (error) {
      /*
       * Background media cleanup failure
       * API response ni affect cheyyakudadhu.
       */
      console.error(
        "SHARED MESSAGE IMAGE CLEANUP ERROR:",
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
    {
      path: "pinnedBy",
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

    const sharedPostId =
      normalizeId(
        req.body?.sharedPostId
      );

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
      !req.file &&
      !sharedPostId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message must contain text, an image, or a shared post",
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

    if (
      sharedPostId &&
      !isValidObjectId(
        sharedPostId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid shared post",
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


    const blockState =
      await getUserBlockState(
        senderId,
        receiverId
      );

    if (blockState.isBlocked) {
      return res.status(403).json({
        success: false,

        message:
          blockState.blockedByFirst
            ? "Unblock this user to send messages"
            : "You cannot send messages to this user",

        code:
          blockState.blockedByFirst
            ? "USER_BLOCKED_BY_YOU"
            : "USER_BLOCKED_YOU",
      });
    }

    let sharedPostData =
      null;

    if (sharedPostId) {
      const sharedPost =
        await Post.findById(
          sharedPostId
        )
          .populate(
            "user",
            "name username profilePic"
          )
          .lean();

      if (!sharedPost) {
        return res.status(404).json({
          success: false,
          message:
            "Shared post not found",
        });
      }

      const sharedPostOwner =
        sharedPost.user || {};

      const ownerId =
        normalizeId(
          sharedPostOwner
        );

      if (!ownerId) {
        return res.status(400).json({
          success: false,
          message:
            "Shared post owner is unavailable",
        });
      }

      sharedPostData = {
        postId:
          sharedPost._id,

        image:
          String(
            sharedPost.image || ""
          ).trim(),

        caption:
          String(
            sharedPost.caption || ""
          ).trim(),

        owner:
          ownerId,

        ownerName:
          String(
            sharedPostOwner.name ||
            ""
          ).trim(),

        ownerUsername:
          String(
            sharedPostOwner.username ||
            ""
          ).trim(),

        ownerProfilePic:
          String(
            sharedPostOwner.profilePic ||
            ""
          ).trim(),
      };
    }

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

        sharedPost:
          sharedPostData,

        status: "sent",

        replyTo:
          replyToId || null,

        reactions: [],
      });

    await populateMessage(
      persistedMessage
    );

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
        .populate(
          "pinnedBy",
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
   GET PINNED MESSAGE
========================= */

const getPinnedMessage = async (
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

    const pinnedMessage =
      await Message.findOne({
        pinnedAt: {
          $ne: null,
        },

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
      }).sort({
        pinnedAt: -1,
      });

    if (!pinnedMessage) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    await populateMessage(
      pinnedMessage
    );

    return res.status(200).json({
      success: true,
      data:
        pinnedMessage.toObject(),
    });
  } catch (error) {
    console.error(
      "GET PINNED MESSAGE ERROR:",
      error
    );

    const result =
      getControllerErrorResponse(
        error,
        "Unable to get pinned message"
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

    const reactionOtherUserId =
      getOtherMessageParticipantId(
        message,
        currentUserId
      );

    const reactionBlockState =
      await getUserBlockState(
        currentUserId,
        reactionOtherUserId
      );

    if (
      reactionBlockState.isBlocked
    ) {
      return res.status(403).json({
        success: false,

        message:
          reactionBlockState
            .blockedByFirst
            ? "Unblock this user to react to messages"
            : "You cannot react to this user's messages",

        code:
          reactionBlockState
            .blockedByFirst
            ? "USER_BLOCKED_BY_YOU"
            : "USER_BLOCKED_YOU",
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

      message.reactions[
        existingIndex
      ].emoji = emoji;

      message.reactions[
        existingIndex
      ].createdAt =
        new Date();
    } else {

      message.reactions.push({
        user: currentUserId,
        emoji,
        createdAt:
          new Date(),
      });
    }


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
   EDIT MESSAGE
========================= */

const editMessage = async (
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

    const normalizedText =
      String(
        req.body?.text || ""
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

    if (!normalizedText) {
      return res.status(400).json({
        success: false,
        message:
          "Edited message cannot be empty",
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

    /*
     * Sender matrame own message
     * edit cheyyagaladu.
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
          "Message not found or you cannot edit it",
      });
    }


    const editOtherUserId =
      getOtherMessageParticipantId(
        message,
        currentUserId
      );

    const editBlockState =
      await getUserBlockState(
        currentUserId,
        editOtherUserId
      );

    if (editBlockState.isBlocked) {
      return res.status(403).json({
        success: false,

        message:
          editBlockState.blockedByFirst
            ? "Unblock this user to edit messages"
            : "You cannot edit messages in this conversation",

        code:
          editBlockState.blockedByFirst
            ? "USER_BLOCKED_BY_YOU"
            : "USER_BLOCKED_YOU",
      });
    }

    /*
     * Image-only message edit
     * disable chesthunnam.
     */
    const existingText =
      String(
        message.text || ""
      ).trim();

    if (!existingText) {
      return res.status(400).json({
        success: false,

        message:
          "Image-only messages cannot be edited",
      });
    }

    if (
      existingText ===
      normalizedText
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No changes were made",
      });
    }

    message.text =
      normalizedText;

    message.editedAt =
      new Date();

    await message.save();

    await populateMessage(
      message
    );

    const messagePayload =
      message.toObject();

    const senderId =
      normalizeId(
        messagePayload.sender
      );

    const receiverId =
      normalizeId(
        messagePayload.receiver
      );

    /*
     * Sender and receiver UI rendu
     * real-time update avutayi.
     */
    emitToParticipants(
      senderId,
      receiverId,
      "messageEdited",
      messagePayload
    );

    return res.status(200).json({
      success: true,

      message:
        "Message edited successfully",

      data:
        messagePayload,
    });
  } catch (error) {
    console.error(
      "EDIT MESSAGE ERROR:",
      error
    );

    const result =
      getControllerErrorResponse(
        error,
        "Unable to edit message"
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
   FORWARD MESSAGE
========================= */

const forwardMessage = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeId(req.user);

    const sourceMessageId =
      normalizeId(
        req.params?.messageId
      );

    const receiverId =
      normalizeId(
        req.body?.receiver
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
      !sourceMessageId ||
      !isValidObjectId(
        sourceMessageId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid message ID",
      });
    }

    if (
      !receiverId ||
      !isValidObjectId(
        receiverId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid receiver is required",
      });
    }

    if (
      currentUserId ===
      receiverId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot forward a message to yourself",
      });
    }


    const sourceMessage =
      await Message.findOne({
        _id: sourceMessageId,

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

    if (!sourceMessage) {
      return res.status(404).json({
        success: false,

        message:
          "Message not found or you cannot forward it",
      });
    }

    const sourceText =
      String(
        sourceMessage.text || ""
      ).trim();

    const sourceImage =
      String(
        sourceMessage.image || ""
      ).trim();

    if (
      !sourceText &&
      !sourceImage
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This message cannot be forwarded",
      });
    }


    const chatAllowed =
      await isChatAccepted(
        currentUserId,
        receiverId
      );

    if (!chatAllowed) {
      return res.status(403).json({
        success: false,
        message:
          "Chat request not accepted",
      });
    }

    const forwardBlockState =
      await getUserBlockState(
        currentUserId,
        receiverId
      );

    if (forwardBlockState.isBlocked) {
      return res.status(403).json({
        success: false,

        message:
          forwardBlockState
            .blockedByFirst
            ? "Unblock this user before forwarding messages"
            : "You cannot forward messages to this user",

        code:
          forwardBlockState
            .blockedByFirst
            ? "USER_BLOCKED_BY_YOU"
            : "USER_BLOCKED_YOU",

        data: {
          userId: receiverId,
        },
      });
    }

    const forwardedMessage =
      await Message.create({
        sender:
          currentUserId,

        receiver:
          receiverId,

        text:
          sourceText,

        image:
          sourceImage,

        status:
          "sent",

        replyTo:
          null,

        reactions:
          [],

        editedAt:
          null,

        isForwarded:
          true,

        forwardedFrom:
          sourceMessage._id,
      });

    await populateMessage(
      forwardedMessage
    );

    const messagePayload =
      forwardedMessage.toObject();

    /*
     * Receiver authenticated socket room ki
     * forwarded message real-time emit.
     */
    const io = getSafeIO();

    if (io) {
      io.to(receiverId).emit(
        "newMessage",
        messagePayload
      );
    }

    return res.status(201).json({
      success: true,

      message:
        "Message forwarded successfully",

      data:
        messagePayload,
    });
  } catch (error) {
    console.error(
      "FORWARD MESSAGE ERROR:",
      error
    );

    const result =
      getControllerErrorResponse(
        error,
        "Unable to forward message"
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
   TOGGLE PIN MESSAGE
========================= */

const togglePinMessage = async (
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
     * Sender or receiver matrame
     * message pin/unpin cheyyagalaru.
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
          "Message not found or you cannot pin it",
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

    const otherUserId =
      senderId ===
        currentUserId
        ? receiverId
        : senderId;

    const pinBlockState =
      await getUserBlockState(
        currentUserId,
        otherUserId
      );

    if (pinBlockState.isBlocked) {
      return res.status(403).json({
        success: false,

        message:
          pinBlockState.blockedByFirst
            ? "Unblock this user to pin messages"
            : "You cannot pin messages in this conversation",

        code:
          pinBlockState.blockedByFirst
            ? "USER_BLOCKED_BY_YOU"
            : "USER_BLOCKED_YOU",
      });
    }

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

    const conversationFilter = {
      $or: [
        {
          sender:
            senderId,

          receiver:
            receiverId,
        },
        {
          sender:
            receiverId,

          receiver:
            senderId,
        },
      ],
    };

    const isCurrentlyPinned =
      Boolean(
        message.pinnedAt
      );

    let clearedMessageIds = [];

    if (isCurrentlyPinned) {
      /*
       * Current pinned message:
       * unpin chestham.
       */
      message.pinnedAt =
        null;

      message.pinnedBy =
        null;
    } else {
      /*
       * Existing pinned messages identify
       * chesi client UI clear cheyyadaniki
       * IDs payload lo pampistham.
       */
      const previouslyPinnedMessages =
        await Message.find({
          ...conversationFilter,

          _id: {
            $ne:
              message._id,
          },

          pinnedAt: {
            $ne: null,
          },
        })
          .select("_id")
          .lean();

      clearedMessageIds =
        previouslyPinnedMessages
          .map((item) =>
            normalizeId(
              item?._id
            )
          )
          .filter(Boolean);

      /*
       * Conversation lo previous pin
       * automatic ga remove.
       */
      await Message.updateMany(
        {
          ...conversationFilter,

          _id: {
            $ne:
              message._id,
          },

          pinnedAt: {
            $ne: null,
          },
        },
        {
          $set: {
            pinnedAt:
              null,

            pinnedBy:
              null,
          },
        }
      );

      message.pinnedAt =
        new Date();

      message.pinnedBy =
        currentUserId;
    }

    await message.save();

    await populateMessage(
      message
    );

    const messagePayload =
      message.toObject();

    const pinPayload = {
      messageId:
        normalizeId(
          messagePayload._id
        ),

      isPinned:
        Boolean(
          messagePayload.pinnedAt
        ),

      pinnedAt:
        messagePayload.pinnedAt ||
        null,

      pinnedBy:
        messagePayload.pinnedBy ||
        null,

      clearedMessageIds,

      message:
        messagePayload,
    };

    /*
     * Participants rendu devices lo
     * real-time pin state update.
     */
    emitToParticipants(
      senderId,
      receiverId,
      "messagePinUpdated",
      pinPayload
    );

    return res.status(200).json({
      success: true,

      message:
        pinPayload.isPinned
          ? "Message pinned successfully"
          : "Message unpinned successfully",

      data:
        pinPayload,
    });
  } catch (error) {
    console.error(
      "TOGGLE PIN MESSAGE ERROR:",
      error
    );

    const result =
      getControllerErrorResponse(
        error,
        "Unable to update pinned message"
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

    if (imageUrl) {
      void deleteCloudinaryImageIfUnused(
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
                  "text image sharedPost sender receiver status createdAt"
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
  getPinnedMessage,
  toggleReaction,
  editMessage,
  forwardMessage,
  togglePinMessage,
  deleteMessage,
  getChatSummaries,
};
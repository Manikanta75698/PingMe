const mongoose = require(
  "mongoose"
);

const Story = require(
  "../models/Story"
);

const uploadImage = require(
  "../utils/cloudinaryUpload"
);

const {
  getIO,
} = require(
  "../socket/socketInstance"
);

const STORY_USER_FIELDS =
  "name username profilePic";

const STORY_DURATION_MS =
  24 * 60 * 60 * 1000;

/* =========================
   HELPERS
========================= */

const normalizeId = (
  value
) => {
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
    return String(
      value
    ).trim();
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

  if (
    typeof value === "object"
  ) {
    if (
      value._id &&
      value._id !== value
    ) {
      return normalizeId(
        value._id
      );
    }

    if (
      value.id &&
      value.id !== value
    ) {
      return normalizeId(
        value.id
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

    return "";
  }

  return String(
    value
  ).trim();
};

const emitStoryEvent = (
  eventName,
  payload
) => {
  try {
    const io = getIO();

    io.emit(
      eventName,
      payload
    );
  } catch (error) {
    console.error(
      `${eventName.toUpperCase()} SOCKET ERROR:`,
      error?.message ||
      error
    );
  }
};

/* =========================
   FORMAT STORY
========================= */

const formatStory = (
  story,
  currentUserId
) => {
  const storyObject =
    typeof story?.toObject ===
      "function"
      ? story.toObject({
        virtuals: true,
      })
      : story;

  const viewers =
    Array.isArray(
      storyObject?.viewers
    )
      ? storyObject.viewers
      : [];

  const normalizedCurrentUserId =
    normalizeId(
      currentUserId
    );

  const ownerId =
    normalizeId(
      storyObject?.user?._id ||
      storyObject?.user
    );

  return {
    ...storyObject,

    viewersCount:
      viewers.length,

    isViewed:
      Boolean(
        normalizedCurrentUserId &&
        viewers.some(
          (viewerId) =>
            normalizeId(
              viewerId
            ) ===
            normalizedCurrentUserId
        )
      ),

    isOwner:
      ownerId ===
      normalizedCurrentUserId,
  };
};

/* =========================
   CREATE STORY
========================= */

const createStory = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeId(
        req.user
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Authentication required",
        });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Please upload an image",
        });
    }

    const image =
      await uploadImage(
        req.file.buffer,
        "pingme/stories"
      );

    if (!image) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to upload story image",
        });
    }

    const story =
      await Story.create({
        user:
          currentUserId,

        image,

        expiresAt:
          new Date(
            Date.now() +
            STORY_DURATION_MS
          ),
      });

    await story.populate(
      "user",
      STORY_USER_FIELDS
    );

    const formattedStory =
      formatStory(
        story,
        currentUserId
      );

    /*
     * Owner response lo isOwner=true.
     */
    const ownerStory = {
      ...formattedStory,
      isOwner: true,
    };

    /*
     * Other connected users kosam
     * owner/viewed flags false.
     */
    const realtimeStory = {
      ...formattedStory,
      isOwner: false,
      isViewed: false,
    };

    emitStoryEvent(
      "storyCreated",
      {
        story:
          realtimeStory,

        createdBy:
          currentUserId,
      }
    );

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Story uploaded successfully",

        story:
          ownerStory,
      });
  } catch (error) {
    console.error(
      "CREATE STORY ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          error.message ||
          "Unable to upload story",
      });
  }
};

/* =========================
   GET ACTIVE STORIES
========================= */

const getStories = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeId(
        req.user
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Authentication required",
        });
    }

    const stories =
      await Story.find({
        expiresAt: {
          $gt:
            new Date(),
        },
      })
        .populate(
          "user",
          STORY_USER_FIELDS
        )
        .sort({
          createdAt: -1,
        })
        .lean({
          virtuals: true,
        });

    const validStories =
      stories
        .filter(
          (story) =>
            story?.user &&
            story?.image
        )
        .map((story) =>
          formatStory(
            story,
            currentUserId
          )
        );

    return res
      .status(200)
      .json({
        success: true,

        count:
          validStories.length,

        stories:
          validStories,
      });
  } catch (error) {
    console.error(
      "GET STORIES ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          error.message ||
          "Unable to load stories",
      });
  }
};

/* =========================
   DELETE STORY
========================= */

const deleteStory = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeId(
        req.user
      );

    const storyId =
      normalizeId(
        req.params?.id
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Authentication required",
        });
    }

    if (
      !storyId ||
      !mongoose.isValidObjectId(
        storyId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid story ID",
        });
    }

    const story =
      await Story.findById(
        storyId
      ).select(
        "_id user image expiresAt"
      );

    if (!story) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Story not found",
        });
    }

    if (
      normalizeId(
        story.user
      ) !== currentUserId
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "You cannot delete this story",
        });
    }

    await story.deleteOne();

    emitStoryEvent(
      "storyDeleted",
      {
        storyId,

        deletedBy:
          currentUserId,
      }
    );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Story deleted successfully",

        data: {
          storyId,
        },
      });
  } catch (error) {
    console.error(
      "DELETE STORY ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          error.message ||
          "Unable to delete story",
      });
  }
};

/* =========================
   VIEW STORY
========================= */

const viewStory = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeId(
        req.user
      );

    const storyId =
      normalizeId(
        req.params?.id
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Authentication required",
        });
    }

    if (
      !storyId ||
      !mongoose.isValidObjectId(
        storyId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid story ID",
        });
    }

    const story =
      await Story.findOneAndUpdate(
        {
          _id:
            storyId,

          expiresAt: {
            $gt:
              new Date(),
          },
        },

        {
          $addToSet: {
            viewers:
              currentUserId,
          },
        },

        {
          new: true,
          runValidators:
            true,
        }
      ).populate(
        "user",
        STORY_USER_FIELDS
      );

    if (!story) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Story not found or expired",
        });
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Story viewed",

        data: {
          storyId,

          viewersCount:
            Array.isArray(
              story.viewers
            )
              ? story.viewers
                .length
              : 0,

          isViewed: true,
        },

        story:
          formatStory(
            story,
            currentUserId
          ),
      });
  } catch (error) {
    console.error(
      "VIEW STORY ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          error.message ||
          "Unable to view story",
      });
  }
};

module.exports = {
  createStory,
  getStories,
  deleteStory,
  viewStory,
};
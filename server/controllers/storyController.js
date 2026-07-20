const mongoose = require("mongoose");

const Story = require("../models/Story");

const uploadImage = require(
  "../utils/cloudinaryUpload"
);

const STORY_USER_FIELDS =
  "name username profilePic";

const normalizeId = (value) =>
  String(
    value?._id ??
    value?.id ??
    value ??
    ""
  ).trim();

/* =========================
   FORMAT STORY RESPONSE
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

  const storyOwnerId =
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
      storyOwnerId ===
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
      normalizeId(req.user);

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
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
      return res.status(500).json({
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
            24 *
            60 *
            60 *
            1000
          ),
      });

    await story.populate(
      "user",
      STORY_USER_FIELDS
    );

    return res.status(201).json({
      success: true,

      message:
        "Story uploaded successfully",

      story:
        formatStory(
          story,
          currentUserId
        ),
    });
  } catch (error) {
    console.error(
      "CREATE STORY ERROR:",
      error
    );

    return res.status(500).json({
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
      normalizeId(req.user);

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const stories =
      await Story.find({
        expiresAt: {
          $gt: new Date(),
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

    return res.status(200).json({
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

    return res.status(500).json({
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
      normalizeId(req.user);

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
      return res.status(401).json({
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
      return res.status(400).json({
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
      return res.status(404).json({
        success: false,
        message:
          "Story not found",
      });
    }

    if (
      normalizeId(story.user) !==
      currentUserId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot delete this story",
      });
    }

    await story.deleteOne();

    return res.status(200).json({
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

    return res.status(500).json({
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
      normalizeId(req.user);

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
      return res.status(401).json({
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
      return res.status(400).json({
        success: false,
        message:
          "Invalid story ID",
      });
    }

    const story =
      await Story.findOneAndUpdate(
        {
          _id: storyId,

          expiresAt: {
            $gt: new Date(),
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
          runValidators: true,
        }
      )
        .populate(
          "user",
          STORY_USER_FIELDS
        );

    if (!story) {
      return res.status(404).json({
        success: false,
        message:
          "Story not found or expired",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Story viewed",

      data: {
        storyId,

        viewersCount:
          Array.isArray(
            story.viewers
          )
            ? story.viewers.length
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

    return res.status(500).json({
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
const mongoose = require(
  "mongoose"
);

const Story = require(
  "../models/Story"
);

const {
  uploadImageKitFile,
  deleteImageKitFile,
} = require(
  "../utils/imagekitUpload"
);

const {
  getIO,
} = require(
  "../socket/socketInstance"
);

const STORY_DURATION_MS =
  24 * 60 * 60 * 1000;

const STORY_USER_FIELDS =
  "_id name username profilePic";

/* =========================
   ID NORMALIZER
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
      value.userId &&
      value.userId !== value
    ) {
      return normalizeId(
        value.userId
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

    return "";
  }

  const stringValue =
    String(value).trim();

  return stringValue ===
    "[object Object]"
    ? ""
    : stringValue;
};

/* =========================
   VALID OBJECT ID
========================= */

const isValidObjectId = (
  value
) =>
  Boolean(
    value &&
    mongoose.isValidObjectId(
      value
    )
  );

/* =========================
   AUTH USER ID
========================= */

const getCurrentUserId = (
  req
) =>
  normalizeId(
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    req.user
  );

/* =========================
   SOCKET EMITTER
========================= */

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
   UNIQUE VIEWER IDS
========================= */

const getUniqueViewerIds = (
  story
) => {
  const viewerIds =
    new Set();

  if (
    Array.isArray(
      story?.viewers
    )
  ) {
    story.viewers.forEach(
      (viewer) => {
        const viewerId =
          normalizeId(
            viewer
          );

        if (viewerId) {
          viewerIds.add(
            viewerId
          );
        }
      }
    );
  }

  if (
    Array.isArray(
      story?.views
    )
  ) {
    story.views.forEach(
      (view) => {
        const viewerId =
          normalizeId(
            view?.user
          );

        if (viewerId) {
          viewerIds.add(
            viewerId
          );
        }
      }
    );
  }

  return viewerIds;
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
      : {
        ...story,
      };

  const normalizedCurrentUserId =
    normalizeId(
      currentUserId
    );

  const ownerId =
    normalizeId(
      storyObject?.user?._id ||
      storyObject?.user
    );

  const viewerIds =
    getUniqueViewerIds(
      storyObject
    );

  return {
    ...storyObject,

    viewersCount:
      viewerIds.size,

    isViewed:
      Boolean(
        normalizedCurrentUserId &&
        viewerIds.has(
          normalizedCurrentUserId
        )
      ),

    isOwner:
      Boolean(
        normalizedCurrentUserId &&
        ownerId ===
        normalizedCurrentUserId
      ),
  };
};

/* =========================
   SAFE IMAGEKIT CLEANUP
========================= */

const cleanupImageKitFile =
  async (
    fileId,
    reason =
      "STORY IMAGE CLEANUP"
  ) => {
    const normalizedFileId =
      String(
        fileId || ""
      ).trim();

    if (!normalizedFileId) {
      return;
    }

    try {
      await deleteImageKitFile(
        normalizedFileId
      );
    } catch (error) {
      console.error(
        `${reason} ERROR:`,
        error?.message ||
        error
      );
    }
  };

/* =========================
   CREATE STORY
========================= */

const createStory = async (
  req,
  res
) => {
  let uploadedFileId = "";

  try {
    const currentUserId =
      getCurrentUserId(req);

    if (
      !isValidObjectId(
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
            "Please select a story image",
        });
    }

    if (
      !Buffer.isBuffer(
        req.file.buffer
      ) ||
      req.file.buffer.length ===
      0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid story image",
        });
    }

    const uploadResult =
      await uploadImageKitFile(
        req.file.buffer,
        req.file.originalname ||
        "story.jpg",
        "/pingme/stories"
      );

    const image =
      String(
        uploadResult?.url ||
        ""
      ).trim();

    const imageFileId =
      String(
        uploadResult?.fileId ||
        ""
      ).trim();

    uploadedFileId =
      imageFileId;

    if (
      !image ||
      !imageFileId
    ) {
      if (uploadedFileId) {
        await cleanupImageKitFile(
          uploadedFileId,
          "INVALID IMAGEKIT UPLOAD CLEANUP"
        );
      }

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to upload story image",
        });
    }

    const expiresAt =
      new Date(
        Date.now() +
        STORY_DURATION_MS
      );

    const story =
      await Story.create({
        user:
          currentUserId,

        image,

        imageFileId,

        viewers: [],

        views: [],

        expiresAt,
      });

    /*
     * Database save successful.
     * From this point upload should
     * no longer be automatically cleaned.
     */
    uploadedFileId = "";

    await story.populate(
      "user",
      STORY_USER_FIELDS
    );

    const ownerStory = {
      ...formatStory(
        story,
        currentUserId
      ),

      isOwner: true,
      isViewed: false,
    };

    const realtimeStory = {
      ...formatStory(
        story,
        ""
      ),

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
    /*
     * If ImageKit upload succeeded
     * but MongoDB creation failed,
     * avoid leaving orphaned media.
     */
    if (uploadedFileId) {
      await cleanupImageKitFile(
        uploadedFileId,
        "FAILED STORY CREATE CLEANUP"
      );
    }

    console.error(
      "CREATE STORY ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          error?.message ||
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
      getCurrentUserId(req);

    if (
      !isValidObjectId(
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

    const now =
      new Date();

    const stories =
      await Story.find({
        expiresAt: {
          $gt: now,
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

    const formattedStories =
      stories
        .filter(
          (story) =>
            story?.user &&
            story?.image
        )
        .map(
          (story) =>
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
          formattedStories.length,

        stories:
          formattedStories,
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
          error?.message ||
          "Unable to load stories",
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
      getCurrentUserId(req);

    const storyId =
      normalizeId(
        req.params?.id
      );

    if (
      !isValidObjectId(
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
      !isValidObjectId(
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

    const existingStory =
      await Story.findOne({
        _id:
          storyId,

        expiresAt: {
          $gt:
            new Date(),
        },
      }).select(
        "_id user viewers views expiresAt"
      );

    if (!existingStory) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Story not found or expired",
        });
    }

    const ownerId =
      normalizeId(
        existingStory.user
      );

    /*
     * Owner viewing own story
     * should not create a viewer record.
     */
    if (
      ownerId ===
      currentUserId
    ) {
      return res
        .status(200)
        .json({
          success: true,

          message:
            "Owner viewed own story",

          data: {
            storyId,

            viewersCount:
              getUniqueViewerIds(
                existingStory
              ).size,

            isViewed: false,
          },
        });
    }

    const alreadyViewed =
      getUniqueViewerIds(
        existingStory
      ).has(
        currentUserId
      );

    let story =
      existingStory;

    if (!alreadyViewed) {
      const viewedAt =
        new Date();

      story =
        await Story.findOneAndUpdate(
          {
            _id:
              storyId,

            expiresAt: {
              $gt:
                new Date(),
            },

            "views.user": {
              $ne:
                currentUserId,
            },
          },

          {
            $addToSet: {
              viewers:
                currentUserId,
            },

            $push: {
              views: {
                user:
                  currentUserId,

                viewedAt,
              },
            },
          },

          {
            new: true,
            runValidators:
              true,
          }
        );

      /*
       * Another request may have
       * updated the story first.
       */
      if (!story) {
        story =
          await Story.findById(
            storyId
          ).select(
            "_id user viewers views expiresAt"
          );
      }

      if (!story) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Story not found",
          });
      }

      const viewersCount =
        getUniqueViewerIds(
          story
        ).size;

      emitStoryEvent(
        "storyViewed",
        {
          storyId,

          ownerId,

          viewerId:
            currentUserId,

          viewersCount,

          viewedAt:
            viewedAt.toISOString(),
        }
      );
    }

    const viewersCount =
      getUniqueViewerIds(
        story
      ).size;

    return res
      .status(200)
      .json({
        success: true,

        message:
          alreadyViewed
            ? "Story already viewed"
            : "Story viewed",

        data: {
          storyId,

          viewersCount,

          isViewed: true,
        },
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
          error?.message ||
          "Unable to view story",
      });
  }
};

/* =========================
   GET STORY VIEWERS
========================= */

const getStoryViewers =
  async (
    req,
    res
  ) => {
    try {
      const currentUserId =
        getCurrentUserId(req);

      const storyId =
        normalizeId(
          req.params?.id
        );

      if (
        !isValidObjectId(
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
        !isValidObjectId(
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
        )
          .select(
            "_id user viewers views createdAt expiresAt"
          )
          .populate(
            "viewers",
            STORY_USER_FIELDS
          )
          .populate(
            "views.user",
            STORY_USER_FIELDS
          )
          .lean();

      if (!story) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Story not found",
          });
      }

      const ownerId =
        normalizeId(
          story.user
        );

      if (
        ownerId !==
        currentUserId
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only the story owner can view this list",
          });
      }

      const viewersMap =
        new Map();

      /*
       * Timestamp-based views.
       */
      if (
        Array.isArray(
          story.views
        )
      ) {
        story.views.forEach(
          (view) => {
            const viewer =
              view?.user;

            const viewerId =
              normalizeId(
                viewer
              );

            if (
              !viewerId ||
              !viewer
            ) {
              return;
            }

            viewersMap.set(
              viewerId,
              {
                _id:
                  viewerId,

                name:
                  viewer.name ||
                  "",

                username:
                  viewer.username ||
                  "",

                profilePic:
                  viewer.profilePic ||
                  "",

                viewedAt:
                  view.viewedAt ||
                  null,
              }
            );
          }
        );
      }

      /*
       * Legacy viewers that
       * do not have viewedAt.
       */
      if (
        Array.isArray(
          story.viewers
        )
      ) {
        story.viewers.forEach(
          (viewer) => {
            const viewerId =
              normalizeId(
                viewer
              );

            if (
              !viewerId ||
              !viewer
            ) {
              return;
            }

            if (
              viewersMap.has(
                viewerId
              )
            ) {
              return;
            }

            viewersMap.set(
              viewerId,
              {
                _id:
                  viewerId,

                name:
                  viewer.name ||
                  "",

                username:
                  viewer.username ||
                  "",

                profilePic:
                  viewer.profilePic ||
                  "",

                viewedAt:
                  null,
              }
            );
          }
        );
      }

      const viewers =
        Array.from(
          viewersMap.values()
        ).sort(
          (
            firstViewer,
            secondViewer
          ) => {
            const firstTime =
              firstViewer.viewedAt
                ? new Date(
                  firstViewer.viewedAt
                ).getTime()
                : 0;

            const secondTime =
              secondViewer.viewedAt
                ? new Date(
                  secondViewer.viewedAt
                ).getTime()
                : 0;

            return (
              secondTime -
              firstTime
            );
          }
        );

      return res
        .status(200)
        .json({
          success: true,

          count:
            viewers.length,

          viewers,
        });
    } catch (error) {
      console.error(
        "GET STORY VIEWERS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error?.message ||
            "Unable to load story viewers",
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
      getCurrentUserId(req);

    const storyId =
      normalizeId(
        req.params?.id
      );

    if (
      !isValidObjectId(
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
      !isValidObjectId(
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
        "_id user image imageFileId"
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

    const ownerId =
      normalizeId(
        story.user
      );

    if (
      ownerId !==
      currentUserId
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "You cannot delete this story",
        });
    }

    const imageFileId =
      String(
        story.imageFileId ||
        ""
      ).trim();

    await story.deleteOne();

    /*
     * Database deletion should not
     * fail just because remote media
     * cleanup fails.
     */
    if (imageFileId) {
      void cleanupImageKitFile(
        imageFileId,
        "IMAGEKIT STORY DELETE"
      );
    }

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
          error?.message ||
          "Unable to delete story",
      });
  }
};

/* =========================
   EXPORTS
========================= */

module.exports = {
  createStory,
  getStories,
  viewStory,
  getStoryViewers,
  deleteStory,
};
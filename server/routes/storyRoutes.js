const express = require(
  "express"
);

const {
  protect,
} = require(
  "../middleware/authMiddleware"
);

const {
  upload,
} = require(
  "../middleware/uploadMiddleware"
);

const {
  createStory,
  getStories,
  getStoryViewers,
  deleteStory,
  viewStory,
} = require(
  "../controllers/storyController"
);

const router =
  express.Router();

/* =========================
   STORY UPLOAD MIDDLEWARE
========================= */

const uploadStoryImage = (
  req,
  res,
  next
) => {
  upload.single(
    "storyImage"
  )(
    req,
    res,
    (error) => {
      if (!error) {
        next();
        return;
      }

      console.error(
        "STORY UPLOAD ERROR:",
        error
      );

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Story image must be smaller than 5MB",
          });
      }

      if (
        error.code ===
        "LIMIT_UNEXPECTED_FILE"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid story image field",
          });
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to upload story image",
        });
    }
  );
};

/* =========================
   STORY ROUTES
========================= */

/*
 * GET /api/stories
 *
 * Fetch all active stories.
 */
router.get(
  "/",
  protect,
  getStories
);

/*
 * POST /api/stories/create
 *
 * Create a new image story.
 */
router.post(
  "/create",
  protect,
  uploadStoryImage,
  createStory
);

/*
 * PUT /api/stories/view/:id
 *
 * Mark story as viewed.
 */
router.put(
  "/view/:id",
  protect,
  viewStory
);


router.get(
  "/:id/viewers",
  protect,
  getStoryViewers
);

/*
 * DELETE /api/stories/:id
 *
 * Delete own story.
 */
router.delete(
  "/:id",
  protect,
  deleteStory
);

module.exports =
  router;
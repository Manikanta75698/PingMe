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
 * Fetch active stories.
 */
router.get(
  "/",
  protect,
  getStories
);

/*
 * POST /api/stories/create
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
 * Mark an active story as viewed.
 */
router.put(
  "/view/:id",
  protect,
  viewStory
);

/*
 * DELETE /api/stories/:id
 * Delete own story.
 */
router.delete(
  "/:id",
  protect,
  deleteStory
);

module.exports = router;
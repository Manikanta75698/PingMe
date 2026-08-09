const cron = require(
  "node-cron"
);

const Story = require(
  "../models/Story"
);

const {
  deleteImageKitFile,
} = require(
  "../utils/imagekitUpload"
);

/* =========================
   STORY MEDIA CLEANUP
========================= */

const deleteStoryImage =
  async (imageFileId) => {
    const normalizedFileId =
      String(
        imageFileId || ""
      ).trim();

    if (!normalizedFileId) {
      return;
    }

    await deleteImageKitFile(
      normalizedFileId
    );
  };

/* =========================
   EXPIRED STORY CLEANUP
========================= */

const cleanupExpiredStories =
  async () => {
    const now =
      new Date();

    const expiredStories =
      await Story.find({
        expiresAt: {
          $lte: now,
        },
      })
        .select(
          "_id image imageFileId expiresAt"
        )
        .limit(100);

    if (
      expiredStories.length === 0
    ) {
      return;
    }

    for (
      const story of
      expiredStories
    ) {
      try {
        const imageFileId =
          String(
            story.imageFileId ||
            ""
          ).trim();

        if (imageFileId) {
          await deleteStoryImage(
            imageFileId
          );
        }

        await Story.deleteOne({
          _id: story._id,
        });
      } catch (error) {
        console.error(
          "EXPIRED STORY CLEANUP ERROR:",
          {
            storyId:
              String(
                story._id
              ),

            message:
              error?.message ||
              String(error),
          }
        );
      }
    }
  };

/* =========================
   START CRON JOB
========================= */

const startStoryCleanupJob =
  () => {
    /*
     * Every 10 minutes.
     */
    cron.schedule(
      "*/10 * * * *",
      () => {
        cleanupExpiredStories()
          .catch(
            (error) => {
              console.error(
                "STORY CLEANUP JOB ERROR:",
                error
              );
            }
          );
      }
    );

    /*
     * Run once immediately
     * when server starts.
     */
    cleanupExpiredStories()
      .catch(
        (error) => {
          console.error(
            "INITIAL STORY CLEANUP ERROR:",
            error
          );
        }
      );
  };

module.exports = {
  startStoryCleanupJob,
  cleanupExpiredStories,
};
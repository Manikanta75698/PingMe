const cron = require(
  "node-cron"
);

const Story = require(
  "../models/Story"
);

const cloudinary = require(
  "../config/cloudinary"
);

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

    publicPath =
      publicPath.replace(
        /^v\d+\//,
        ""
      );

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

const deleteStoryImage = async (
  imageUrl
) => {
  const publicId =
    getCloudinaryPublicId(
      imageUrl
    );

  if (!publicId) {
    return;
  }

  const result =
    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: "image",
      }
    );

  if (
    result?.result !== "ok" &&
    result?.result !== "not found"
  ) {
    throw new Error(
      `Cloudinary cleanup failed: ${result?.result ||
      "unknown result"
      }`
    );
  }
};

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
          "_id image expiresAt"
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
        const imageUrl =
          String(
            story.image || ""
          ).trim();

        if (imageUrl) {
          await deleteStoryImage(
            imageUrl
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
              String(story._id),

            message:
              error.message,
          }
        );
      }
    }
  };

const startStoryCleanupJob =
  () => {
    /*
     * Every 10 minutes.
     */
    cron.schedule(
      "*/10 * * * *",
      () => {
        cleanupExpiredStories()
          .catch((error) => {
            console.error(
              "STORY CLEANUP JOB ERROR:",
              error
            );
          });
      }
    );

    
    cleanupExpiredStories()
      .catch((error) => {
        console.error(
          "INITIAL STORY CLEANUP ERROR:",
          error
        );
      });
  };

module.exports = {
  startStoryCleanupJob,
  cleanupExpiredStories,
};
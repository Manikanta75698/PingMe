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

const cloudinary = require(
  "../config/cloudinary"
);

/* =========================
   LEGACY CLOUDINARY HELPERS
========================= */

const getCloudinaryPublicId = (
  imageUrl
) => {
  const normalizedUrl =
    String(
      imageUrl || ""
    ).trim();

  if (!normalizedUrl) {
    return "";
  }

  try {
    const parsedUrl =
      new URL(
        normalizedUrl
      );

    if (
      !parsedUrl.hostname
        .toLowerCase()
        .includes(
          "cloudinary.com"
        )
    ) {
      return "";
    }

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

const deleteLegacyCloudinaryStoryImage =
  async (
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
          resource_type:
            "image",
        }
      );

    if (
      result?.result !== "ok" &&
      result?.result !==
      "not found"
    ) {
      throw new Error(
        `Cloudinary cleanup failed: ${result?.result ||
        "unknown result"
        }`
      );
    }
  };

/* =========================
   STORY MEDIA CLEANUP
========================= */

const deleteStoryImage =
  async ({
    imageUrl,
    imageFileId,
  }) => {
    const normalizedFileId =
      String(
        imageFileId || ""
      ).trim();

    const normalizedUrl =
      String(
        imageUrl || ""
      ).trim();

    /*
     * New ImageKit stories.
     */
    if (normalizedFileId) {
      await deleteImageKitFile(
        normalizedFileId
      );

      return;
    }

    /*
     * Legacy Cloudinary stories.
     */
    if (normalizedUrl) {
      await deleteLegacyCloudinaryStoryImage(
        normalizedUrl
      );
    }
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
        const imageUrl =
          String(
            story.image || ""
          ).trim();

        const imageFileId =
          String(
            story.imageFileId ||
            ""
          ).trim();

        if (
          imageUrl ||
          imageFileId
        ) {
          await deleteStoryImage({
            imageUrl,
            imageFileId,
          });
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
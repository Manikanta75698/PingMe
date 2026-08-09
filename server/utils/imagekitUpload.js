const path = require("path");

let imageKitClient = null;

const getImageKitClient = async () => {
  if (imageKitClient) {
    return imageKitClient;
  }

  const privateKey = String(
    process.env.IMAGEKIT_PRIVATE_KEY || ""
  ).trim();

  if (!privateKey) {
    throw new Error(
      "IMAGEKIT_PRIVATE_KEY is missing"
    );
  }

  const {
    default: ImageKit,
  } = await import(
    "@imagekit/nodejs"
  );

  imageKitClient =
    new ImageKit({
      privateKey,
    });

  return imageKitClient;
};

const uploadImageKitFile =
  async (
    buffer,
    originalName = "image.jpg",
    folder = "/pingme"
  ) => {
    if (
      !Buffer.isBuffer(buffer)
    ) {
      throw new Error(
        "Valid image buffer is required"
      );
    }

    const {
      toFile,
    } = await import(
      "@imagekit/nodejs"
    );

    const client =
      await getImageKitClient();

    const extension =
      path.extname(
        originalName
      ) || ".jpg";

    const safeExtension =
      extension
        .toLowerCase()
        .replace(
          /[^a-z0-9.]/g,
          ""
        );

    const fileName =
      `story-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}${safeExtension}`;

    const file =
      await toFile(
        buffer,
        fileName
      );

    const result =
      await client.files.upload({
        file,
        fileName,
        folder,
        useUniqueFileName: true,
      });

    const url =
      String(
        result?.url || ""
      ).trim();

    const fileId =
      String(
        result?.fileId || ""
      ).trim();

    if (
      !url ||
      !fileId
    ) {
      throw new Error(
        "ImageKit upload did not return a valid URL or file ID"
      );
    }

    return {
      url,
      fileId,
    };
  };

const deleteImageKitFile =
  async (fileId) => {
    const normalizedFileId =
      String(
        fileId || ""
      ).trim();

    if (!normalizedFileId) {
      return;
    }

    const client =
      await getImageKitClient();

    await client.files.delete(
      normalizedFileId
    );
  };

module.exports = {
  uploadImageKitFile,
  deleteImageKitFile,
};
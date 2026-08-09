const getPrivateKey = () => {
  const privateKey = String(
    process.env.IMAGEKIT_PRIVATE_KEY || ""
  ).trim();

  if (!privateKey) {
    throw new Error(
      "IMAGEKIT_PRIVATE_KEY is missing"
    );
  }

  return privateKey;
};

const getAuthorizationHeader = () => {
  const privateKey =
    getPrivateKey();

  return `Basic ${Buffer.from(
    `${privateKey}:`
  ).toString("base64")}`;
};

const sanitizeFileName = (
  value
) => {
  const safeName =
    String(
      value || "image.jpg"
    )
      .trim()
      .replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      );

  return (
    safeName ||
    "image.jpg"
  );
};

/* =========================
   UPLOAD
========================= */

const uploadImageKitFile =
  async (
    buffer,
    originalName = "image.jpg",
    folder = "/pingme"
  ) => {
    if (
      !Buffer.isBuffer(buffer) ||
      buffer.length === 0
    ) {
      throw new Error(
        "Valid image buffer is required"
      );
    }

    const fileName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}-${sanitizeFileName(
          originalName
        )}`;

    const formData =
      new FormData();

    const blob =
      new Blob(
        [buffer],
        {
          type:
            "application/octet-stream",
        }
      );

    formData.append(
      "file",
      blob,
      fileName
    );

    formData.append(
      "fileName",
      fileName
    );

    if (folder) {
      formData.append(
        "folder",
        folder
      );
    }

    formData.append(
      "useUniqueFileName",
      "true"
    );

    const response =
      await fetch(
        "https://upload.imagekit.io/api/v1/files/upload",
        {
          method: "POST",

          headers: {
            Authorization:
              getAuthorizationHeader(),
          },

          body:
            formData,
        }
      );

    const responseText =
      await response.text();

    let result = null;

    try {
      result =
        responseText
          ? JSON.parse(
            responseText
          )
          : {};
    } catch {
      result = {
        message:
          responseText,
      };
    }

    if (!response.ok) {
      console.error(
        "IMAGEKIT UPLOAD HTTP ERROR:",
        {
          status:
            response.status,

          statusText:
            response.statusText,

          requestId:
            response.headers.get(
              "x-request-id"
            ) ||
            response.headers.get(
              "x-ik-requestid"
            ),

          response:
            result,
        }
      );

      throw new Error(
        result?.message ||
        `ImageKit upload failed (${response.status})`
      );
    }

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
        "ImageKit upload returned an invalid response"
      );
    }

    return {
      url,
      fileId,
    };
  };

/* =========================
   DELETE
========================= */

const deleteImageKitFile =
  async (
    fileId
  ) => {
    const normalizedFileId =
      String(
        fileId || ""
      ).trim();

    if (!normalizedFileId) {
      return;
    }

    const response =
      await fetch(
        `https://api.imagekit.io/v1/files/${encodeURIComponent(
          normalizedFileId
        )}`,
        {
          method:
            "DELETE",

          headers: {
            Accept:
              "application/json",

            Authorization:
              getAuthorizationHeader(),
          },
        }
      );

    if (
      response.status === 204
    ) {
      return;
    }

    if (!response.ok) {
      const responseText =
        await response.text();

      console.error(
        "IMAGEKIT DELETE HTTP ERROR:",
        {
          status:
            response.status,

          response:
            responseText,
        }
      );

      throw new Error(
        `ImageKit delete failed (${response.status})`
      );
    }
  };

module.exports = {
  uploadImageKitFile,
  deleteImageKitFile,
};
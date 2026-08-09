let imageKitClient = null;

const getImageKit = async () => {
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

  const { default: ImageKit } =
    await import("@imagekit/nodejs");

  imageKitClient = new ImageKit({
    privateKey,
  });

  return imageKitClient;
};

module.exports = {
  getImageKit,
};
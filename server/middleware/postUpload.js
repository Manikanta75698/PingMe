const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "PingMe/posts",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const postUpload = multer({
  storage,
});

module.exports = postUpload;
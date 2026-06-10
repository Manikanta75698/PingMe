const express = require("express");
const router = express.Router();

const upload = require("../config/multer");

const {
  uploadProfilePic,
} = require("../controllers/userController");

router.put(
  "/upload",
  upload.single("profilePic"),
  uploadProfilePic
);

module.exports = router;
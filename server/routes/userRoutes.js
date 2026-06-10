const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const {
  uploadProfilePic,
} = require("../controllers/userController");

router.put(
  "/upload",
  upload.single("profilePic"),
  uploadProfilePic
);

module.exports = router;
const User = require("../models/User");

const uploadProfilePic = async (req, res) => {
  try {
    console.log("PROFILE FILE:", req.file);
    console.log("BODY:", req.body);

    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        profilePic: req.file.filename,
      },
      {
        new: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Profile picture updated ✅",
      user,
    });

  } catch (error) {
    console.log("PROFILE UPLOAD ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  uploadProfilePic,
};
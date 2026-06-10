const User = require("../models/User");

const uploadProfilePic = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
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

    res.json({
      message: "Profile picture updated ✅",
      user,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  uploadProfilePic,
};
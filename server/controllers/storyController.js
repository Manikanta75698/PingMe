const Story = require("../models/Story");
const uploadImage = require("../utils/cloudinaryUpload");


const createStory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    const image = await uploadImage(
      req.file.buffer,
      "pingme/stories"
    );

    const story = await Story.create({
      user: req.user._id,
      image,
    });

    await story.populate(
      "user",
      "name username profilePic"
    );

    res.status(201).json({
      success: true,
      message: "Story uploaded successfully",
      story,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getStories = async (req, res) => {
  try {
    const stories = await Story.find()
      .populate(
        "user",
        "name username profilePic"
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: stories.length,
      stories,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    if (
      story.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await story.deleteOne();

    res.json({
      success: true,
      message: "Story deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    const alreadyViewed = story.viewers.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push(req.user._id);
      await story.save();
    }

    return res.json({
      success: true,
      message: "Story viewed",
      viewers: story.viewers.length,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createStory,
  getStories,
  deleteStory,
  viewStory,
};
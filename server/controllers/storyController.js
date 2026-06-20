const Story = require("../models/Story");

const createStory = async (req, res) => {
  try {
    const story = await Story.create({
      user: req.user.id,
      image: req.file.path,
    });

    res.status(201).json(story);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getStories = async (
  req,
  res
) => {
  try {

    const stories =
      await Story.find()
        .populate(
          "user",
          "_id name username profilePic"
        )
        .sort({
          createdAt: -1,
        });

    res.json(stories);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

const deleteStory = async (
  req,
  res
) => {

  try {

    const story =
      await Story.findById(
        req.params.id
      );

    if (!story) {

      return res.status(404).json({
        message: "Story not found"
      });

    }

    if (
      story.user.toString() !==
      req.user._id.toString()
    ) {

      return res.status(403).json({
        message: "Not allowed"
      });

    }

    await Story.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message:
        "Story deleted successfully"
    });

  } catch (error) {

    console.log(
      "DELETE STORY ERROR:",
      error.response?.data
    );

    console.log(
      "DELETE STATUS:",
      error.response?.status
    );

    res.status(500).json({
      message:
        "Server Error"
    });

  }

};

module.exports = {
  createStory,
  getStories,
  deleteStory,
};
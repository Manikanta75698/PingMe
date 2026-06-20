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
          "name username profilePic"
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

module.exports = {
  createStory,
  getStories,
};
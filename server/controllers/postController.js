const Post = require("../models/Post");

const createPost = async (req, res) => {
  try {
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "Post image is required",
      });
    }

    const post = await Post.create({
      user: req.user._id,
      image: req.file.path,
      caption: caption?.trim() || "",
    });

    res.status(201).json({
      message: "Post created successfully ✅",
      post,
    });

  } catch (error) {
    console.log("CREATE POST ERROR:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};


const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const alreadyLiked = post.likes.some(
      id => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      return res.status(400).json({
        message: "You already liked this post",
      });
    }

    post.likes.push(userId);

    await post.save();

    res.status(200).json({
      message: "Post liked ❤️",
      likesCount: post.likes.length,
    });

  } catch (error) {
    console.log("LIKE POST ERROR:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const unlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    // Check if user has liked the post
    const alreadyLiked = post.likes.some(
      id => id.toString() === userId.toString()
    );

    if (!alreadyLiked) {
      return res.status(400).json({
        message: "You have not liked this post",
      });
    }

    // Remove user from likes
    post.likes = post.likes.filter(
      id => id.toString() !== userId.toString()
    );

    await post.save();

    res.status(200).json({
      message: "Post unliked 💔",
      likesCount: post.likes.length,
    });

  } catch (error) {
    console.log("UNLIKE POST ERROR:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { text } = req.body;

    // Check comment text
    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    // Find post
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    // Add comment
    post.comments.push({
      user: userId,
      text: text.trim(),
    });

    await post.save();

    res.status(201).json({
      message: "Comment added successfully 💬",
      commentsCount: post.comments.length,
    });

  } catch (error) {
    console.log("ADD COMMENT ERROR:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getPosts = async (req, res) => {
  try {

    const posts = await Post.find()
      .populate(
        "user",
        "name username profilePic"
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      posts,
    });

  } catch (error) {

    console.log(
      "GET POSTS ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });

  }
};


module.exports = {
  createPost,
  likePost,
  unlikePost,
  addComment,
  getPosts,
};
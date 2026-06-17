const Post = require("../models/Post");
const Notification = require("../models/Notification");
const User = require("../models/User");

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


    // Don't notify yourself
    if (
      post.user.toString() !==
      userId.toString()
    ) {

      const notification =
        await Notification.create({

          receiver: post.user,

          sender: userId,

          type: "like",

          post: post._id,

          message: "liked your post ❤️",

        });

      const io = req.app.get("io");

      const getUserSocket =
        req.app.get("getUserSocket");


      const receiverSocket =
        getUserSocket(post.user.toString());


      if (receiverSocket) {

        const senderUser = req.user;


        io.to(receiverSocket).emit(
          "new_notification",
          {

            ...notification.toObject(),

            sender: {

              _id: senderUser._id,

              name: senderUser.name,

              username: senderUser.username,

              profilePic: senderUser.profilePic,

            },

          }
        );

      }

    }

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


    // Don't notify yourself
    if (
      post.user.toString() !==
      userId.toString()
    ) {

      const notification =
        await Notification.create({

          receiver: post.user,

          sender: userId,

          type: "comment",

          post: post._id,

          message: "commented on your post 💬",

        });

      const io = req.app.get("io");

      const getUserSocket =
        req.app.get("getUserSocket");


      const receiverSocket =
        getUserSocket(post.user.toString());


      if (receiverSocket) {

        const senderUser = req.user;


        io.to(receiverSocket).emit(
          "new_notification",
          {

            ...notification.toObject(),

            sender: {

              _id: senderUser._id,

              name: senderUser.name,

              username: senderUser.username,

              profilePic: senderUser.profilePic,

            },

          }
        );

      }

    }

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
      .populate(
        "comments.user",
        "username name profilePic"
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

const getUserPosts = async (req, res) => {
  try {

    const posts = await Post.find({
      user: req.params.id,
    })
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      posts,
    });

  } catch (error) {

    console.log(
      "GET USER POSTS ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const deletePost = async (req, res) => {
  try {

    const post = await Post.findById(
      req.params.id
    );

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (
      post.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    await User.updateMany(
      {},
      {
        $pull: {
          savedPosts: req.params.id,
        },
      }
    );

    await Post.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({
      message: "Post deleted successfully 🗑️",
    });

  } catch (error) {

    console.log(
      "DELETE POST ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });

  }
};

const savePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;

    const user = await User.findById(userId);

    const alreadySaved = user.savedPosts.some(
      (id) => id.toString() === postId
    );

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== postId
      );

      await user.save();

      return res.status(200).json({
        saved: false,
        message: "Post removed from saved",
      });
    }

    user.savedPosts.push(postId);

    await user.save();

    res.status(200).json({
      saved: true,
      message: "Post saved successfully 🔖",
    });
  } catch (error) {
    console.log("SAVE POST ERROR:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: "savedPosts",
        populate: {
          path: "user",
          select: "name username profilePic",
        },
      });

    res.status(200).json({
      posts: user.savedPosts.reverse(),
    });
  } catch (error) {
    console.log("GET SAVED POSTS ERROR:", error);

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
  getUserPosts,
  savePost,
  getSavedPosts,
  deletePost,
};
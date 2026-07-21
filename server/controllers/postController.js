const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const uploadImage = require("../utils/cloudinaryUpload");
const mongoose = require("mongoose");

// Create Post
const createPost = async (req, res) => {
  try {
    const { caption } = req.body;

    let imageUrl = "";

    if (req.file) {
      imageUrl = await uploadImage(
        req.file.buffer,
        "pingme/posts"
      );
    }

    const post = await Post.create({
      user: req.user._id,
      caption,
      image: imageUrl,
    });

    await post.populate("user", "name username profilePic");

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });

  } catch (error) {
    console.error("Create Post Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name username profilePic")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("Get Posts Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET SINGLE POST
// =========================
const getPostById = async (
  req,
  res
) => {
  try {
    const { id: postId } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        postId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
      });
    }

    const post =
      await Post.findById(postId)
        .populate(
          "user",
          "name username profilePic"
        )
        .populate(
          "comments.user",
          "name username profilePic"
        );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error(
      "Get Single Post Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load post",
    });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (
      post.likes.some(
        (id) => id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Already liked",
      });
    }

    post.likes.push(req.user._id);

    if (post.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        sender: req.user._id,
        receiver: post.user,
        post: post._id,
        type: "like",
      });
    }

    await post.save();

    return res.status(200).json({
      success: true,
      likes: post.likes.length,
      liked: true
    })

  } catch (error) {
    console.error("Like Post Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const alreadyLiked = post.likes.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (!alreadyLiked) {
      return res.status(400).json({
        success: false,
        message: "Post not liked yet",
      });
    }

    return res.status(200).json({
      success: true,
      likes: post.likes.length,
      liked: false
    })
  } catch (error) {
    console.error("Unlike Post Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const commentPost = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Comment is required",
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    post.comments.push({
      user: req.user._id,
      text,
    });

    if (post.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        sender: req.user._id,
        receiver: post.user,
        post: post._id,
        type: "comment",
      });
    }

    await post.save();

    await post.populate("comments.user", "name username profilePic");

    return res.status(200).json({
      success: true,
      message: "Comment added successfully",
      comments: post.comments,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// UPDATE POST CAPTION
// =========================
const updatePostCaption = async (
  req,
  res
) => {
  try {
    const { id: postId } =
      req.params;

    const caption =
      typeof req.body?.caption ===
        "string"
        ? req.body.caption.trim()
        : "";

    // =========================
    // VALIDATE POST ID
    // =========================

    if (
      !mongoose.Types.ObjectId.isValid(
        postId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid post ID",
        });
    }

    // =========================
    // CAPTION VALIDATION
    // =========================

    if (caption.length > 2200) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Caption cannot exceed 2200 characters",
        });
    }

    // =========================
    // FIND POST
    // =========================

    const post =
      await Post.findById(
        postId
      );

    if (!post) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Post not found",
        });
    }

    // =========================
    // OWNERSHIP CHECK
    // =========================

    if (
      post.user.toString() !==
      req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "You can edit only your own posts",
        });
    }

    // =========================
    // UPDATE CAPTION
    // =========================

    post.caption = caption;

    await post.save();

    await post.populate(
      "user",
      "name username profilePic"
    );

    // =========================
    // SUCCESS
    // =========================

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Caption updated successfully",
        post,
      });
  } catch (error) {
    console.error(
      "Update Post Caption Error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Unable to update caption",
      });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id: postId } = req.params;

    // =========================
    // VALIDATE POST ID
    // =========================
    if (
      !mongoose.Types.ObjectId.isValid(
        postId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
      });
    }

    // =========================
    // FIND POST
    // =========================
    const post = await Post.findById(
      postId
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // =========================
    // OWNERSHIP CHECK
    // =========================
    if (
      post.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can delete only your own posts",
      });
    }

    // =========================
    // DELETE POST FIRST
    // =========================
    await post.deleteOne();

    // =========================
    // CLEAN SAVED REFERENCES
    // Remove deleted post from
    // every user's savedPosts
    // =========================
    await User.updateMany(
      {
        savedPosts: post._id,
      },
      {
        $pull: {
          savedPosts: post._id,
        },
      }
    );

    // =========================
    // CLEAN NOTIFICATIONS
    // =========================
    await Notification.deleteMany({
      post: post._id,
    });

    // =========================
    // SUCCESS
    // =========================
    return res.status(200).json({
      success: true,
      deletedPostId: post._id,
      message:
        "Post deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Post Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete post",
    });
  }
};



const savePost = async (req, res) => {

  try {
    const { id: postId } = req.params;

    // =========================
    // VALIDATE POST ID
    // =========================
    if (
      !mongoose.Types.ObjectId.isValid(
        postId
      )
    ) {
      return res.status(400).json({
        success: false,
        saved: false,
        message: "Invalid post ID",
      });
    }

    // =========================
    // CHECK POST EXISTS
    // =========================
    const postExists =
      await Post.exists({
        _id: postId,
      });

    if (!postExists) {
      return res.status(404).json({
        success: false,
        saved: false,
        message: "Post not found",
      });
    }

    // =========================

    const user =
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $addToSet: {
            savedPosts: postId,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    // =========================
    // USER NOT FOUND
    // =========================
    if (!user) {
      return res.status(404).json({
        success: false,
        saved: false,
        message: "User not found",
      });
    }

    // =========================
    // SUCCESS
    // =========================
    return res.status(200).json({
      success: true,
      saved: true,
      savedCount:
        user.savedPosts?.length || 0,
      message:
        "Post saved successfully",
    });
  } catch (error) {
    console.error(
      "Save Post Error:",
      error
    );

    return res.status(500).json({
      success: false,
      saved: false,
      message: "Unable to save post",
    });
  }
};

// =========================
// UNSAVE POST
// =========================
const unsavePost = async (req, res) => {
  try {
    const { id: postId } = req.params;

    // =========================
    // VALIDATE POST ID
    // =========================
    if (
      !mongoose.Types.ObjectId.isValid(
        postId
      )
    ) {
      return res.status(400).json({
        success: false,
        saved: false,
        message: "Invalid post ID",
      });
    }

    // =========================
    // ATOMIC UNSAVE
    // $pull removes matching ID
    // safely and idempotently
    // =========================
    const user =
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $pull: {
            savedPosts: postId,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    // =========================
    // USER NOT FOUND
    // =========================
    if (!user) {
      return res.status(404).json({
        success: false,
        saved: false,
        message: "User not found",
      });
    }

    // =========================
    // SUCCESS
    // =========================
    return res.status(200).json({
      success: true,
      saved: false,
      savedCount:
        user.savedPosts?.length || 0,
      message:
        "Post removed from saved",
    });
  } catch (error) {
    console.error(
      "Unsave Post Error:",
      error
    );

    return res.status(500).json({
      success: false,
      saved: false,
      message:
        "Unable to remove saved post",
    });
  }
};
const getUserPosts = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const posts = await Post.find({
      user: user._id,
    })
      .populate("user", "name username profilePic")
      .populate("comments.user", "name username profilePic")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });

  } catch (error) {
    console.error("Get User Posts Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getSavedPosts = async (req, res) => {
  try {
    // =========================
    // GET USER + SAVED POSTS
    // =========================
    const user = await User.findById(
      req.user._id
    ).populate({
      path: "savedPosts",

      populate: {
        path: "user",
        select:
          "name username profilePic",
      },
    });

    // =========================
    // USER NOT FOUND
    // =========================
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // =========================
    // REMOVE NULL POSTS
    // Deleted posts may remain
    // as old ObjectId references
    // =========================
    const validPosts = (
      user.savedPosts || []
    ).filter(Boolean);

    // =========================
    // CLEAN STALE REFERENCES
    // =========================
    if (
      validPosts.length !==
      user.savedPosts.length
    ) {
      user.savedPosts = validPosts.map(
        (post) => post._id
      );

      await user.save();
    }

    // =========================
    // NEWEST SAVED FIRST
    // =========================
    const posts = [
      ...validPosts,
    ].reverse();

    // =========================
    // RESPONSE
    // =========================
    return res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error(
      "Get Saved Posts Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load saved posts",
    });
  }
};

// Get Comments
const getComments = async (req, res) => {
  try {

    const post = await Post.findById(req.params.id)
      .populate(
        "comments.user",
        "name username profilePic"
      );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      count: post.comments.length,
      comments: post.comments,
    });

  } catch (error) {

    console.error("Get Comments Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// =========================
// DELETE COMMENT
// =========================
const deleteComment = async (
  req,
  res
) => {
  try {
    const {
      id: postId,
      commentId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        postId
      ) ||
      !mongoose.Types.ObjectId.isValid(
        commentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid post or comment ID",
      });
    }

    const post =
      await Post.findById(
        postId
      );

    if (!post) {
      return res.status(404).json({
        success: false,
        message:
          "Post not found",
      });
    }

    const comment =
      post.comments.id(
        commentId
      );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message:
          "Comment not found",
      });
    }

    const isCommentOwner =
      comment.user.toString() ===
      req.user._id.toString();

    const isPostOwner =
      post.user.toString() ===
      req.user._id.toString();

    if (
      !isCommentOwner &&
      !isPostOwner
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot delete this comment",
      });
    }

    post.comments.pull(
      commentId
    );

    await post.save();

    await post.populate(
      "comments.user",
      "name username profilePic"
    );

    return res.status(200).json({
      success: true,
      message:
        "Comment deleted successfully",
      deletedCommentId:
        commentId,
      comments:
        post.comments,
    });
  } catch (error) {
    console.error(
      "Delete Comment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete comment",
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  getUserPosts,
  likePost,
  unlikePost,
  commentPost,
  getComments,
  deleteComment,
  updatePostCaption,
  deletePost,
  savePost,
  unsavePost,
  getSavedPosts,
};
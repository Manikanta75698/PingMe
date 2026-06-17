const User = require("../models/User");
const Notification = require("../models/Notification");
const uploadProfilePic = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }


    const user = await User.findByIdAndUpdate(
      userId,
      {
        profilePic: req.file.path,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile picture updated ✅",
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("PROFILE UPLOAD ERROR:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, username, bio } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (name) {
      user.name = name.trim();
    }

    if (username) {
      const formattedUsername = username.toLowerCase().trim();

      const existingUser = await User.findOne({
        username: formattedUsername,
        _id: { $ne: req.user._id },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Username already taken",
        });
      }

      user.username = formattedUsername;
    }

    if (bio !== undefined) {
      user.bio = bio.trim();
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully ✅",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        profilePic: user.profilePic,
      },
    });

  } catch (error) {
    console.log("UPDATE PROFILE ERROR:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const followUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    // User cannot follow himself
    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    // Find both users
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    // Check current user
    if (!currentUser) {
      return res.status(404).json({
        message: "Current user not found",
      });
    }

    // Check target user
    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check already following
    const isFollowing = currentUser.following.some(
      id => id.toString() === targetUserId
    );

    if (isFollowing) {
      return res.status(400).json({
        message: "Already following this user",
      });
    }

    // Update both users
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();
    await Notification.create({

      receiver: targetUserId,

      sender: currentUserId,

      type: "follow",

      message: "started following you 👤",

    });

    const io = req.app.get("io");

    const getUserSocket =
      req.app.get("getUserSocket");


    const receiverSocket =
      getUserSocket(targetUserId.toString());


    if (receiverSocket) {

      io.to(receiverSocket).emit(
        "new_notification",
        {
          type: "follow",
          sender: {
            _id: currentUser._id,
            name: currentUser.name,
            username: currentUser.username,
            profilePic: currentUser.profilePic,
          },
          message:
            "started following you 👤",
        }
      );

    }


    io.emit("profile_updated", {
      userId: req.params.id,
    });

    res.status(200).json({
      message: "User followed successfully ✅",
    });

  } catch (error) {
    console.log("FOLLOW USER ERROR:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    // Cannot unfollow yourself
    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({
        message: "You cannot unfollow yourself",
      });
    }

    // Find both users
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser) {
      return res.status(404).json({
        message: "Current user not found",
      });
    }

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if not following
    const isFollowing = currentUser.following.some(
      id => id.toString() === targetUserId
    );

    if (!isFollowing) {
      return res.status(400).json({
        message: "You are not following this user",
      });
    }

    // Remove from following list
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== targetUserId
    );

    // Remove from followers list
    targetUser.followers = targetUser.followers.filter(
      id => id.toString() !== currentUserId.toString()
    );

    await currentUser.save();
    await targetUser.save();

    const io = req.app.get("io");

    io.emit("profile_updated", {
      userId: req.params.id,
    });

    res.status(200).json({
      message: "User unfollowed successfully ✅",
    });

  } catch (error) {
    console.log("UNFOLLOW USER ERROR:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const searchUsers = async (req, res) => {
  try {

    const keyword = req.query.keyword?.trim();

    if (!keyword) {
      return res.status(400).json({
        message: "Search keyword required",
      });
    }


    const users = await User.find({
      $and: [
        {
          _id: {
            $ne: req.user._id,
          },
        },
        {
          $or: [
            {
              name: {
                $regex: keyword,
                $options: "i",
              },
            },
            {
              username: {
                $regex: keyword,
                $options: "i",
              },
            },
          ],
        },
      ],
    })
      .select(
        "name username profilePic"
      )
      .limit(10);


    res.status(200).json({
      users,
    });

  } catch (error) {

    console.log(
      "SEARCH USERS ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .select(
        "name username bio profilePic followers following isPrivate lastSeen"
      );
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if current user follows this user
    const isFollowing = user.followers.some(
      id => id.toString() === req.user._id.toString()
    );

    const validFollowers = await User.countDocuments({
      _id: { $in: user.followers }
    });

    const validFollowing = await User.countDocuments({
      _id: { $in: user.following }
    });

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        profilePic: user.profilePic,
        followersCount: validFollowers,
        followingCount: validFollowing,
        isPrivate: user.isPrivate,
        lastSeen: user.lastSeen,
        isFollowing,
      },
    });

  } catch (error) {
    console.log(
      "GET PROFILE ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getFollowers = async (req, res) => {
  try {

    const currentUser = await User.findById(
      req.user._id
    );

    const user = await User.findById(req.params.id)
      .populate(
        "followers",
        "name username profilePic"
      );


    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }


    const followers = user.followers.map(
      (follower) => ({

        _id: follower._id,

        name: follower.name,

        username: follower.username,

        profilePic: follower.profilePic,

        isFollowing:
          currentUser.following.some(
            (id) =>
              id.toString() ===
              follower._id.toString()
          ),

      })
    );


    res.status(200).json({
      followers,
    });


  } catch (error) {

    console.log(
      "GET FOLLOWERS ERROR:",
      error
    );


    res.status(500).json({
      message: "Something went wrong",
    });

  }
};


const getFollowing = async (req, res) => {
  try {

    const currentUser = await User.findById(
      req.user._id
    );

    const user = await User.findById(req.params.id)
      .populate(
        "following",
        "name username profilePic"
      );


    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }


    const following = user.following.map(
      (person) => ({

        _id: person._id,

        name: person.name,

        username: person.username,

        profilePic: person.profilePic,

        isFollowing:
          currentUser.following.some(
            (id) =>
              id.toString() ===
              person._id.toString()
          ),

      })
    );


    res.status(200).json({
      following,
    });


  } catch (error) {

    console.log(
      "GET FOLLOWING ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });

  }
};


const getAllUsers = async (req, res) => {

  try {

    const users = await User.find({

      _id: {
        $ne: req.user._id,
      },

    })
      .select(
        "name username profilePic lastSeen"
      );


    res.status(200).json({

      users,

    });

  } catch (error) {

    console.log(
      "GET ALL USERS ERROR:",
      error
    );

    res.status(500).json({

      message:
        "Something went wrong",
    });

  }

};


module.exports = {
  uploadProfilePic,
  updateProfile,
  followUser,
  unfollowUser,
  searchUsers,
  getUserProfile,
  getFollowers,
  getFollowing,
  getAllUsers,
};
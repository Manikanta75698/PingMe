const mongoose = require("mongoose");

const User = require("../models/User");
const FollowRequest = require(
  "../models/FollowRequest"
);

/* =========================
   HELPERS
========================= */

const normalizeId = (value) =>
  value ? String(value) : "";

const escapeRegex = (value = "") =>
  String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

/* =========================
   GET AVAILABLE USERS
========================= */

const getUsers = async (req, res) => {
  try {
    const currentUserId =
      req.user._id;

    const currentUser =
      await User.findById(
        currentUserId
      )
        .select(
          "blockedUsers"
        )
        .lean();

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const usersWhoBlockedMe =
      await User.find({
        blockedUsers:
          currentUserId,
      })
        .select("_id")
        .lean();

    const excludedUserIds = [
      currentUserId,
      ...(
        currentUser.blockedUsers ||
        []
      ),
      ...usersWhoBlockedMe.map(
        (user) => user._id
      ),
    ];

    const users =
      await User.find({
        _id: {
          $nin: excludedUserIds,
        },

        isVerified: true,
      })
        .select(
          [
            "name",
            "username",
            "profilePic",
            "bio",
            "followers",
            "following",
            "privacySettings.privateAccount",
            "isOnline",
            "lastSeen",
          ].join(" ")
        )
        .sort({
          isOnline: -1,
          createdAt: -1,
        })
        .limit(100)
        .lean();

    const safeUsers =
      users.map((user) => ({
        _id: user._id,

        name:
          user.name || "",

        username:
          user.username || "",

        profilePic:
          user.profilePic || "",

        bio:
          user.bio || "",

        isOnline:
          Boolean(user.isOnline),

        lastSeen:
          user.lastSeen || null,

        privateAccount:
          Boolean(
            user.privacySettings
              ?.privateAccount
          ),

        followersCount:
          Array.isArray(
            user.followers
          )
            ? user.followers.length
            : 0,

        followingCount:
          Array.isArray(
            user.following
          )
            ? user.following.length
            : 0,
      }));

    return res.status(200).json({
      success: true,
      count:
        safeUsers.length,
      users: safeUsers,
    });
  } catch (error) {
    console.error(
      "GET USERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load users",
    });
  }
};

/* =========================
   EXPLORE USERS
========================= */

const getExploreUsers =
  async (req, res) => {
    try {
      const currentUserId =
        req.user._id;

      const page = Math.max(
        1,
        Number.parseInt(
          req.query.page,
          10
        ) || 1
      );

      const limit = Math.min(
        30,
        Math.max(
          1,
          Number.parseInt(
            req.query.limit,
            10
          ) || 12
        )
      );

      const skip =
        (page - 1) * limit;

      const search = String(
        req.query.search || ""
      ).trim();

      const currentUser =
        await User.findById(
          currentUserId
        )
          .select(
            [
              "followers",
              "following",
              "blockedUsers",
              "currentMood",
            ].join(" ")
          )
          .lean();

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const usersWhoBlockedMe =
        await User.find({
          blockedUsers:
            currentUserId,
        })
          .select("_id")
          .lean();

      const excludedUserIds = [
        currentUserId,
        ...(
          currentUser.blockedUsers ||
          []
        ),
        ...usersWhoBlockedMe.map(
          (user) => user._id
        ),
      ];

      const query = {
        _id: {
          $nin: excludedUserIds,
        },

        isVerified: true,
      };

      if (search) {
        const safeSearch =
          escapeRegex(search);

        query.$or = [
          {
            name: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            username: {
              $regex: safeSearch,
              $options: "i",
            },
          },
        ];
      }

      const [
        users,
        total,
        pendingRequests,
      ] = await Promise.all([
        User.find(query)
          .select(
            [
              "name",
              "username",
              "profilePic",
              "bio",
              "followers",
              "following",
              "privacySettings.privateAccount",
              "isOnline",
              "lastSeen",
              "currentMood",
              "moodUpdatedAt",
              "createdAt",
            ].join(" ")
          )
          .sort({
            isOnline: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        User.countDocuments(
          query
        ),

        FollowRequest.find({
          sender:
            currentUserId,

          status: "pending",
        })
          .select("receiver")
          .lean(),
      ]);

      const currentFollowingSet =
        new Set(
          (
            currentUser.following ||
            []
          ).map(normalizeId)
        );

      const currentFollowersSet =
        new Set(
          (
            currentUser.followers ||
            []
          ).map(normalizeId)
        );

      const requestedUserMap =
        new Map(
          pendingRequests.map(
            (request) => [
              normalizeId(
                request.receiver
              ),
              normalizeId(
                request._id
              ),
            ]
          )
        );

      const exploreUsers =
        users.map((user) => {
          const userId =
            normalizeId(
              user._id
            );

          const userFollowers =
            Array.isArray(
              user.followers
            )
              ? user.followers
              : [];

          const mutualFollowersCount =
            userFollowers.reduce(
              (
                count,
                followerId
              ) =>
                currentFollowingSet.has(
                  normalizeId(
                    followerId
                  )
                )
                  ? count + 1
                  : count,
              0
            );

          const isFollowing =
            currentFollowingSet.has(
              userId
            );

          const followsYou =
            currentFollowersSet.has(
              userId
            );

          const requestId =
            requestedUserMap.get(
              userId
            ) || "";

          const isRequested =
            Boolean(requestId);

          let relationshipStatus =
            "none";

          if (isFollowing) {
            relationshipStatus =
              "following";
          } else if (isRequested) {
            relationshipStatus =
              "requested";
          } else if (followsYou) {
            relationshipStatus =
              "follows_you";
          }

          return {
            _id: user._id,

            name:
              user.name || "",

            username:
              user.username || "",

            profilePic:
              user.profilePic || "",

            bio:
              user.bio || "",

            isOnline:
              Boolean(
                user.isOnline
              ),

            lastSeen:
              user.lastSeen ||
              null,

            privateAccount:
              Boolean(
                user
                  .privacySettings
                  ?.privateAccount
              ),

            followersCount:
              userFollowers.length,

            followingCount:
              Array.isArray(
                user.following
              )
                ? user
                  .following
                  .length
                : 0,

            mutualFollowersCount,

            relationshipStatus,

            requestId:
              isRequested
                ? requestId
                : null,

            currentMood:
              user.currentMood || "",

            moodUpdatedAt:
              user.moodUpdatedAt || null,

            sameMood:
              Boolean(
                currentUser.currentMood &&
                user.currentMood ===
                currentUser.currentMood
              ),

            followsYou,
          };
        });

     exploreUsers.sort(
  (first, second) => {
    
    if (
      second.sameMood !==
      first.sameMood
    ) {
      return (
        Number(second.sameMood) -
        Number(first.sameMood)
      );
    }

    if (
      first.sameMood &&
      second.sameMood
    ) {
      const firstMoodTime =
        first.moodUpdatedAt
          ? new Date(
              first.moodUpdatedAt
            ).getTime()
          : 0;

      const secondMoodTime =
        second.moodUpdatedAt
          ? new Date(
              second.moodUpdatedAt
            ).getTime()
          : 0;

      if (
        secondMoodTime !==
        firstMoodTime
      ) {
        return (
          secondMoodTime -
          firstMoodTime
        );
      }
    }

    if (
      second.mutualFollowersCount !==
      first.mutualFollowersCount
    ) {
      return (
        second.mutualFollowersCount -
        first.mutualFollowersCount
      );
    }

    if (
      second.isOnline !==
      first.isOnline
    ) {
      return (
        Number(second.isOnline) -
        Number(first.isOnline)
      );
    }

    return first.name.localeCompare(
      second.name
    );
  }
);

      const totalPages =
        Math.ceil(
          total / limit
        );

      return res.status(200).json({
        success: true,

        count:
          exploreUsers.length,

        users:
          exploreUsers,

        pagination: {
          page,
          limit,
          total,
          totalPages,

          hasMore:
            page < totalPages,
        },
      });
    } catch (error) {
      console.error(
        "GET EXPLORE USERS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load explore users",
      });
    }
  };

module.exports = {
  getUsers,
  getExploreUsers,
};
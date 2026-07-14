const mongoose =
  require("mongoose");

const Notification =
  require("../models/Notification");

/* =========================
   GET NOTIFICATIONS
========================= */

const getNotifications = async (
  req,
  res
) => {
  try {
    const currentUserId =
      req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const notifications =
      await Notification.find({
        receiver: currentUserId,
      })
        .populate(
          "sender",
          "name username profilePic"
        )
        .populate(
          "post",
          "image caption"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    const unreadCount =
      notifications.reduce(
        (
          total,
          notification
        ) =>
          notification?.isRead
            ? total
            : total + 1,
        0
      );

    return res.status(200).json({
      success: true,
      count:
        notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error(
      "GET NOTIFICATIONS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load notifications",
    });
  }
};

/* =========================
   MARK NOTIFICATION AS READ
========================= */

const markAsRead = async (
  req,
  res
) => {
  try {
    const currentUserId =
      req.user?._id;

    const notificationId =
      String(
        req.params?.id || ""
      ).trim();

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !notificationId ||
      !mongoose.Types.ObjectId.isValid(
        notificationId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notification ID",
      });
    }

    /*
     * Current user ki belong ayye
     * notification matrame update avutundi.
     */
    const notification =
      await Notification
        .findOneAndUpdate(
          {
            _id: notificationId,
            receiver:
              currentUserId,
          },
          {
            $set: {
              isRead: true,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        )
        .populate(
          "sender",
          "name username profilePic"
        )
        .populate(
          "post",
          "image caption"
        );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error(
      "MARK NOTIFICATION READ ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update notification",
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
};
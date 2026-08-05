const mongoose =
  require("mongoose");

const Notification =
  require("../models/Notification");

const {
  getIO,
} = require("../socket/socketInstance");

/* =========================
   NORMALIZE USER ID
========================= */

const normalizeUserId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value).trim();
  }

  if (
    typeof value?.toHexString ===
    "function"
  ) {
    return String(
      value.toHexString()
    ).trim();
  }

  return String(
    value?._id ||
    value?.id ||
    ""
  ).trim();
};

/* =========================
   GET NOTIFICATIONS
========================= */

const getNotifications = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeUserId(
        req.user
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authentication required",
        });
    }

    const [
      notifications,
      unreadCount,
    ] = await Promise.all([
      Notification.find({
        receiver:
          currentUserId,
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
        .lean(),

      Notification.countDocuments({
        receiver:
          currentUserId,

        isRead:
          false,
      }),
    ]);

    return res
      .status(200)
      .json({
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

    return res
      .status(500)
      .json({
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
      normalizeUserId(
        req.user
      );

    const notificationId =
      String(
        req.params?.id ||
        ""
      ).trim();

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authentication required",
        });
    }

    if (
      !notificationId ||
      !mongoose.isValidObjectId(
        notificationId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid notification ID",
        });
    }

    /*
     * isRead:false condition వల్ల
     * unread → read transition matrame
     * atomic ga update avuthundi.
     */
    let notification =
      await Notification
        .findOneAndUpdate(
          {
            _id:
              notificationId,

            receiver:
              currentUserId,

            isRead:
              false,
          },
          {
            $set: {
              isRead:
                true,
            },
          },
          {
            returnDocument: "after",

            runValidators:
              true,
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

    let wasUpdated =
      Boolean(notification);

    /*
     * Notification already read ayithe
     * first query null return chesthundi.
     * Document actually exists aa leda
     * separate ga verify chestham.
     */
    if (!notification) {
      notification =
        await Notification
          .findOne({
            _id:
              notificationId,

            receiver:
              currentUserId,
          })
          .populate(
            "sender",
            "name username profilePic"
          )
          .populate(
            "post",
            "image caption"
          );

      if (!notification) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Notification not found",
          });
      }

      wasUpdated =
        false;
    }

    /*
     * Exact DB unread count.
     * Client side guess/decrement badulu
     * source-of-truth count return chestham.
     */
    const unreadCount =
      await Notification
        .countDocuments({
          receiver:
            currentUserId,

          isRead:
            false,
        });

    /* =========================
       SOCKET SYNC
    ========================= */

    try {
      const io =
        getIO();

      /*
       * Activity list lo notification
       * read style update kosam.
       */
      io.to(
        currentUserId
      ).emit(
        "notificationRead",
        {
          notificationId,

          isRead:
            true,

          wasUpdated,

          unreadCount,
        }
      );

      /*
       * action:set idempotent.
       * Same browser local update +
       * socket event వచ్చినా exact count
       * matrame set avuthundi.
       */
      io.to(
        currentUserId
      ).emit(
        "notificationBadgeUpdated",
        {
          action:
            "set",

          count:
            unreadCount,

          unreadCount,

          notificationId,
        }
      );
    } catch (
    socketError
    ) {
      console.error(
        "NOTIFICATION READ SOCKET ERROR:",
        socketError?.message ||
        socketError
      );
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          wasUpdated
            ? "Notification marked as read"
            : "Notification was already read",

        wasUpdated,

        unreadCount,

        notification,
      });
  } catch (error) {
    console.error(
      "MARK NOTIFICATION READ ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to update notification",
      });
  }
};

/* =========================
   MARK ALL NOTIFICATIONS READ
========================= */

const markAllAsRead = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeUserId(
        req.user
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authentication required",
        });
    }

    /*
     * Current user ki unread ga unna
     * notifications matrame update chestham.
     */
    const updateResult =
      await Notification
        .updateMany(
          {
            receiver:
              currentUserId,

            isRead:
              false,
          },
          {
            $set: {
              isRead:
                true,
            },
          }
        );

    /*
     * DB source-of-truth unread count.
     */
    const unreadCount =
      await Notification
        .countDocuments({
          receiver:
            currentUserId,

          isRead:
            false,
        });

    /* =========================
       SOCKET SYNC
    ========================= */

    try {
      const io =
        getIO();

      /*
       * Open Activity pages lo local
       * notification list read style
       * update cheyyadaniki.
       */
      io.to(
        currentUserId
      ).emit(
        "allNotificationsRead",
        {
          unreadCount,

          modifiedCount:
            updateResult
              ?.modifiedCount ||
            0,
        }
      );

      /*
       * Header/sidebar/mobile badge
       * exact count sync.
       */
      io.to(
        currentUserId
      ).emit(
        "notificationBadgeUpdated",
        {
          action:
            "set",

          count:
            unreadCount,

          unreadCount,
        }
      );
    } catch (
    socketError
    ) {
      console.error(
        "MARK ALL NOTIFICATIONS READ SOCKET ERROR:",
        socketError?.message ||
        socketError
      );
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          "All notifications marked as read",

        modifiedCount:
          updateResult
            ?.modifiedCount ||
          0,

        unreadCount,
      });
  } catch (error) {
    console.error(
      "MARK ALL NOTIFICATIONS READ ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to update notifications",
      });
  }
};


/* =========================
   MARK LIKE NOTIFICATIONS READ
========================= */

const markLikesAsRead = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeUserId(
        req.user
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Authentication required",
        });
    }

    const updateResult =
      await Notification
        .updateMany(
          {
            receiver:
              currentUserId,

            type:
              "like",

            isRead:
              false,
          },
          {
            $set: {
              isRead:
                true,
            },
          }
        );

    const unreadCount =
      await Notification
        .countDocuments({
          receiver:
            currentUserId,

          isRead:
            false,
        });

    try {
      const io =
        getIO();

      io.to(
        currentUserId
      ).emit(
        "likeNotificationsRead",
        {
          unreadCount,

          modifiedCount:
            updateResult
              ?.modifiedCount ||
            0,
        }
      );

      io.to(
        currentUserId
      ).emit(
        "notificationBadgeUpdated",
        {
          action:
            "set",

          count:
            unreadCount,

          unreadCount,
        }
      );
    } catch (socketError) {
      console.error(
        "MARK LIKES READ SOCKET ERROR:",
        socketError?.message ||
        socketError
      );
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Like notifications marked as read",

        modifiedCount:
          updateResult
            ?.modifiedCount ||
          0,

        unreadCount,
      });
  } catch (error) {
    console.error(
      "MARK LIKES READ ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to update like notifications",
      });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  markLikesAsRead,
};

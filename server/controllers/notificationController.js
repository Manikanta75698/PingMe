const Notification = require("../models/Notification");


const getNotifications = async (req, res) => {

  try {

    const notifications =
      await Notification.find({

        receiver: req.user._id,

      })

        .populate(
          "sender",
          "name username profilePic"
        )

        .sort({
          createdAt: -1,
        });


    res.status(200).json({

      notifications,

    });


  } catch (error) {


    console.log(
      "GET NOTIFICATIONS ERROR:",
      error
    );


    res.status(500).json({

      message:
        "Something went wrong",

    });

  }

};

const markNotificationsAsRead = async (req, res) => {

  try {

    await Notification.updateMany(

      {
        receiver: req.user._id,
        isRead: false,
      },

      {
        isRead: true,
      }

    );


    res.status(200).json({

      message:
        "Notifications marked as read",

    });

  } catch (error) {


    console.log(
      "MARK NOTIFICATION ERROR:",
      error
    );


    res.status(500).json({

      message:
        "Something went wrong",

    });

  }

};


module.exports = {
  getNotifications,
  markNotificationsAsRead,
};
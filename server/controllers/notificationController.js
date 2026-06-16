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


module.exports = {

  getNotifications,

};
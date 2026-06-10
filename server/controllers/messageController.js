const Message = require("../models/Message");

const sendMessage = async (req, res) => {
  try {
     console.log("BODY:", req.body);
    const { sender, receiver, text } =
      req.body;
     

   const message = await Message.create({
  sender,
  receiver,
  text,
  status: "delivered",
});
console.log("SAVED:", message);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
     console.log("ERROR:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

const markAsSeen = async (req, res) => {
  try {
    const { sender, receiver } = req.body;

    await Message.updateMany(
      {
        sender,
        receiver,
        status: "delivered",
      },
      {
        status: "seen",
      }
    );

    res.json({
      message: "Messages marked as seen",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markAsSeen,
};
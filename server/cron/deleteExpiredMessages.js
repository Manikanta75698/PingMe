const cron = require("node-cron");
const Message = require("../models/Message");

const {
  getIO,
  getSocketId,
} = require("../socket/socketInstance");

const startDeleteExpiredMessages = () => {
  cron.schedule("*/1 * * * *", async () => {
    try {
      const io = getIO();

      const expired = await Message.find({
        createdAt: {
          $lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      for (const msg of expired) {
        const senderSocket = getSocketId(msg.sender.toString());
        const receiverSocket = getSocketId(msg.receiver.toString());

        if (senderSocket) {
          io.to(senderSocket).emit(
            "messageDeleted",
            msg._id.toString()
          );
        }

        if (receiverSocket) {
          io.to(receiverSocket).emit(
            "messageDeleted",
            msg._id.toString()
          );
        }
      }

      await Message.deleteMany({
        createdAt: {
          $lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

    } catch (err) {
      console.log("Cron Error:", err);
    }
  });
};

module.exports = startDeleteExpiredMessages;
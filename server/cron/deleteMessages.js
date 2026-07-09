const cron = require("node-cron");

const Message = require("../models/Message");

const {
  getIO,
  getSocketId,
} = require("../socket/socketInstance");

// Every minute run avthundi
cron.schedule("* * * * *", async () => {
  try {
    const io = getIO();

    const expiryTime = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    );

    const expiredMessages = await Message.find({
      createdAt: {
        $lt: expiryTime,
      },
    });

    if (!expiredMessages.length) return;

    for (const message of expiredMessages) {
      const senderSocket = getSocketId(
        message.sender.toString()
      );

      const receiverSocket = getSocketId(
        message.receiver.toString()
      );

      if (senderSocket) {
        io.to(senderSocket).emit(
          "messageDeleted",
          message._id
        );
      }

      if (receiverSocket) {
        io.to(receiverSocket).emit(
          "messageDeleted",
          message._id
        );
      }
    }

    await Message.deleteMany({
      createdAt: {
        $lt: expiryTime,
      },
    });

    console.log(
      `🗑 Deleted ${expiredMessages.length} expired messages`
    );

  } catch (err) {
    console.log("Cron Error:", err);
  }
});
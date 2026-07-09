const cron = require("node-cron");
const Message = require("../models/Message");
const {
  getIO,
  getSocketId,
} = require("../socket/socketInstance");

cron.schedule("*/5 * * * *", async () => {
  try {
    const io = getIO();

    const limit = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expired = await Message.find({
      createdAt: { $lt: limit },
    });

    expired.forEach((msg) => {
      const sender = getSocketId(msg.sender.toString());
      const receiver = getSocketId(msg.receiver.toString());

      if (sender) {
        io.to(sender).emit("messageDeleted", msg._id);
      }

      if (receiver) {
        io.to(receiver).emit("messageDeleted", msg._id);
      }
    });

    await Message.deleteMany({
      createdAt: { $lt: limit },
    });

    console.log("Expired messages cleaned");
  } catch (err) {
    console.log(err);
  }
});
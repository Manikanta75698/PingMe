import { useEffect, useRef } from "react";

import styles from "./MessageList.module.css";

import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

import MessageBubble from "./MessageBubble";

const MessageList = () => {
  const {
    messages,
    socket,
  } = useChat();

  const { user } = useAuth();

  const bottomRef = useRef(null);

  const currentUserId =
    user?._id ||
    user?.id ||
    JSON.parse(localStorage.getItem("user"))?._id ||
    JSON.parse(localStorage.getItem("user"))?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!messages.length) return;

    messages.forEach((message) => {
      const receiverId =
        typeof message.receiver === "object"
          ? message.receiver._id
          : message.receiver;

      if (
        receiverId === currentUserId &&
        message.status !== "seen"
      ) {
        console.log("EMIT SEEN:", message._id);

        socket.emit("messageSeen", {
          messageId: message._id,
        });
      }
    });

  }, [messages, socket, currentUserId]);

  if (!messages.length) {
    return (
      <div className={styles.empty}>
        <p>No messages yet.</p>
        <span>Start the conversation 👋</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {messages.map((message) => {
        const senderId =
          typeof message.sender === "object"
            ? message.sender?._id
            : message.sender;

        return (
          <MessageBubble
            key={message._id}
            message={message}
            isOwn={senderId === currentUserId}
          />
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
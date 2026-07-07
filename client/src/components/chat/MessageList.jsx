import { useEffect, useRef } from "react";
import styles from "./MessageList.module.css";

import { useChat } from "../../context/ChatContext";
import MessageBubble from "./MessageBubble";

const MessageList = () => {
  const { messages } = useChat();

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      {messages.map((message) => (
        <MessageBubble
          key={message._id}
          message={message}
          isOwn={
            message.sender?._id === currentUser.id ||
            message.sender === currentUser.id
          }
        />
      ))}

      {/* AUTO SCROLL TARGET */}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
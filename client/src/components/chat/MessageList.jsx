import { useEffect, useMemo, useRef } from "react";

import styles from "./MessageList.module.css";

import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

import MessageBubble from "./MessageBubble";

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value?._id || value?.id || "");
  }

  return String(value);
};

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error
    );

    return null;
  }
};

const MessageList = () => {
  const {
    messages,
    socket,
  } = useChat();

  const { user } = useAuth();

  const bottomRef = useRef(null);

  const storedUser = useMemo(
    () => getStoredUser(),
    []
  );

  const currentUserId = normalizeId(
    user?._id ||
    user?.id ||
    storedUser?._id ||
    storedUser?.id
  );

  const safeMessages = Array.isArray(messages)
    ? messages
    : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [safeMessages.length]);

  useEffect(() => {
    if (
      !currentUserId ||
      safeMessages.length === 0 ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    safeMessages.forEach((message) => {
      const messageId = normalizeId(message?._id);

      const receiverId = normalizeId(
        message?.receiver
      );

      const senderId = normalizeId(
        message?.sender
      );

      const isReceivedMessage =
        receiverId === currentUserId &&
        senderId !== currentUserId;

      const shouldMarkAsRead =
        messageId &&
        !messageId.startsWith("temp-") &&
        isReceivedMessage &&
        message?.status !== "read";

      if (shouldMarkAsRead) {
        socket.emit("messageRead", {
          messageId,
        });
      }
    });
  }, [
    safeMessages,
    socket,
    currentUserId,
  ]);

  if (safeMessages.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyContent}>
          <h3>No messages yet</h3>

          <p>
            Start the conversation with a message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.messagesInner}>
        {safeMessages.map((message) => {
          const messageId = normalizeId(
            message?._id
          );

          const senderId = normalizeId(
            message?.sender
          );

          return (
            <MessageBubble
              key={messageId}
              message={message}
              isOwn={
                senderId === currentUserId
              }
            />
          );
        })}

        <div
          ref={bottomRef}
          className={styles.bottomAnchor}
        />
      </div>
    </div>
  );
};

export default MessageList;
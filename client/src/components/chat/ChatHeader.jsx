import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import styles from "./ChatHeader.module.css";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  useChat,
} from "../../context/ChatContext";

const normalizeId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(
      value?._id ||
      value?.id ||
      value?.userId ||
      ""
    );
  }

  return String(value);
};

const ChatHeader = () => {
  const navigate = useNavigate();

  const {
    selectedChat,
    onlineUsers,
    typingUser,
    setSelectedChat,
  } = useChat();

  if (!selectedChat) {
    return (
      <header className={styles.header}>
        <h2 className={styles.empty}>
          Select a chat
        </h2>
      </header>
    );
  }

  const selectedChatId =
    normalizeId(selectedChat);

  const isOnline =
    Array.isArray(onlineUsers) &&
    onlineUsers.some(
      (onlineUser) =>
        normalizeId(onlineUser) ===
        selectedChatId
    );

  const isTyping =
    normalizeId(typingUser) ===
    selectedChatId;

  const displayName =
    selectedChat?.name?.trim() ||
    selectedChat?.username?.trim() ||
    "User";

  const profilePicture =
    selectedChat?.profilePic ||
    DefaultAvatar;

  const statusText = isTyping
    ? "Typing..."
    : isOnline
      ? "Online"
      : "Offline";

  const handleBack = () => {
    setSelectedChat(null);

    navigate("/chat", {
      replace: true,
    });
  };

  const handleAvatarError = (
    event
  ) => {
    const image =
      event.currentTarget;

    if (
      image.src.endsWith(
        DefaultAvatar
      )
    ) {
      return;
    }

    image.onerror = null;
    image.src = DefaultAvatar;
  };

  return (
    <header
      className={styles.header}
      aria-label={`Chat with ${displayName}`}
    >
      <div className={styles.left}>
        <button
          type="button"
          className={
            styles.backButton
          }
          onClick={handleBack}
          aria-label="Back to chats"
        >
          <ArrowLeft
            size={24}
            aria-hidden="true"
          />
        </button>

        <div
          className={
            styles.avatarWrapper
          }
        >
          <img
            src={profilePicture}
            alt={`${displayName} profile`}
            className={
              styles.avatar
            }
            loading="eager"
            decoding="async"
            onError={
              handleAvatarError
            }
          />

          {isOnline && (
            <span
              className={
                styles.onlineDot
              }
              role="status"
              aria-label={`${displayName} is online`}
              title="Online"
            />
          )}
        </div>

        <div className={styles.info}>
          <h2 className={styles.name}>
            {displayName}
          </h2>

          <p
            className={`${styles.status} ${isTyping
                ? styles.typing
                : ""
              }`}
            aria-live="polite"
          >
            {statusText}
          </p>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import styles from "./ChatHeader.module.css";
import DefaultAvatar from "../../assets/default-avatar.png";

import { useChat } from "../../context/ChatContext";

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value?._id || value?.id || "");
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
      <div className={styles.header}>
        <h2 className={styles.empty}>
          Select a chat
        </h2>
      </div>
    );
  }

  const selectedChatId =
    normalizeId(selectedChat);

  const isOnline = Array.isArray(onlineUsers)
    ? onlineUsers.some(
      (onlineUser) =>
        normalizeId(onlineUser) ===
        selectedChatId
    )
    : false;

  const isTyping =
    normalizeId(typingUser) ===
    selectedChatId;

  const displayName =
    selectedChat?.name ||
    selectedChat?.username ||
    "User";

  const handleBack = () => {
    setSelectedChat(null);
    navigate("/chat");
  };

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label="Back to chats"
        >
          <ArrowLeft size={24} />
        </button>

        <div className={styles.avatarWrapper}>
          <img
            src={
              selectedChat?.profilePic ||
              DefaultAvatar
            }
            alt={displayName}
            className={styles.avatar}
            loading="eager"
            decoding="async"
            onError={(event) => {
              event.currentTarget.src =
                DefaultAvatar;
            }}
          />

          {isOnline && (
            <span
              className={styles.onlineDot}
              aria-label="Online"
            />
          )}
        </div>

        <div className={styles.info}>
          <h2 className={styles.name}>
            {displayName}
          </h2>

          <p className={styles.status}>
            {isTyping
              ? "Typing..."
              : isOnline
                ? "Online"
                : "Offline"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
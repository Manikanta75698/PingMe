import styles from "./ChatHeader.module.css";
import DefaultAvatar from "../../assets/default-avatar.png";
import { useChat } from "../../context/ChatContext";

const ChatHeader = () => {
  const {
    selectedChat,
    onlineUsers,
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

  const isOnline = onlineUsers.includes(
    selectedChat._id
  );

  return (
    <div className={styles.header}>

      <div className={styles.left}>

        <div className={styles.avatarWrapper}>

          <img
            src={selectedChat.profilePic || DefaultAvatar}
            alt={selectedChat.name}
            className={styles.avatar}
            onError={(e) => {
              e.target.src = DefaultAvatar;
            }}
          />

          {isOnline && (
            <span className={styles.onlineDot}></span>
          )}

        </div>

        <div className={styles.info}>

          <h2 className={styles.name}>
            {selectedChat.name}
          </h2>

          <p className={styles.status}>
            {typingUser === selectedChat._id
              ? "typing..."
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
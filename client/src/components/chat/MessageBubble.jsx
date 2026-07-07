import styles from "./MessageBubble.module.css";

const MessageBubble = ({ message, isOwn }) => {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={
        isOwn ? styles.ownWrapper : styles.otherWrapper
      }
    >
      <div
        className={
          isOwn ? styles.ownBubble : styles.otherBubble
        }
      >
        {message.image && (
          <img
            src={message.image}
            alt="Message"
            className={styles.image}
          />
        )}

        {message.text && (
          <p className={styles.text}>
            {message.text}
          </p>
        )}

        <div className={styles.footer}>
          <span className={styles.time}>
            {time}
          </span>

          {isOwn && (
            <span className={styles.status}>
              {message.status === "sent" && "✓"}
              {message.status === "delivered" && "✓✓"}
              {message.status === "seen" && (
                <span style={{ color: "#3b82f6" }}>✓✓</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
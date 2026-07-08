import styles from "./MessageBubble.module.css";

const MessageBubble = ({ message, isOwn }) => {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={
        isOwn
          ? styles.ownWrapper
          : styles.otherWrapper
      }
    >
      <div
        className={`${styles.bubble} ${isOwn
          ? styles.ownBubble
          : styles.otherBubble
          }`}
      >
        {message.image && (
          <img
            src={message.image}
            alt=""
            className={styles.image}
          />
        )}

        {message.text && (
          <p className={styles.text}>
            {message.text}
          </p>
        )}

        <div className={styles.meta}>
          <span>{time}</span>

          {isOwn && (
            <span className={styles.status}>
              {message.status === "sending" && "🕒"}

              {message.status === "sent" && "✓"}

              {message.status === "delivered" && "✓✓"}

              {message.status === "seen" && (
                <span className={styles.seen}>✓✓</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
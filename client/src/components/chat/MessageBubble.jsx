import styles from "./MessageBubble.module.css";

import {
  Clock3,
  Check,
  CheckCheck,
} from "lucide-react";

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
              {
                message.status === "sending" ? (
                  <Clock3 size={14} />
                ) : message.status === "sent" ? (
                  <Check size={14} />
                ) : message.status === "delivered" ? (
                  <CheckCheck size={14} />
                ) : (
                  <span className={styles.seen}>Seen</span>
                )
              }
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
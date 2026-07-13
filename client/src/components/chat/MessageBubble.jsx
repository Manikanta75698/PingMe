import {
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./MessageBubble.module.css";
import DeleteMessageModal from "./DeleteMessageModal";

import {
  Clock3,
  Check,
  CheckCheck,
  Reply,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

import {
  deleteMessage,
} from "../../services/chatService";

const formatTime = (dateValue) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MessageBubble = ({
  message,
  isOwn,
  onReply,
}) => {
  const [showActions, setShowActions] =
    useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  const pressTimerRef = useRef(null);

  const time = formatTime(
    message?.createdAt
  );

  const repliedMessage =
    message?.replyTo;

  const repliedSenderName =
    repliedMessage?.sender?.name ||
    repliedMessage?.sender?.username ||
    "User";

  const repliedText =
    repliedMessage?.text?.trim() ||
    (repliedMessage?.image
      ? "Photo"
      : "Original message unavailable");

  const canReply =
    Boolean(message?._id) &&
    !String(message._id).startsWith(
      "temp-"
    );

  const handleReply = () => {
    if (
      canReply &&
      typeof onReply === "function"
    ) {
      onReply(message);
    }
  };

  // Delete button click chesinappudu
  // custom popup open avutundi.
  const handleDelete = () => {
    if (
      !isOwn ||
      !canReply ||
      deleting
    ) {
      return;
    }

    setShowActions(false);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  // Popup lo Delete confirm chesinappudu
  // API request run avutundi.
  const confirmDelete = async () => {
    if (
      !message?._id ||
      deleting
    ) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteMessage(
        message._id
      );

      setShowDeleteModal(false);
    } catch (error) {
      console.error(
        "DELETE MESSAGE ERROR:",
        error.response?.data ||
        error.message
      );

      setDeleteError(
        error.response?.data?.message ||
        "Unable to delete this message. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleting) return;

    setShowDeleteModal(false);
    setDeleteError("");
  };

  const startLongPress = () => {
    if (!canReply) return;

    pressTimerRef.current =
      window.setTimeout(() => {
        setShowActions(true);
      }, 500);
  };

  const cancelLongPress = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(
        pressTimerRef.current
      );

      pressTimerRef.current = null;
    }
  };

  const handleContextMenu = (
    event
  ) => {
    event.preventDefault();

    if (canReply) {
      setShowActions(true);
    }
  };

  useEffect(() => {
    return () => {
      cancelLongPress();
    };
  }, []);

  return (
    <>
      <div
        className={
          isOwn
            ? styles.ownWrapper
            : styles.otherWrapper
        }
      >
        <div
          className={styles.messageGroup}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          onTouchCancel={cancelLongPress}
          onContextMenu={
            handleContextMenu
          }
        >
          <button
            type="button"
            className={styles.replyButton}
            onClick={handleReply}
            aria-label="Reply to message"
            disabled={!canReply}
          >
            <Reply size={17} />
          </button>

          <div
            className={`${styles.bubble} ${isOwn
                ? styles.ownBubble
                : styles.otherBubble
              }`}
          >
            {repliedMessage && (
              <div
                className={
                  styles.replyPreview
                }
              >
                <span
                  className={
                    styles.replySender
                  }
                >
                  {repliedSenderName}
                </span>

                <div
                  className={
                    styles.replyContent
                  }
                >
                  {repliedMessage?.image && (
                    <ImageIcon
                      size={13}
                      className={
                        styles.replyIcon
                      }
                    />
                  )}

                  <span
                    className={
                      styles.replyText
                    }
                  >
                    {repliedText}
                  </span>
                </div>
              </div>
            )}

            {message?.image && (
              <img
                src={message.image}
                alt="Message attachment"
                className={styles.image}
                loading="lazy"
                decoding="async"
              />
            )}

            {message?.text && (
              <p className={styles.text}>
                {message.text}
              </p>
            )}

            <div className={styles.meta}>
              <span>{time}</span>

              {isOwn && (
                <span
                  className={
                    styles.status
                  }
                >
                  {message?.status ===
                    "sending" && (
                      <Clock3 size={14} />
                    )}

                  {message?.status ===
                    "sent" && (
                      <Check size={14} />
                    )}

                  {message?.status ===
                    "delivered" && (
                      <CheckCheck
                        size={14}
                      />
                    )}

                  {message?.status ===
                    "read" && (
                      <span
                        className={
                          styles.seen
                        }
                      >
                        Seen
                      </span>
                    )}

                  {[
                    "sending",
                    "sent",
                    "delivered",
                    "read",
                  ].includes(
                    message?.status
                  ) === false && (
                      <Check size={14} />
                    )}
                </span>
              )}
            </div>
          </div>

          {showActions && (
            <>
              <button
                type="button"
                className={
                  styles.actionBackdrop
                }
                onClick={() =>
                  setShowActions(false)
                }
                aria-label="Close message actions"
              />

              <div
                className={
                  styles.actionMenu
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    handleReply();
                    setShowActions(false);
                  }}
                >
                  <Reply size={17} />
                  <span>Reply</span>
                </button>

                {isOwn && (
                  <button
                    type="button"
                    className={
                      styles.deleteAction
                    }
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 size={17} />

                    <span>Delete</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <DeleteMessageModal
        open={showDeleteModal}
        loading={deleting}
        error={deleteError}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default MessageBubble;
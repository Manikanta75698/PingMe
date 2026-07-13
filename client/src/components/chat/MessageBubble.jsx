import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Clock3,
  Check,
  CheckCheck,
  MoreVertical,
  Image as ImageIcon,
} from "lucide-react";

import styles from "./MessageBubble.module.css";

import DeleteMessageModal from "./DeleteMessageModal";
import MessageActionsMenu from "./MessageActionsMenu";

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

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [isDeleted, setIsDeleted] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  const pressTimerRef = useRef(null);
  const optionsButtonRef = useRef(null);

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

  const canUseActions =
    Boolean(message?._id) &&
    !String(message._id).startsWith(
      "temp-"
    );

  const handleReply = () => {
    if (
      !canUseActions ||
      typeof onReply !== "function"
    ) {
      return;
    }

    setShowActions(false);
    onReply(message);
  };

  const handleDelete = () => {
    if (
      !isOwn ||
      !canUseActions
    ) {
      return;
    }

    setShowActions(false);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!message?._id) {
      return;
    }

    setShowDeleteModal(false);
    setShowActions(false);
    setDeleteError("");

    // Instant optimistic UI removal
    setIsDeleted(true);

    deleteMessage(message._id).catch(
      (error) => {
        console.error(
          "DELETE MESSAGE ERROR:",
          error.response?.data ||
          error.message
        );

        // Restore message when API fails
        setIsDeleted(false);

        setDeleteError(
          error.response?.data?.message ||
          error.userMessage ||
          "Unable to delete this message. Please try again."
        );

        setShowDeleteModal(true);
      }
    );
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteError("");
  };

  const startLongPress = () => {
    if (!canUseActions) {
      return;
    }

    if (pressTimerRef.current) {
      window.clearTimeout(
        pressTimerRef.current
      );
    }

    pressTimerRef.current =
      window.setTimeout(() => {
        setShowActions(true);
        pressTimerRef.current = null;
      }, 450);
  };

  const cancelLongPress = () => {
    if (!pressTimerRef.current) {
      return;
    }

    window.clearTimeout(
      pressTimerRef.current
    );

    pressTimerRef.current = null;
  };

  const handleContextMenu = (
    event
  ) => {
    event.preventDefault();

    if (canUseActions) {
      setShowActions(true);
    }
  };

  const toggleActions = (
    event
  ) => {
    event.stopPropagation();

    if (!canUseActions) {
      return;
    }

    setShowActions(
      (previousValue) =>
        !previousValue
    );
  };

  useEffect(() => {
    return () => {
      if (
        pressTimerRef.current
      ) {
        window.clearTimeout(
          pressTimerRef.current
        );
      }
    };
  }, []);

  if (isDeleted) {
    return null;
  }

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
          className={
            styles.messageGroup
          }
          onTouchStart={
            startLongPress
          }
          onTouchEnd={
            cancelLongPress
          }
          onTouchMove={
            cancelLongPress
          }
          onTouchCancel={
            cancelLongPress
          }
          onContextMenu={
            handleContextMenu
          }
        >
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
                className={
                  styles.image
                }
                loading="lazy"
                decoding="async"
              />
            )}

            {message?.text && (
              <p
                className={
                  styles.text
                }
              >
                {message.text}
              </p>
            )}

            <div
              className={
                styles.meta
              }
            >
              <span
                className={
                  styles.time
                }
              >
                {time}
              </span>

              {isOwn && (
                <span
                  className={
                    styles.status
                  }
                >
                  {message?.status ===
                    "sending" && (
                      <Clock3
                        size={14}
                      />
                    )}

                  {message?.status ===
                    "sent" && (
                      <Check
                        size={14}
                      />
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

                  {![
                    "sending",
                    "sent",
                    "delivered",
                    "read",
                  ].includes(
                    message?.status
                  ) && (
                      <Check
                        size={14}
                      />
                    )}
                </span>
              )}

              <button
                ref={
                  optionsButtonRef
                }
                type="button"
                className={
                  styles.moreButton
                }
                onPointerDown={(
                  event
                ) => {
                  event.stopPropagation();
                }}
                onTouchStart={(
                  event
                ) => {
                  event.stopPropagation();
                }}
                onTouchEnd={(
                  event
                ) => {
                  event.stopPropagation();
                }}
                onClick={
                  toggleActions
                }
                aria-label="Message options"
                aria-haspopup="menu"
                aria-expanded={
                  showActions
                }
                data-open={
                  showActions
                    ? "true"
                    : "false"
                }
              >
                <MoreVertical
                  size={16}
                />
              </button>
            </div>
          </div>

          <MessageActionsMenu
            open={showActions}
            anchorRef={
              optionsButtonRef
            }
            isOwn={isOwn}
            preview={
              message?.text?.trim() ||
              (message?.image
                ? "Photo"
                : "Message")
            }
            onClose={() =>
              setShowActions(false)
            }
            onReply={
              handleReply
            }
            onDelete={
              handleDelete
            }
          />
        </div>
      </div>

      <DeleteMessageModal
        open={
          showDeleteModal
        }
        loading={false}
        error={
          deleteError
        }
        onClose={
          closeDeleteModal
        }
        onConfirm={
          confirmDelete
        }
      />
    </>
  );
};

export default MessageBubble;
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
  toggleMessageReaction,
} from "../../services/chatService";

const ALLOWED_REACTIONS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "👍",
  "🔥",
];

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

const getStoredUserId = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return "";
    }

    return normalizeId(
      JSON.parse(storedUser)
    );
  } catch (error) {
    console.error(
      "Unable to read current user:",
      error
    );

    return "";
  }
};

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

const getSafeReactions = (
  reactions
) =>
  Array.isArray(reactions)
    ? reactions.filter(
      (reaction) =>
        reaction?.emoji &&
        ALLOWED_REACTIONS.includes(
          reaction.emoji
        )
    )
    : [];

const MessageBubble = ({
  message,
  isOwn,
  onReply,
}) => {
  const [
    showActions,
    setShowActions,
  ] = useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    isDeleted,
    setIsDeleted,
  ] = useState(false);

  const [
    deleteError,
    setDeleteError,
  ] = useState("");

  const [
    localReactions,
    setLocalReactions,
  ] = useState(() =>
    getSafeReactions(
      message?.reactions
    )
  );

  const [
    reactionLoading,
    setReactionLoading,
  ] = useState(false);

  const [
    reactionError,
    setReactionError,
  ] = useState("");

  const pressTimerRef =
    useRef(null);

  const optionsButtonRef =
    useRef(null);

  const reactionRequestRef =
    useRef(false);

  const reactionErrorTimerRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  const currentUserId =
    getStoredUserId();

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

  const selectedReaction =
    localReactions.find(
      (reaction) =>
        normalizeId(
          reaction?.user
        ) === currentUserId
    )?.emoji || "";

  const reactionGroups =
    ALLOWED_REACTIONS.map(
      (emoji) => {
        const matchingReactions =
          localReactions.filter(
            (reaction) =>
              reaction?.emoji ===
              emoji
          );

        return {
          emoji,
          count:
            matchingReactions.length,

          selected:
            matchingReactions.some(
              (reaction) =>
                normalizeId(
                  reaction?.user
                ) ===
                currentUserId
            ),
        };
      }
    ).filter(
      (group) => group.count > 0
    );

  /* =========================
     SYNC SERVER REACTIONS
  ========================= */

  useEffect(() => {
    if (
      reactionRequestRef.current
    ) {
      return;
    }

    setLocalReactions(
      getSafeReactions(
        message?.reactions
      )
    );
  }, [
    message?._id,
    message?.reactions,
  ]);

  /* =========================
     REPLY
  ========================= */

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

  /* =========================
     REACTION
  ========================= */

  const handleReaction = async (
    emoji
  ) => {
    const safeEmoji =
      String(emoji || "").trim();

    if (
      !canUseActions ||
      !currentUserId ||
      !ALLOWED_REACTIONS.includes(
        safeEmoji
      ) ||
      reactionRequestRef.current
    ) {
      return;
    }

    const previousReactions = [
      ...localReactions,
    ];

    const existingReaction =
      previousReactions.find(
        (reaction) =>
          normalizeId(
            reaction?.user
          ) === currentUserId
      );

    let optimisticReactions;

    /*
     * Same emoji click:
     * remove reaction.
     */
    if (
      existingReaction?.emoji ===
      safeEmoji
    ) {
      optimisticReactions =
        previousReactions.filter(
          (reaction) =>
            normalizeId(
              reaction?.user
            ) !== currentUserId
        );
    } else {
      /*
       * New reaction or replace
       * previous reaction.
       */
      optimisticReactions = [
        ...previousReactions.filter(
          (reaction) =>
            normalizeId(
              reaction?.user
            ) !== currentUserId
        ),

        {
          user: {
            _id: currentUserId,
          },

          emoji: safeEmoji,

          createdAt:
            new Date().toISOString(),
        },
      ];
    }

    reactionRequestRef.current =
      true;

    setReactionLoading(true);
    setReactionError("");

    /*
     * Immediate optimistic UI.
     */
    setLocalReactions(
      optimisticReactions
    );

    try {
      const response =
        await toggleMessageReaction(
          message._id,
          safeEmoji
        );

      const serverReactions =
        response?.data?.data
          ?.reactions;

      if (
        mountedRef.current &&
        Array.isArray(
          serverReactions
        )
      ) {
        setLocalReactions(
          getSafeReactions(
            serverReactions
          )
        );
      }
    } catch (error) {
      console.error(
        "MESSAGE REACTION ERROR:",
        error.response?.data ||
        error.message
      );

      if (!mountedRef.current) {
        return;
      }

      /*
       * API failure:
       * optimistic reaction rollback.
       */
      setLocalReactions(
        previousReactions
      );

      setReactionError(
        error.response?.data
          ?.message ||
        error.userMessage ||
        "Unable to update reaction"
      );

      if (
        reactionErrorTimerRef.current
      ) {
        window.clearTimeout(
          reactionErrorTimerRef.current
        );
      }

      reactionErrorTimerRef.current =
        window.setTimeout(() => {
          if (mountedRef.current) {
            setReactionError("");
          }

          reactionErrorTimerRef.current =
            null;
        }, 3000);
    } finally {
      reactionRequestRef.current =
        false;

      if (mountedRef.current) {
        setReactionLoading(false);
      }
    }
  };

  /* =========================
     DELETE
  ========================= */

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

    /*
     * Immediate optimistic removal.
     */
    setIsDeleted(true);

    deleteMessage(message._id).catch(
      (error) => {
        console.error(
          "DELETE MESSAGE ERROR:",
          error.response?.data ||
          error.message
        );

        if (!mountedRef.current) {
          return;
        }

        /*
         * API fail ayithe message restore.
         */
        setIsDeleted(false);

        setDeleteError(
          error.response?.data
            ?.message ||
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

  /* =========================
     LONG PRESS
  ========================= */

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

        pressTimerRef.current =
          null;
      }, 450);
  };

  const cancelLongPress = () => {
    if (!pressTimerRef.current) {
      return;
    }

    window.clearTimeout(
      pressTimerRef.current
    );

    pressTimerRef.current =
      null;
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

  const stopReactionPropagation = (
    event
  ) => {
    event.stopPropagation();
    cancelLongPress();
  };

  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (pressTimerRef.current) {
        window.clearTimeout(
          pressTimerRef.current
        );
      }

      if (
        reactionErrorTimerRef.current
      ) {
        window.clearTimeout(
          reactionErrorTimerRef.current
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
                  {repliedMessage
                    ?.image && (
                      <ImageIcon
                        size={13}
                        className={
                          styles.replyIcon
                        }
                        aria-hidden="true"
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
                  aria-label={
                    message?.status ||
                    "sent"
                  }
                >
                  {message?.status ===
                    "sending" && (
                      <Clock3
                        size={14}
                        aria-hidden="true"
                      />
                    )}

                  {message?.status ===
                    "sent" && (
                      <Check
                        size={14}
                        aria-hidden="true"
                      />
                    )}

                  {message?.status ===
                    "delivered" && (
                      <CheckCheck
                        size={14}
                        aria-hidden="true"
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
                        aria-hidden="true"
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
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {reactionGroups.length >
            0 && (
              <div
                className={`${styles.reactionSummary} ${isOwn
                    ? styles.ownReactions
                    : styles.otherReactions
                  }`}
                aria-label="Message reactions"
                aria-busy={
                  reactionLoading
                }
                onPointerDown={
                  stopReactionPropagation
                }
                onTouchStart={
                  stopReactionPropagation
                }
                onTouchEnd={
                  stopReactionPropagation
                }
                onContextMenu={(
                  event
                ) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                {reactionGroups.map(
                  ({
                    emoji,
                    count,
                    selected,
                  }) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`${styles.reactionChip} ${selected
                          ? styles.reactionChipSelected
                          : ""
                        }`}
                      onClick={() =>
                        handleReaction(
                          emoji
                        )
                      }
                      disabled={
                        reactionLoading
                      }
                      aria-label={`${emoji} reaction, ${count} ${count === 1
                          ? "person"
                          : "people"
                        }`}
                      aria-pressed={
                        selected
                      }
                    >
                      <span
                        className={
                          styles.reactionEmoji
                        }
                        aria-hidden="true"
                      >
                        {emoji}
                      </span>

                      <span
                        className={
                          styles.reactionCount
                        }
                      >
                        {count}
                      </span>
                    </button>
                  )
                )}
              </div>
            )}

          {reactionError && (
            <span
              className={
                styles.reactionError
              }
              role="status"
            >
              {reactionError}
            </span>
          )}

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
            selectedReaction={
              selectedReaction
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
            onReact={
              handleReaction
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
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

  const actionAnchorRef =
    useRef(null);

  const longPressReadyRef =
    useRef(false);

  const pointerStartRef =
    useRef({
      x: 0,
      y: 0,
    });

  const activePointerIdRef =
    useRef(null);

  const suppressContextMenuUntilRef =
    useRef(0);

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

  const clearLongPressTimer = () => {
    if (!pressTimerRef.current) {
      return;
    }

    window.clearTimeout(
      pressTimerRef.current
    );

    pressTimerRef.current = null;
  };

  const releasePointerCapture = (
    element,
    pointerId
  ) => {
    if (
      !element ||
      pointerId === null ||
      typeof element
        .hasPointerCapture !==
      "function"
    ) {
      return;
    }

    try {
      if (
        element.hasPointerCapture(
          pointerId
        )
      ) {
        element.releasePointerCapture(
          pointerId
        );
      }
    } catch {
      // Pointer already released.
    }
  };

  const resetLongPress = (
    element = null
  ) => {
    clearLongPressTimer();

    releasePointerCapture(
      element,
      activePointerIdRef.current
    );

    activePointerIdRef.current =
      null;

    longPressReadyRef.current =
      false;
  };

  const handlePointerDown = (
    event
  ) => {
    if (
      !canUseActions ||
      event.pointerType !== "touch" ||
      !event.isPrimary
    ) {
      return;
    }

    const target =
      event.target;

    /*
     * Buttons and reaction chips meeda
     * long press start avvakudadhu.
     */
    if (
      target instanceof Element &&
      target.closest(
        "button, a, input, textarea, [role='button']"
      )
    ) {
      return;
    }

    resetLongPress(
      event.currentTarget
    );

    activePointerIdRef.current =
      event.pointerId;

    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    try {
      event.currentTarget
        .setPointerCapture(
          event.pointerId
        );
    } catch {
      // Unsupported mobile browser.
    }

    pressTimerRef.current =
      window.setTimeout(() => {
        /*
         * Menu ikkada open cheyyam.
         * Finger release ayyaka open chestham.
         */
        longPressReadyRef.current =
          true;

        pressTimerRef.current =
          null;

        if (
          typeof navigator !==
          "undefined" &&
          typeof navigator.vibrate ===
          "function"
        ) {
          navigator.vibrate(12);
        }
      }, 450);
  };

  const handlePointerMove = (
    event
  ) => {
    if (
      event.pointerType !== "touch" ||
      activePointerIdRef.current !==
      event.pointerId
    ) {
      return;
    }

    const movedX = Math.abs(
      event.clientX -
      pointerStartRef.current.x
    );

    const movedY = Math.abs(
      event.clientY -
      pointerStartRef.current.y
    );

    if (
      movedX > 12 ||
      movedY > 12
    ) {
      resetLongPress(
        event.currentTarget
      );
    }
  };

  const handlePointerUp = (
    event
  ) => {
    const shouldOpen =
      event.pointerType === "touch" &&
      event.pointerId ===
      activePointerIdRef.current &&
      longPressReadyRef.current;

    clearLongPressTimer();

    releasePointerCapture(
      event.currentTarget,
      activePointerIdRef.current
    );

    activePointerIdRef.current =
      null;

    longPressReadyRef.current =
      false;

    if (!shouldOpen) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    /*
     * Desktop positioning fallback kosam
     * message group anchor ga use chestham.
     */
    actionAnchorRef.current =
      event.currentTarget;

    suppressContextMenuUntilRef.current =
      Date.now() + 1000;

    setShowActions(true);
  };

  const handlePointerCancel = (
    event
  ) => {
    resetLongPress(
      event.currentTarget
    );
  };

  const handleContextMenu = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUseActions) {
      return;
    }

    /*
     * Mobile browser generated
     * duplicate context-menu ignore.
     */
    if (
      Date.now() <
      suppressContextMenuUntilRef.current
    ) {
      return;
    }

    actionAnchorRef.current =
      optionsButtonRef.current ||
      event.currentTarget;

    setShowActions(true);
  };

  const openActions = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUseActions) {
      return;
    }

    resetLongPress();

    actionAnchorRef.current =
      event.currentTarget;

    /*
     * Toggle kaadhu.
     * Duplicate clicks vachina stable ga open.
     */
    setShowActions(true);
  };

  const closeActions = () => {
    resetLongPress();

    setShowActions(false);
  };

  const stopReactionPropagation = (
    event
  ) => {
    event.stopPropagation();

    resetLongPress();
  };
  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      clearLongPressTimer();

      actionAnchorRef.current =
        null;

      activePointerIdRef.current =
        null;

      longPressReadyRef.current =
        false;

      suppressContextMenuUntilRef.current =
        0;

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
          className={styles.messageGroup}
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={
            handlePointerUp
          }
          onPointerCancel={
            handlePointerCancel
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

            <div className={styles.meta}>
              <span className={styles.time}>
                {time}
              </span>

              {isOwn && (
                <span
                  className={styles.status}
                  aria-label={
                    message?.status || "sent"
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
                      <span className={styles.seen}>
                        Seen
                      </span>
                    )}

                  {![
                    "sending",
                    "sent",
                    "delivered",
                    "read",
                  ].includes(message?.status) && (
                      <Check
                        size={14}
                        aria-hidden="true"
                      />
                    )}
                </span>
              )}

              {/* THREE-DOTS MESSAGE MENU BUTTON */}
              <button
                ref={optionsButtonRef}
                type="button"
                className={styles.moreButton}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  clearLongPressTimer();
                }}
                onPointerUp={(event) => {
                  event.stopPropagation();
                }}
                onClick={openActions}
                aria-label="Message options"
                aria-haspopup="menu"
                aria-expanded={showActions}
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
                aria-busy={reactionLoading}
                onPointerDown={
                  stopReactionPropagation
                }
                onPointerUp={(event) => {
                  event.stopPropagation();
                }}
                onContextMenu={(event) => {
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
            anchorRef={actionAnchorRef}
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
            onClose={closeActions}
            onReply={handleReply}
            onDelete={handleDelete}
            onReact={handleReaction}
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
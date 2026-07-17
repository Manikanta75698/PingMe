import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Ban,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Search,
  UserCheck,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import styles from "./ChatHeader.module.css";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  blockUser as blockUserRequest,
  unblockUser as unblockUserRequest,
} from "../../services/authService";

import {
  useChat,
} from "../../context/ChatContext";

const normalizeId = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value).trim();
  }

  if (typeof value === "object") {
    if (
      value._id &&
      value._id !== value
    ) {
      return normalizeId(
        value._id
      );
    }

    if (
      value.userId &&
      value.userId !== value
    ) {
      return normalizeId(
        value.userId
      );
    }

    if (
      Object.prototype
        .hasOwnProperty.call(
          value,
          "id"
        ) &&
      value.id &&
      value.id !== value
    ) {
      return normalizeId(
        value.id
      );
    }

    return "";
  }

  return String(value).trim();
};

const formatTime = (date) =>
  date.toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );

const isSameCalendarDay = (
  firstDate,
  secondDate
) =>
  firstDate.getFullYear() ===
  secondDate.getFullYear() &&
  firstDate.getMonth() ===
  secondDate.getMonth() &&
  firstDate.getDate() ===
  secondDate.getDate();

const formatLastSeen = (
  lastSeenValue,
  currentTime
) => {
  if (!lastSeenValue) {
    return "Offline";
  }

  const lastSeenDate =
    new Date(lastSeenValue);

  if (
    Number.isNaN(
      lastSeenDate.getTime()
    )
  ) {
    return "Offline";
  }

  const now =
    new Date(currentTime);

  const differenceMs =
    Math.max(
      0,
      now.getTime() -
      lastSeenDate.getTime()
    );

  const differenceSeconds =
    Math.floor(
      differenceMs / 1000
    );

  if (differenceSeconds < 60) {
    return "Last seen just now";
  }

  const differenceMinutes =
    Math.floor(
      differenceSeconds / 60
    );

  if (differenceMinutes < 60) {
    return `Last seen ${differenceMinutes} ${differenceMinutes === 1
      ? "minute"
      : "minutes"
      } ago`;
  }

  if (
    isSameCalendarDay(
      lastSeenDate,
      now
    )
  ) {
    return `Last seen today at ${formatTime(
      lastSeenDate
    )}`;
  }

  const yesterday =
    new Date(now);

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  if (
    isSameCalendarDay(
      lastSeenDate,
      yesterday
    )
  ) {
    return `Last seen yesterday at ${formatTime(
      lastSeenDate
    )}`;
  }

  const dateText =
    lastSeenDate.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",

        ...(
          lastSeenDate.getFullYear() !==
            now.getFullYear()
            ? {
              year: "numeric",
            }
            : {}
        ),
      }
    );

  return `Last seen ${dateText} at ${formatTime(
    lastSeenDate
  )}`;
};

const ChatHeader = () => {
  const navigate =
    useNavigate();

  const {
    selectedChat,
    onlineUsers,
    lastSeenByUser,
    typingUser,
    setSelectedChat,

    blockStatus,
    setBlockStatus,
    blockStatusLoading,
    blockStatusError,

    messageSearchOpen,
    setMessageSearchOpen,

    messageSearchQuery,
    setMessageSearchQuery,

    messageSearchMatches,
    activeSearchMatchIndex,
    setActiveSearchMatchIndex,
  } = useChat();

  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    () => Date.now()
  );

  const [
    showHeaderMenu,
    setShowHeaderMenu,
  ] = useState(false);

  const [
    blockActionLoading,
    setBlockActionLoading,
  ] = useState(false);

  const [
    blockActionError,
    setBlockActionError,
  ] = useState("");

  const menuButtonRef =
    useRef(null);

  const menuRef =
    useRef(null);

  const searchInputRef =
    useRef(null);

  const selectedChatId =
    normalizeId(
      selectedChat
    );

  const blockedByMe =
    Boolean(
      blockStatus?.blockedByMe
    );

  const blockActionBusy =
    blockStatusLoading ||
    blockActionLoading;

  const isOnline =
    Boolean(selectedChatId) &&
    Array.isArray(
      onlineUsers
    ) &&
    onlineUsers.some(
      (onlineUser) =>
        normalizeId(
          onlineUser
        ) === selectedChatId
    );

  const isTyping =
    Boolean(selectedChatId) &&
    normalizeId(
      typingUser
    ) === selectedChatId;

  const selectedLastSeen =
    lastSeenByUser?.[
    selectedChatId
    ] ||
    selectedChat?.lastSeen ||
    null;

  const lastSeenText =
    useMemo(
      () =>
        formatLastSeen(
          selectedLastSeen,
          currentTime
        ),
      [
        selectedLastSeen,
        currentTime,
      ]
    );

  const matchCount =
    Array.isArray(
      messageSearchMatches
    )
      ? messageSearchMatches.length
      : 0;

  const hasMatches =
    matchCount > 0;

  const resultText =
    messageSearchQuery.trim()
      ? hasMatches
        ? `${activeSearchMatchIndex + 1
        } of ${matchCount}`
        : "No results"
      : "";

  useEffect(() => {
    if (
      !selectedChatId ||
      isOnline
    ) {
      return undefined;
    }

    setCurrentTime(
      Date.now()
    );

    const timerId =
      window.setInterval(() => {
        setCurrentTime(
          Date.now()
        );
      }, 30000);

    return () => {
      window.clearInterval(
        timerId
      );
    };
  }, [
    selectedChatId,
    isOnline,
  ]);

  /*
   * Header menu outside click.
   */
  useEffect(() => {
    if (!showHeaderMenu) {
      return undefined;
    }

    const handleDocumentClick = (
      event
    ) => {
      const target =
        event.target;

      if (
        menuRef.current
          ?.contains(target) ||
        menuButtonRef.current
          ?.contains(target)
      ) {
        return;
      }

      setShowHeaderMenu(false);
    };

    const handleEscape = (
      event
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setShowHeaderMenu(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handleDocumentClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleDocumentClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [showHeaderMenu]);

  /*
   * Search open ayyaka input focus.
   */
  useEffect(() => {
    if (!messageSearchOpen) {
      return;
    }

    const frameId =
      window.requestAnimationFrame(
        () => {
          searchInputRef.current
            ?.focus();
        }
      );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );
    };
  }, [messageSearchOpen]);

  if (!selectedChat) {
    return (
      <header
        className={styles.header}
      >
        <h2 className={styles.empty}>
          Select a chat
        </h2>
      </header>
    );
  }

  const displayName =
    selectedChat?.name?.trim() ||
    selectedChat?.username?.trim() ||
    "User";

  const profilePicture =
    selectedChat?.profilePic ||
    DefaultAvatar;

  const closeMessageSearch = () => {
    setMessageSearchOpen(false);
    setMessageSearchQuery("");
    setActiveSearchMatchIndex(0);
  };

  const handleBack = () => {
    if (messageSearchOpen) {
      closeMessageSearch();
      return;
    }

    setSelectedChat(null);

    navigate(
      "/chat",
      {
        replace: true,
      }
    );
  };

  const handleAvatarError = (
    event
  ) => {
    const image =
      event.currentTarget;

    if (
      image.dataset
        .fallbackApplied ===
      "true"
    ) {
      return;
    }

    image.dataset
      .fallbackApplied =
      "true";

    image.src =
      DefaultAvatar;
  };

  const openMessageSearch = () => {
    setShowHeaderMenu(false);
    setMessageSearchOpen(true);
  };

  const handleBlockToggle =
    async () => {
      if (
        !selectedChatId ||
        blockActionBusy
      ) {
        return;
      }

      if (!blockedByMe) {
        const confirmed =
          window.confirm(
            `Block ${displayName}? They will no longer be able to message or interact with you.`
          );

        if (!confirmed) {
          return;
        }
      }

      setBlockActionLoading(true);
      setBlockActionError("");

      try {
        const response =
          blockedByMe
            ? await unblockUserRequest(
              selectedChatId
            )
            : await blockUserRequest(
              selectedChatId
            );

        const data =
          response?.data?.data ||
          {};

        setBlockStatus({
          userId:
            normalizeId(
              data?.userId
            ) || selectedChatId,

          blockedByMe:
            Boolean(
              data?.blockedByMe
            ),

          blockedMe:
            Boolean(
              data?.blockedMe
            ),

          isBlocked:
            Boolean(
              data?.isBlocked
            ),
        });

        setShowHeaderMenu(false);
      } catch (error) {
        console.error(
          "BLOCK USER ACTION ERROR:",
          error.response?.data ||
          error.message
        );

        setBlockActionError(
          error.response?.data
            ?.message ||
          `Unable to ${blockedByMe
            ? "unblock"
            : "block"
          } user`
        );
      } finally {
        setBlockActionLoading(false);
      }
    };

  const showPreviousMatch = () => {
    if (!hasMatches) {
      return;
    }

    setActiveSearchMatchIndex(
      (previous) =>
        previous <= 0
          ? matchCount - 1
          : previous - 1
    );
  };

  const showNextMatch = () => {
    if (!hasMatches) {
      return;
    }

    setActiveSearchMatchIndex(
      (previous) =>
        previous >=
          matchCount - 1
          ? 0
          : previous + 1
    );
  };

  const statusText =
    isTyping
      ? ""
      : isOnline
        ? "Online"
        : lastSeenText;

  if (messageSearchOpen) {
    return (
      <header
        className={`${styles.header} ${styles.searchHeader}`}
        aria-label="Search messages"
      >
        <button
          type="button"
          className={
            styles.backButton
          }
          onClick={
            closeMessageSearch
          }
          aria-label="Close message search"
        >
          <ArrowLeft
            size={23}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className={`${styles.headerMenuItem} ${!blockedByMe
            ? styles.dangerMenuItem
            : ""
            }`}
          onClick={() => {
            void handleBlockToggle();
          }}
          disabled={
            blockActionBusy
          }
          role="menuitem"
        >
          {blockedByMe ? (
            <UserCheck
              size={18}
              aria-hidden="true"
            />
          ) : (
            <Ban
              size={18}
              aria-hidden="true"
            />
          )}

          <span>
            {blockStatusLoading
              ? "Checking…"
              : blockActionLoading
                ? blockedByMe
                  ? "Unblocking…"
                  : "Blocking…"
                : blockedByMe
                  ? "Unblock user"
                  : "Block user"}
          </span>
        </button>

        {(
          blockActionError ||
          blockStatusError
        ) && (
            <p
              className={
                styles.headerMenuError
              }
              role="alert"
            >
              {blockActionError ||
                blockStatusError}
            </p>
          )}

        <div
          className={
            styles.searchInputWrapper
          }
        >
          <Search
            size={18}
            aria-hidden="true"
          />

          <input
            ref={
              searchInputRef
            }
            type="search"
            value={
              messageSearchQuery
            }
            onChange={(event) => {
              setMessageSearchQuery(
                event.target.value
              );

              setActiveSearchMatchIndex(
                0
              );
            }}
            placeholder="Search messages"
            aria-label="Search messages"
          />

          {messageSearchQuery && (
            <button
              type="button"
              className={
                styles.clearSearchButton
              }
              onClick={() => {
                setMessageSearchQuery(
                  ""
                );

                setActiveSearchMatchIndex(
                  0
                );

                searchInputRef.current
                  ?.focus();
              }}
              aria-label="Clear search"
            >
              <X
                size={17}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        <span
          className={
            styles.searchCount
          }
          aria-live="polite"
        >
          {resultText}
        </span>

        <div
          className={
            styles.searchNavigation
          }
        >
          <button
            type="button"
            onClick={
              showPreviousMatch
            }
            disabled={
              !hasMatches
            }
            aria-label="Previous result"
          >
            <ChevronUp
              size={20}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={
              showNextMatch
            }
            disabled={
              !hasMatches
            }
            aria-label="Next result"
          >
            <ChevronDown
              size={20}
              aria-hidden="true"
            />
          </button>
        </div>
      </header>
    );
  }

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
            strokeWidth={2}
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

        <div
          className={styles.info}
        >
          <h2
            className={styles.name}
          >
            {displayName}
          </h2>

          <p
            className={`
              ${styles.status}
              ${isTyping
                ? styles.typing
                : ""
              }
            `}
            aria-live="polite"
          >
            {isTyping ? (
              <span
                className={
                  styles.typingIndicator
                }
              >
                <span>Typing</span>

                <span
                  className={
                    styles.typingDots
                  }
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            ) : (
              statusText
            )}
          </p>
        </div>
      </div>

      <div
        className={
          styles.headerActions
        }
      >
        <button
          ref={
            menuButtonRef
          }
          type="button"
          className={
            styles.menuButton
          }
          onClick={() => {
            setShowHeaderMenu(
              (previous) =>
                !previous
            );
          }}
          aria-label="Chat options"
          aria-haspopup="menu"
          aria-expanded={
            showHeaderMenu
          }
        >
          <MoreVertical
            size={22}
            aria-hidden="true"
          />
        </button>

        {showHeaderMenu && (
          <div
            ref={menuRef}
            className={
              styles.headerMenu
            }
            role="menu"
          >
            <button
              type="button"
              className={
                styles.headerMenuItem
              }
              onClick={
                openMessageSearch
              }
              role="menuitem"
            >
              <Search
                size={18}
                aria-hidden="true"
              />

              <span>
                Search messages
              </span>
            </button>

            <button
              type="button"
              className={`${styles.headerMenuItem} ${!blockedByMe
                  ? styles.dangerMenuItem
                  : ""
                }`}
              onClick={() => {
                void handleBlockToggle();
              }}
              disabled={
                blockActionBusy
              }
              role="menuitem"
            >
              {blockedByMe ? (
                <UserCheck
                  size={18}
                  aria-hidden="true"
                />
              ) : (
                <Ban
                  size={18}
                  aria-hidden="true"
                />
              )}

              <span>
                {blockStatusLoading
                  ? "Checking…"
                  : blockActionLoading
                    ? blockedByMe
                      ? "Unblocking…"
                      : "Blocking…"
                    : blockedByMe
                      ? "Unblock user"
                      : "Block user"}
              </span>
            </button>

            {(
              blockActionError ||
              blockStatusError
            ) && (
                <p
                  className={
                    styles.headerMenuError
                  }
                  role="alert"
                >
                  {blockActionError ||
                    blockStatusError}
                </p>
              )}
          </div>
        )}
      </div>
    </header>
  );
};

export default ChatHeader;
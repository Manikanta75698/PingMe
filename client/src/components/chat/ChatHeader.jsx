import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import styles from "./ChatHeader.module.css";

import DefaultAvatar from "../../assets/default-avatar.png";

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
  } = useChat();

  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    () => Date.now()
  );

  const selectedChatId =
    normalizeId(
      selectedChat
    );

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

  /*
   * Offline status text automatic ga
   * every 30 seconds refresh avutundi.
   */
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

  const handleBack = () => {
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

  const statusText =
    isTyping
      ? ""
      : isOnline
        ? "Online"
        : lastSeenText;

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
    </header>
  );
};

export default ChatHeader;
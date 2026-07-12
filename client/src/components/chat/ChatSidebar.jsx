import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DefaultAvatar from "../../assets/default-avatar.png";
import styles from "./ChatSidebar.module.css";

import { useChat } from "../../context/ChatContext";

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value?._id || value?.id || ""
    );
  }

  return String(value);
};

const formatMessageTime = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const isToday =
    date.toDateString() ===
    now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);

  yesterday.setDate(
    now.getDate() - 1
  );

  const isYesterday =
    date.toDateString() ===
    yesterday.toDateString();

  if (isYesterday) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
};

const getMessagePreview = (
  lastMessage,
  currentUserId
) => {
  if (!lastMessage) {
    return "Start a conversation";
  }

  const senderId = normalizeId(
    lastMessage.sender
  );

  const prefix =
    senderId === currentUserId
      ? "You: "
      : "";

  if (lastMessage.text?.trim()) {
    return `${prefix}${lastMessage.text.trim()}`;
  }

  if (lastMessage.image) {
    return `${prefix}Photo`;
  }

  return "Start a conversation";
};

const ChatSidebar = () => {
  const [search, setSearch] =
    useState("");

  const { userId } = useParams();
  const navigate = useNavigate();

  const {
    selectedChat,
    setSelectedChat,

    onlineUsers,

    sentRequests,
    receivedRequests,

    chatSummaries,
    summariesLoading,

    setChatSummaries,
  } = useChat();

  const currentUserId = useMemo(() => {
    try {
      const storedUser = JSON.parse(
        localStorage.getItem("user")
      );

      return normalizeId(storedUser);
    } catch (error) {
      console.error(
        "Unable to read stored user:",
        error
      );

      return "";
    }
  }, []);

  /*
   * Accepted request users are kept as fallback.
   * This makes sure newly accepted chats appear
   * even before the first message is sent.
   */
  const acceptedUsers = useMemo(() => {
    const safeSentRequests =
      Array.isArray(sentRequests)
        ? sentRequests
        : [];

    const safeReceivedRequests =
      Array.isArray(receivedRequests)
        ? receivedRequests
        : [];

    const sentUsers = safeSentRequests
      .filter(
        (request) =>
          request?.status === "accepted"
      )
      .map(
        (request) =>
          request?.receiver
      );

    const receivedUsers =
      safeReceivedRequests
        .filter(
          (request) =>
            request?.status === "accepted"
        )
        .map(
          (request) =>
            request?.sender
        );

    const validUsers = [
      ...sentUsers,
      ...receivedUsers,
    ].filter(
      (chatUser) =>
        chatUser &&
        typeof chatUser === "object" &&
        normalizeId(chatUser)
    );

    return Array.from(
      new Map(
        validUsers.map((chatUser) => [
          normalizeId(chatUser),
          chatUser,
        ])
      ).values()
    );
  }, [
    sentRequests,
    receivedRequests,
  ]);

  /*
   * Merge summary data with accepted users.
   * Summary data contains:
   * lastMessage + unreadCount.
   */
  const chats = useMemo(() => {
    const summaries =
      Array.isArray(chatSummaries)
        ? chatSummaries
        : [];

    const summaryMap = new Map();

    summaries.forEach((summary) => {
      const summaryUser =
        summary?.user;

      const summaryUserId =
        normalizeId(summaryUser);

      if (!summaryUserId) return;

      summaryMap.set(
        summaryUserId,
        summary
      );
    });

    acceptedUsers.forEach((chatUser) => {
      const chatUserId =
        normalizeId(chatUser);

      if (
        chatUserId &&
        !summaryMap.has(chatUserId)
      ) {
        summaryMap.set(chatUserId, {
          user: chatUser,
          lastMessage: null,
          unreadCount: 0,
        });
      }
    });

    return Array.from(
      summaryMap.values()
    ).sort((first, second) => {
      const firstDate =
        first?.lastMessage?.createdAt
          ? new Date(
              first.lastMessage.createdAt
            ).getTime()
          : 0;

      const secondDate =
        second?.lastMessage?.createdAt
          ? new Date(
              second.lastMessage.createdAt
            ).getTime()
          : 0;

      return secondDate - firstDate;
    });
  }, [
    chatSummaries,
    acceptedUsers,
  ]);

  /*
   * Route /chat/:userId open ayithe
   * correct user automatically select avuthadu.
   */
  useEffect(() => {
    if (!userId) return;

    const matchingChat = chats.find(
      (summary) =>
        normalizeId(summary?.user) ===
        String(userId)
    );

    if (matchingChat?.user) {
      setSelectedChat(
        matchingChat.user
      );
    }
  }, [
    chats,
    userId,
    setSelectedChat,
  ]);

  const filteredChats = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    if (!searchValue) {
      return chats;
    }

    return chats.filter((summary) => {
      const chatUser =
        summary?.user;

      const name = String(
        chatUser?.name || ""
      ).toLowerCase();

      const username = String(
        chatUser?.username || ""
      ).toLowerCase();

      const lastMessage = String(
        summary?.lastMessage?.text || ""
      ).toLowerCase();

      return (
        name.includes(searchValue) ||
        username.includes(searchValue) ||
        lastMessage.includes(searchValue)
      );
    });
  }, [chats, search]);

  const handleSelectChat = (
    summary
  ) => {
    const chatUser = summary?.user;

    const chatUserId =
      normalizeId(chatUser);

    if (!chatUserId) return;

    setSelectedChat(chatUser);

    /*
     * Open chesina chat unread badge
     * immediate ga local UI lo reset avuthundi.
     */
    setChatSummaries((previous) =>
      previous.map((item) =>
        normalizeId(item?.user) ===
        chatUserId
          ? {
              ...item,
              unreadCount: 0,
            }
          : item
      )
    );

    navigate(`/chat/${chatUserId}`);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Chats
        </h1>

        <input
          type="search"
          placeholder="Search chats..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          className={
            styles.searchInput
          }
          aria-label="Search chats"
        />
      </div>

      <div className={styles.userList}>
        {summariesLoading &&
        chats.length === 0 ? (
          <p
            className={
              styles.emptyText
            }
          >
            Loading chats...
          </p>
        ) : filteredChats.length ===
          0 ? (
          <p
            className={
              styles.emptyText
            }
          >
            {search.trim()
              ? "No matching chats."
              : "No accepted chats yet."}
          </p>
        ) : (
          filteredChats.map(
            (summary) => {
              const chatUser =
                summary?.user;

              const chatUserId =
                normalizeId(chatUser);

              const unreadCount =
                Number(
                  summary?.unreadCount
                ) || 0;

              const isOnline =
                Array.isArray(
                  onlineUsers
                ) &&
                onlineUsers.some(
                  (onlineUser) =>
                    normalizeId(
                      onlineUser
                    ) === chatUserId
                );

              const isSelected =
                normalizeId(
                  selectedChat
                ) === chatUserId;

              const preview =
                getMessagePreview(
                  summary?.lastMessage,
                  currentUserId
                );

              const time =
                formatMessageTime(
                  summary?.lastMessage
                    ?.createdAt
                );

              const displayName =
                chatUser?.name ||
                chatUser?.username ||
                "User";

              return (
                <button
                  type="button"
                  key={chatUserId}
                  onClick={() =>
                    handleSelectChat(
                      summary
                    )
                  }
                  className={`${
                    styles.userItem
                  } ${
                    isSelected
                      ? styles.active
                      : ""
                  }`}
                >
                  <div
                    className={
                      styles.avatarWrapper
                    }
                  >
                    <img
                      src={
                        chatUser
                          ?.profilePic ||
                        DefaultAvatar
                      }
                      alt={displayName}
                      className={
                        styles.avatar
                      }
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.src =
                          DefaultAvatar;
                      }}
                    />

                    {isOnline && (
                      <span
                        className={
                          styles.onlineDot
                        }
                        aria-label="Online"
                      />
                    )}
                  </div>

                  <div
                    className={
                      styles.userInfo
                    }
                  >
                    <div
                      className={
                        styles.userTopRow
                      }
                    >
                      <h2
                        className={
                          styles.name
                        }
                      >
                        {displayName}
                      </h2>

                      {time && (
                        <time
                          className={
                            styles.time
                          }
                        >
                          {time}
                        </time>
                      )}
                    </div>

                    <div
                      className={
                        styles.previewRow
                      }
                    >
                      <p
                        className={
                          styles.preview
                        }
                      >
                        {preview}
                      </p>

                      {unreadCount >
                        0 && (
                        <span
                          className={
                            styles.unreadBadge
                          }
                        >
                          {unreadCount >
                          99
                            ? "99+"
                            : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            }
          )
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;
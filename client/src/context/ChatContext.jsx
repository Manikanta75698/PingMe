import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import socket, {
  connectSocket,
} from "../socket/socket";

import {
  getNotifications,
} from "../services/notificationService";

import {
  getChatSummaries,
  getPinnedMessage as fetchPinnedMessage,
} from "../services/chatService";

import {
  getBlockStatus as fetchBlockStatus,
} from "../services/authService";

const ChatContext = createContext(null);

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error
    );

    return null;
  }
};

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

const moveSummaryToTop = (
  summaries,
  userId,
  updater
) => {
  const safeSummaries =
    Array.isArray(summaries)
      ? summaries
      : [];

  const index =
    safeSummaries.findIndex(
      (summary) =>
        normalizeId(
          summary?.user
        ) === userId
    );

  if (index === -1) {
    return safeSummaries;
  }

  const updatedSummary =
    updater(
      safeSummaries[index]
    );

  return [
    updatedSummary,
    ...safeSummaries.slice(0, index),
    ...safeSummaries.slice(index + 1),
  ];
};

const getMessageKey = (
  message
) => {
  const messageId =
    normalizeId(message?._id);

  if (messageId) {
    return `id:${messageId}`;
  }

  const senderId =
    normalizeId(message?.sender);

  const clientMessageId =
    String(
      message?.clientMessageId ||
      ""
    ).trim();

  if (
    senderId &&
    clientMessageId
  ) {
    return `client:${senderId}:${clientMessageId}`;
  }

  return "";
};

export const ChatProvider = ({
  children,
}) => {
  const [
    selectedChat,
    setSelectedChat,
  ] = useState(null);

  const [
    replyingTo,
    setReplyingTo,
  ] = useState(null);

  const [
    editingMessage,
    setEditingMessage,
  ] = useState(null);

  const [
    messageSearchOpen,
    setMessageSearchOpen,
  ] = useState(false);

  const [
    messageSearchQuery,
    setMessageSearchQuery,
  ] = useState("");

  const [
    messageSearchMatches,
    setMessageSearchMatches,
  ] = useState([]);

  const [
    activeSearchMatchIndex,
    setActiveSearchMatchIndex,
  ] = useState(0);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    messageScrollRequest,
    setMessageScrollRequest,
  ] = useState(null);

  const [
    pinnedMessage,
    setPinnedMessage,
  ] = useState(null);

  const [
    blockStatus,
    setBlockStatus,
  ] = useState({
    userId: "",
    blockedByMe: false,
    blockedMe: false,
    isBlocked: false,
  });

  const [
    blockStatusLoading,
    setBlockStatusLoading,
  ] = useState(false);

  const [
    blockStatusError,
    setBlockStatusError,
  ] = useState("");

  const [
    onlineUsers,
    setOnlineUsers,
  ] = useState([]);

  const [
    lastSeenByUser,
    setLastSeenByUser,
  ] = useState({});

  const [
    typingUser,
    setTypingUser,
  ] = useState(null);

  const [
    receivedRequests,
    setReceivedRequests,
  ] = useState([]);

  const [
    sentRequests,
    setSentRequests,
  ] = useState([]);

  const [
    chatSummaries,
    setChatSummaries,
  ] = useState([]);

  const [
    notificationUnreadCount,
    setNotificationUnreadCount,
  ] = useState(0);


  const processedNotificationIdsRef =
    useRef(new Set());

  const processedMessageKeysRef =
    useRef(new Set());

  const [
    summariesLoading,
    setSummariesLoading,
  ] = useState(false);

  const typingTimerRef =
    useRef(null);

  const typingUserRef =
    useRef("");

  const selectedChatRef =
    useRef(null);

  const readReceiptIdsRef =
    useRef(new Set());

  const summariesRequestRef =
    useRef(null);

  const summariesLoadedAtRef =
    useRef(0);

  const notificationsRequestRef =
    useRef(null);

  const notificationsLoadedAtRef =
    useRef(0);

  const pinnedRequestRef =
    useRef(new Map());

  const pinnedCacheRef =
    useRef(new Map());

  const blockStatusRequestRef =
    useRef(new Map());

  const blockStatusCacheRef =
    useRef(new Map());

  const CHAT_META_CACHE_MS =
    15000;

  const selectedChatId =
    normalizeId(selectedChat);

  /* =========================
     SELECTED CHAT REFERENCE
  ========================= */

  useEffect(() => {
    selectedChatRef.current =
      selectedChat;
  }, [selectedChat]);

  /* =========================
     SELECTED CHAT RESET
  ========================= */

  useEffect(() => {
    readReceiptIdsRef.current.clear();

    setReplyingTo(null);
    setEditingMessage(null);
    setTypingUser(null);

    setMessageSearchOpen(false);
    setMessageSearchQuery("");
    setMessageSearchMatches([]);
    setActiveSearchMatchIndex(0);

    setMessageScrollRequest(null);

    typingUserRef.current = "";

    if (typingTimerRef.current) {
      window.clearTimeout(
        typingTimerRef.current
      );

      typingTimerRef.current = null;
    }
  }, [selectedChatId]);


  /* =========================
     LOAD PINNED MESSAGE
  ========================= */

  useEffect(() => {
    if (!selectedChatId) {
      setPinnedMessage(null);
      return undefined;
    }

    let isActive = true;

    const cached =
      pinnedCacheRef.current.get(
        selectedChatId
      );

    if (
      cached &&
      Date.now() - cached.savedAt <
      CHAT_META_CACHE_MS
    ) {
      setPinnedMessage(
        cached.data
      );

      return () => {
        isActive = false;
      };
    }

    setPinnedMessage(null);

    const loadPinnedMessage =
      async () => {
        try {
          let request =
            pinnedRequestRef.current.get(
              selectedChatId
            );

          if (!request) {
            request =
              fetchPinnedMessage(
                selectedChatId
              );

            pinnedRequestRef.current.set(
              selectedChatId,
              request
            );
          }

          const response =
            await request;

          if (!isActive) {
            return;
          }

          const nextPinnedMessage =
            response?.data?.data ||
            null;

          pinnedCacheRef.current.set(
            selectedChatId,
            {
              data: nextPinnedMessage,
              savedAt: Date.now(),
            }
          );

          setPinnedMessage(
            nextPinnedMessage
          );
        } catch (error) {
          console.error(
            "GET PINNED MESSAGE EXACT ERROR:",
            error.response?.data ||
            error.message
          );

          if (isActive) {
            setPinnedMessage(null);
          }
        } finally {
          pinnedRequestRef.current.delete(
            selectedChatId
          );
        }
      };

    void loadPinnedMessage();

    return () => {
      isActive = false;
    };
  }, [selectedChatId]);


  /* =========================
     LOAD BLOCK STATUS
  ========================= */

  useEffect(() => {
    if (!selectedChatId) {
      setBlockStatus({
        userId: "",
        blockedByMe: false,
        blockedMe: false,
        isBlocked: false,
      });

      setBlockStatusLoading(false);
      setBlockStatusError("");

      return undefined;
    }

    let isActive = true;

    const cached =
      blockStatusCacheRef.current.get(
        selectedChatId
      );

    if (
      cached &&
      Date.now() - cached.savedAt <
      CHAT_META_CACHE_MS
    ) {
      setBlockStatus(
        cached.data
      );

      setBlockStatusLoading(false);
      setBlockStatusError("");

      return () => {
        isActive = false;
      };
    }

    setBlockStatusLoading(true);
    setBlockStatusError("");

    const loadBlockStatus =
      async () => {
        try {
          let request =
            blockStatusRequestRef.current.get(
              selectedChatId
            );

          if (!request) {
            request =
              fetchBlockStatus(
                selectedChatId
              );

            blockStatusRequestRef.current.set(
              selectedChatId,
              request
            );
          }

          const response =
            await request;

          if (!isActive) {
            return;
          }

          const data =
            response?.data?.data ||
            {};

          const nextStatus = {
            userId:
              normalizeId(
                data?.userId
              ) ||
              selectedChatId,

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
          };

          blockStatusCacheRef.current.set(
            selectedChatId,
            {
              data: nextStatus,
              savedAt: Date.now(),
            }
          );

          setBlockStatus(
            nextStatus
          );
        } catch (error) {
          console.error(
            "LOAD BLOCK STATUS ERROR:",
            error.response?.data ||
            error.message
          );

          if (!isActive) {
            return;
          }

          setBlockStatusError(
            error.response?.data
              ?.message ||
            "Unable to load block status"
          );
        } finally {
          blockStatusRequestRef.current.delete(
            selectedChatId
          );

          if (isActive) {
            setBlockStatusLoading(
              false
            );
          }
        }
      };

    void loadBlockStatus();

    return () => {
      isActive = false;
    };
  }, [selectedChatId]);


  /* =========================
     LOAD CHAT SUMMARIES
  ========================= */

  const loadChatSummaries =
    useCallback(
      async ({
        force = false,
        silent = false,
      } = {}) => {
        const token =
          localStorage
            .getItem("token")
            ?.trim();

        /*
         * Logout state lo stale chat data
         * current user ki show kakudadhu.
         */
        if (!token) {
          summariesRequestRef.current =
            null;

          summariesLoadedAtRef.current =
            0;

          processedMessageKeysRef
            .current
            .clear();

          setChatSummaries([]);
          setSummariesLoading(false);

          return [];
        }

        const now =
          Date.now();

        const cacheIsFresh =
          now -
          summariesLoadedAtRef.current <
          15000;

        /*
         * Last 15 seconds lo already
         * successful fetch ayithe duplicate
         * request avoid chestham.
         */
        if (
          !force &&
          cacheIsFresh
        ) {
          return null;
        }

        /*
         * Existing request running lo unte
         * same promise return chestham.
         */
        if (
          summariesRequestRef.current
        ) {
          return summariesRequestRef.current;
        }

        if (!silent) {
          setSummariesLoading(true);
        }

        const request =
          (async () => {
            try {
              const response =
                await getChatSummaries();

              const summaries =
                response?.data?.chats;

              const safeSummaries =
                Array.isArray(summaries)
                  ? summaries
                  : [];

              setChatSummaries(
                safeSummaries
              );

              summariesLoadedAtRef.current =
                Date.now();

              return safeSummaries;
            } catch (error) {
              console.error(
                "LOAD CHAT SUMMARIES ERROR:",
                error.response?.data ||
                error.message
              );

              /*
               * IMPORTANT:
               * Temporary network/Render
               * cold-start error vachina old
               * chat list ni empty cheyyakudadhu.
               */
              return null;
            } finally {
              summariesRequestRef.current =
                null;

              if (!silent) {
                setSummariesLoading(false);
              }
            }
          })();

        summariesRequestRef.current =
          request;

        return request;
      },
      []
    );


  /* =========================
 LOAD NOTIFICATIONS
========================= */

  const loadNotifications =
    useCallback(
      async ({
        force = false,
      } = {}) => {
        const token =
          localStorage
            .getItem("token")
            ?.trim();

        if (!token) {
          notificationsRequestRef.current =
            null;

          notificationsLoadedAtRef.current =
            0;

          setNotificationUnreadCount(
            0
          );

          processedNotificationIdsRef
            .current
            .clear();

          return null;
        }

        const now =
          Date.now();

        const cacheIsFresh =
          now -
          notificationsLoadedAtRef.current <
          15000;

        if (
          !force &&
          cacheIsFresh
        ) {
          return null;
        }

        if (
          notificationsRequestRef.current
        ) {
          return notificationsRequestRef.current;
        }

        const request =
          (async () => {
            try {
              const response =
                await getNotifications();

              const unreadCount =
                Number(
                  response?.data
                    ?.unreadCount
                ) || 0;

              setNotificationUnreadCount(
                Math.max(
                  0,
                  unreadCount
                )
              );

              const notifications =
                Array.isArray(
                  response?.data
                    ?.notifications
                )
                  ? response.data
                    .notifications
                  : [];

              const notificationIds =
                notifications
                  .map(
                    (notification) =>
                      normalizeId(
                        notification?._id ||
                        notification?.id
                      )
                  )
                  .filter(Boolean);

              processedNotificationIdsRef
                .current =
                new Set(
                  notificationIds
                );

              notificationsLoadedAtRef.current =
                Date.now();

              return response;
            } catch (error) {
              console.error(
                "LOAD NOTIFICATIONS ERROR:",
                error.response?.data ||
                error.message
              );

              return null;
            } finally {
              notificationsRequestRef.current =
                null;
            }
          })();

        notificationsRequestRef.current =
          request;

        return request;
      },
      []
    );

  /* =========================
    INITIAL DATA
 ========================= */

  useEffect(() => {
    const loadInitialData =
      async () => {
        const token =
          localStorage
            .getItem("token")
            ?.trim();

        if (!token) {
          return;
        }

        await Promise.allSettled([
          loadChatSummaries({
            force: true,
          }),

          loadNotifications(),
        ]);
      };

    void loadInitialData();
  }, [
    loadChatSummaries,
    loadNotifications,
  ]);

  /* =========================
     AUTH / SOCKET DATA RESYNC
  ========================= */

  useEffect(() => {
    const resyncChatData = ({
      forceNotifications = false,
    } = {}) => {
      const token =
        localStorage
          .getItem("token")
          ?.trim();

      if (!token) {
        return;
      }

      void loadChatSummaries({
        silent: true,
      });

      void loadNotifications({
        force:
          forceNotifications,
      });
    };

    const handleSocketConnected =
      () => {
        resyncChatData();
      };

    const handleSocketReconnected =
      () => {
        resyncChatData({
          forceNotifications: true,
        });
      };

    const handleOnline =
      () => {
        resyncChatData();
      };

    window.addEventListener(
      "socket:connected",
      handleSocketConnected
    );

    window.addEventListener(
      "socket:reconnected",
      handleSocketReconnected
    );

    window.addEventListener(
      "online",
      handleOnline
    );

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          resyncChatData();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "socket:connected",
        handleSocketConnected
      );

      window.removeEventListener(
        "socket:reconnected",
        handleSocketReconnected
      );

      window.removeEventListener(
        "online",
        handleOnline
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    loadChatSummaries,
    loadNotifications,
  ]);
  /* =========================
   NOTIFICATION SOCKETS
========================= */

  useEffect(() => {
    const token =
      localStorage.getItem(
        "token"
      );

    const currentUser =
      getStoredUser();

    const currentUserId =
      normalizeId(
        currentUser
      );

    if (
      !token ||
      !currentUserId
    ) {
      setNotificationUnreadCount(
        0
      );

      return undefined;
    }

    const rememberNotificationId =
      (notificationId) => {
        const safeId =
          normalizeId(
            notificationId
          );

        if (!safeId) {
          return false;
        }

        if (
          processedNotificationIdsRef
            .current
            .has(safeId)
        ) {
          return false;
        }

        processedNotificationIdsRef
          .current
          .add(safeId);


        if (
          processedNotificationIdsRef
            .current
            .size > 500
        ) {
          const ids =
            Array.from(
              processedNotificationIdsRef
                .current
            );

          processedNotificationIdsRef
            .current =
            new Set(
              ids.slice(-250)
            );
        }

        return true;
      };

    const removeRememberedNotificationId =
      (notificationId) => {
        const safeId =
          normalizeId(
            notificationId
          );

        if (!safeId) {
          return;
        }

        processedNotificationIdsRef
          .current
          .delete(safeId);
      };

    /* =========================
       NEW NOTIFICATION
    ========================= */

    const handleNotificationReceived =
      (payload = {}) => {
        const notification =
          payload?.notification &&
            typeof payload
              .notification ===
            "object"
            ? payload.notification
            : payload;

        const notificationId =
          normalizeId(
            notification?._id ||
            notification?.id
          );


        if (
          notificationId &&
          !rememberNotificationId(
            notificationId
          )
        ) {
          return;
        }

        setNotificationUnreadCount(
          (previous) =>
            Math.max(
              0,
              Number(previous) ||
              0
            ) + 1
        );
      };

    /* =========================
       BADGE UPDATE
    ========================= */

    const handleNotificationBadgeUpdated =
      (payload = {}) => {
        const action =
          String(
            payload?.action ||
            ""
          )
            .trim()
            .toLowerCase();

        const amount =
          Math.max(
            1,
            Number(
              payload?.amount
            ) || 1
          );

        const notificationId =
          normalizeId(
            payload
              ?.notification
              ?._id ||
            payload
              ?.notification
              ?.id ||
            payload
              ?.notificationId
          );

        if (
          action ===
          "increment"
        ) {

          if (
            notificationId &&
            !rememberNotificationId(
              notificationId
            )
          ) {
            return;
          }

          setNotificationUnreadCount(
            (previous) =>
              Math.max(
                0,
                Number(previous) ||
                0
              ) + amount
          );

          return;
        }

        if (
          action ===
          "decrement"
        ) {
          removeRememberedNotificationId(
            notificationId
          );

          setNotificationUnreadCount(
            (previous) =>
              Math.max(
                0,
                (Number(
                  previous
                ) || 0) -
                amount
              )
          );

          return;
        }

        if (
          action === "set"
        ) {
          setNotificationUnreadCount(
            Math.max(
              0,
              Number(
                payload?.count ??
                payload
                  ?.unreadCount
              ) || 0
            )
          );

          return;
        }


        void loadNotifications({
          force: true,
        });
      };

    /* =========================
       NOTIFICATION REMOVED
    ========================= */

    const handleNotificationRemoved =
      (payload = {}) => {
        const notificationId =
          normalizeId(
            payload
              ?.notificationId ||
            payload
              ?.notification
              ?._id
          );

        removeRememberedNotificationId(
          notificationId
        );


      };

    /* =========================
       SOCKET RECONNECT SYNC
    ========================= */

    const handleNotificationSocketConnect =
      () => {
        void loadNotifications();
      };

    socket.on(
      "notificationReceived",
      handleNotificationReceived
    );

    socket.on(
      "notificationBadgeUpdated",
      handleNotificationBadgeUpdated
    );

    socket.on(
      "notificationRemoved",
      handleNotificationRemoved
    );

    socket.on(
      "connect",
      handleNotificationSocketConnect
    );

    if (socket.connected) {
      void loadNotifications();
    }

    return () => {
      socket.off(
        "notificationReceived",
        handleNotificationReceived
      );

      socket.off(
        "notificationBadgeUpdated",
        handleNotificationBadgeUpdated
      );

      socket.off(
        "notificationRemoved",
        handleNotificationRemoved
      );

      socket.off(
        "connect",
        handleNotificationSocketConnect
      );
    };
  }, [loadNotifications]);

  /* =========================
     SOCKET CONNECTION
  ========================= */
  useEffect(() => {
    const token =
      localStorage.getItem("token");

    const currentUser =
      getStoredUser();

    const currentUserId =
      normalizeId(currentUser);

    if (!token || !currentUserId) {
      return undefined;
    }

    const removeLastSeen = (
      userId
    ) => {
      setLastSeenByUser(
        (previous) => {
          if (
            !Object.prototype
              .hasOwnProperty.call(
                previous,
                userId
              )
          ) {
            return previous;
          }

          const next = {
            ...previous,
          };

          delete next[userId];

          return next;
        }
      );
    };

    const updateSummaryPresence = ({
      userId,
      isOnline,
      lastSeen,
    }) => {
      setChatSummaries(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              (summary) => {
                const summaryUserId =
                  normalizeId(
                    summary?.user
                  );

                if (
                  summaryUserId !==
                  userId ||
                  !summary?.user ||
                  typeof summary.user !==
                  "object"
                ) {
                  return summary;
                }

                return {
                  ...summary,

                  user: {
                    ...summary.user,
                    isOnline:
                      Boolean(isOnline),
                    lastSeen:
                      lastSeen || null,
                  },
                };
              }
            )
            : []
      );
    };

    const updateOnlineUsers = (
      userId,
      isOnline
    ) => {
      setOnlineUsers((previous) => {
        const onlineUserSet =
          new Set(
            (
              Array.isArray(previous)
                ? previous
                : []
            )
              .map((item) =>
                normalizeId(item)
              )
              .filter(Boolean)
          );

        if (isOnline) {
          onlineUserSet.add(userId);
        } else {
          onlineUserSet.delete(userId);
        }

        return Array.from(
          onlineUserSet
        );
      });
    };

    const saveLastSeen = (
      userId,
      lastSeen
    ) => {
      if (!lastSeen) {
        removeLastSeen(userId);
        return;
      }

      const parsedLastSeen =
        new Date(lastSeen);

      if (
        Number.isNaN(
          parsedLastSeen.getTime()
        )
      ) {
        removeLastSeen(userId);
        return;
      }

      setLastSeenByUser(
        (previous) => ({
          ...previous,

          [userId]:
            parsedLastSeen
              .toISOString(),
        })
      );
    };

    const requestSelectedPresence =
      () => {
        const selectedUserId =
          normalizeId(
            selectedChatRef.current
          );

        if (!selectedUserId) {
          return;
        }

        socket.emit(
          "presence:sync",
          {
            userId:
              selectedUserId,
          }
        );
      };

    const handleConnect = () => {
      console.log(
        "AUTHENTICATED SOCKET CONNECTED:",
        socket.id
      );

      requestSelectedPresence();
    };

    const handlePresenceChanged = (
      payload = {}
    ) => {
      const userId =
        normalizeId(
          payload?.userId
        );

      if (!userId) {
        return;
      }

      const isOnline =
        Boolean(
          payload?.isOnline
        );

      const lastSeen =
        !isOnline
          ? payload?.lastSeen || null
          : null;

      updateOnlineUsers(
        userId,
        isOnline
      );

      saveLastSeen(
        userId,
        lastSeen
      );

      updateSummaryPresence({
        userId,
        isOnline,
        lastSeen,
      });
    };

    const handlePresenceSnapshot = (
      payload = {}
    ) => {
      const userId =
        normalizeId(
          payload?.userId
        );

      if (!userId) {
        return;
      }

      const isOnline =
        Boolean(
          payload?.isOnline
        );

      const lastSeen =
        !isOnline
          ? payload?.lastSeen || null
          : null;

      updateOnlineUsers(
        userId,
        isOnline
      );

      saveLastSeen(
        userId,
        lastSeen
      );

      updateSummaryPresence({
        userId,
        isOnline,
        lastSeen,
      });
    };

    const handleLastSeenPrivacyChanged =
      (payload = {}) => {
        const userId =
          normalizeId(
            payload?.userId
          );

        if (!userId) {
          return;
        }

        removeLastSeen(userId);

        setChatSummaries(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (summary) => {
                  const summaryUserId =
                    normalizeId(
                      summary?.user
                    );

                  if (
                    summaryUserId !==
                    userId ||
                    !summary?.user ||
                    typeof summary.user !==
                    "object"
                  ) {
                    return summary;
                  }

                  return {
                    ...summary,

                    user: {
                      ...summary.user,
                      lastSeen: null,
                    },
                  };
                }
              )
              : []
        );
      };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "userPresenceChanged",
      handlePresenceChanged
    );

    socket.on(
      "presence:snapshot",
      handlePresenceSnapshot
    );

    socket.on(
      "userLastSeenPrivacyChanged",
      handleLastSeenPrivacyChanged
    );

    if (!socket.connected) {
      connectSocket();
    } else {
      requestSelectedPresence();
    }

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "userPresenceChanged",
        handlePresenceChanged
      );

      socket.off(
        "presence:snapshot",
        handlePresenceSnapshot
      );

      socket.off(
        "userLastSeenPrivacyChanged",
        handleLastSeenPrivacyChanged
      );
    };
  }, []);


  /* =========================
   SELECTED CHAT PRESENCE SYNC
========================= */

  useEffect(() => {
    const selectedUserId =
      normalizeId(
        selectedChat
      );

    if (
      !selectedUserId ||
      !socket.connected
    ) {
      return;
    }

    socket.emit(
      "presence:sync",
      {
        userId:
          selectedUserId,
      }
    );
  }, [selectedChat]);


  /* =========================
   WINDOW PRESENCE RESYNC
========================= */

  useEffect(() => {
    const requestPresenceSync =
      () => {
        if (
          !socket.connected ||
          document.visibilityState !==
          "visible"
        ) {
          return;
        }

        const selectedUserId =
          normalizeId(
            selectedChatRef.current
          );

        if (!selectedUserId) {
          return;
        }

        socket.emit(
          "presence:sync",
          {
            userId:
              selectedUserId,
          }
        );
      };

    window.addEventListener(
      "focus",
      requestPresenceSync
    );

    document.addEventListener(
      "visibilitychange",
      requestPresenceSync
    );

    return () => {
      window.removeEventListener(
        "focus",
        requestPresenceSync
      );

      document.removeEventListener(
        "visibilitychange",
        requestPresenceSync
      );
    };
  }, []);

  /* =========================
     NEW MESSAGE
  ========================= */

  useEffect(() => {
    const rememberMessage = (
      message
    ) => {
      const key =
        getMessageKey(message);

      /*
       * Extremely old backend payload lo
       * identity lekapothe normal flow allow.
       */
      if (!key) {
        return true;
      }

      if (
        processedMessageKeysRef
          .current
          .has(key)
      ) {
        return false;
      }

      processedMessageKeysRef
        .current
        .add(key);

      /*
       * Memory unlimited ga grow kakunda
       * recent keys matrame preserve.
       */
      if (
        processedMessageKeysRef
          .current
          .size > 600
      ) {
        const keys =
          Array.from(
            processedMessageKeysRef
              .current
          );

        processedMessageKeysRef
          .current =
          new Set(
            keys.slice(-300)
          );
      }

      return true;
    };

    const handleMessage = (
      message
    ) => {
      if (
        !message ||
        typeof message !==
        "object"
      ) {
        return;
      }

      const currentUserId =
        normalizeId(
          getStoredUser()
        );

      const receiverId =
        normalizeId(
          message?.receiver
        );

      const senderId =
        normalizeId(
          message?.sender
        );

      const selectedUserId =
        normalizeId(
          selectedChatRef.current
        );

      const messageId =
        normalizeId(
          message?._id
        );

      const isForCurrentUser =
        Boolean(currentUserId) &&
        receiverId ===
        currentUserId;

      /*
       * Vere user/device kosam vachina
       * malformed event ni process cheyyam.
       */
      if (!isForCurrentUser) {
        return;
      }

      /*
       * Same socket message repeat ayithe:
       * - bubble duplicate kaadhu
       * - unread duplicate kaadhu
       * - summary duplicate update kaadhu
       */
      if (!rememberMessage(message)) {
        return;
      }

      const isExactChatOpen =
        Boolean(selectedUserId) &&
        senderId ===
        selectedUserId;

      /*
       * Receiver server ki delivered
       * acknowledgement pampisthadu.
       */
      if (messageId) {
        socket.emit(
          "messageDelivered",
          {
            messageId,
          }
        );
      }

      /* =========================
         OPEN CONVERSATION
      ========================= */

      if (isExactChatOpen) {
        setMessages(
          (previous) => {
            const safeMessages =
              Array.isArray(previous)
                ? previous
                : [];

            const incomingKey =
              getMessageKey(message);

            const alreadyExists =
              safeMessages.some(
                (item) => {
                  const existingId =
                    normalizeId(
                      item?._id
                    );

                  if (
                    messageId &&
                    existingId ===
                    messageId
                  ) {
                    return true;
                  }

                  const existingKey =
                    getMessageKey(item);

                  return (
                    incomingKey &&
                    existingKey ===
                    incomingKey
                  );
                }
              );

            if (alreadyExists) {
              return safeMessages;
            }

            return [
              ...safeMessages,
              message,
            ];
          }
        );

        /*
         * Open chat lo unread count increase
         * cheyyakudadhu. Summary latest message
         * matrame update chestham.
         */
        setChatSummaries(
          (previous) =>
            moveSummaryToTop(
              previous,
              senderId,
              (summary) => ({
                ...summary,
                lastMessage: message,
                unreadCount: 0,
              })
            )
        );

        return;
      }

      /* =========================
         CLOSED CONVERSATION
      ========================= */

      setChatSummaries(
        (previous) => {
          const safeSummaries =
            Array.isArray(previous)
              ? previous
              : [];

          const existingIndex =
            safeSummaries.findIndex(
              (summary) =>
                normalizeId(
                  summary?.user
                ) === senderId
            );

          /*
           * Summary local cache lo lekapothe
           * server nunchi latest list reload.
           */
          if (existingIndex === -1) {
            void loadChatSummaries({
              silent: true,
            });

            return safeSummaries;
          }

          const existingSummary =
            safeSummaries[
            existingIndex
            ];

          const previousMessageKey =
            getMessageKey(
              existingSummary
                ?.lastMessage
            );

          const incomingMessageKey =
            getMessageKey(message);

          /*
           * Summary already same message ni
           * contain chesthe unread repeat kaadhu.
           */
          if (
            incomingMessageKey &&
            incomingMessageKey ===
            previousMessageKey
          ) {
            return safeSummaries;
          }

          return moveSummaryToTop(
            safeSummaries,
            senderId,
            (summary) => ({
              ...summary,

              lastMessage:
                message,

              unreadCount:
                Math.max(
                  0,
                  Number(
                    summary?.unreadCount
                  ) || 0
                ) + 1,
            })
          );
        }
      );
    };

    socket.on(
      "newMessage",
      handleMessage
    );

    return () => {
      socket.off(
        "newMessage",
        handleMessage
      );
    };
  }, [loadChatSummaries]);

  /* =========================
   MESSAGE EDITED
========================= */

  useEffect(() => {
    const handleMessageEdited = (
      payload = {}
    ) => {

      const editedMessage =
        payload?.data ||
        payload?.message ||
        payload;

      const messageId =
        normalizeId(
          editedMessage?._id ||
          payload?.messageId
        );

      if (!messageId) {
        return;
      }

      console.log(
        "MESSAGE EDITED:",
        messageId
      );

      setMessages((previous) =>
        Array.isArray(previous)
          ? previous.map((message) => {
            const currentMessageId =
              normalizeId(
                message?._id
              );


            if (
              currentMessageId ===
              messageId
            ) {
              return {
                ...message,
                ...editedMessage,
              };
            }

            /*
             * Ee edited message ni vere message
             * reply preview ga use chesthe,
             * reply preview text kuda live update.
             */
            const replyToId =
              normalizeId(
                message?.replyTo
              );

            if (
              replyToId !== messageId ||
              !message?.replyTo ||
              typeof message.replyTo !==
              "object"
            ) {
              return message;
            }

            return {
              ...message,

              replyTo: {
                ...message.replyTo,

                text:
                  editedMessage?.text ??
                  message.replyTo?.text,

                editedAt:
                  editedMessage?.editedAt ??
                  message.replyTo?.editedAt,
              },
            };
          })
          : []
      );

      setPinnedMessage((previous) => {
        const previousId =
          normalizeId(
            previous?._id
          );

        if (
          !previous ||
          previousId !== messageId
        ) {
          return previous;
        }

        return {
          ...previous,
          ...editedMessage,
        };
      });

      setChatSummaries(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              (summary) => {
                const lastMessageId =
                  normalizeId(
                    summary
                      ?.lastMessage
                      ?._id
                  );

                if (
                  lastMessageId !==
                  messageId
                ) {
                  return summary;
                }

                return {
                  ...summary,

                  lastMessage: {
                    ...summary.lastMessage,
                    ...editedMessage,
                  },
                };
              }
            )
            : []
      );

      /*
       * Currently reply chesthunna message
       * edited ayithe reply composer preview
       * kuda latest text show chesthundi.
       */
      setReplyingTo(
        (previous) => {
          if (
            normalizeId(
              previous?._id
            ) !== messageId
          ) {
            return previous;
          }

          return {
            ...previous,
            ...editedMessage,
          };
        }
      );

      setEditingMessage(
        (previous) => {
          if (
            normalizeId(
              previous?._id
            ) !== messageId
          ) {
            return previous;
          }

          return {
            ...previous,
            ...editedMessage,
          };
        }
      );
    };

    socket.on(
      "messageEdited",
      handleMessageEdited
    );

    return () => {
      socket.off(
        "messageEdited",
        handleMessageEdited
      );
    };
  }, []);

  /* =========================
     TYPING INDICATOR
  ========================= */

  useEffect(() => {
    const clearTypingTimer = () => {
      if (
        !typingTimerRef.current
      ) {
        return;
      }

      window.clearTimeout(
        typingTimerRef.current
      );

      typingTimerRef.current =
        null;
    };

    const clearTypingUser = (
      userId
    ) => {
      const safeUserId =
        normalizeId(userId);

      if (
        safeUserId &&
        typingUserRef.current !==
        safeUserId
      ) {
        return;
      }

      clearTypingTimer();

      typingUserRef.current = "";
      setTypingUser(null);
    };

    const handleTypingStart = (
      data = {}
    ) => {
      const safeUserId =
        normalizeId(
          data?.userId
        );

      if (!safeUserId) {
        return;
      }

      console.log(
        "TYPING START RECEIVED:",
        safeUserId
      );

      clearTypingTimer();

      typingUserRef.current =
        safeUserId;

      setTypingUser(
        safeUserId
      );

      /*
       * typing:stop event miss aina
       * indicator automatic ga clear.
       */
      typingTimerRef.current =
        window.setTimeout(() => {
          if (
            typingUserRef.current ===
            safeUserId
          ) {
            typingUserRef.current =
              "";

            setTypingUser(null);
          }

          typingTimerRef.current =
            null;
        }, 3000);
    };

    const handleTypingStop = (
      data = {}
    ) => {
      const safeUserId =
        normalizeId(
          data?.userId
        );

      if (!safeUserId) {
        return;
      }

      console.log(
        "TYPING STOP RECEIVED:",
        safeUserId
      );

      clearTypingUser(
        safeUserId
      );
    };

    socket.on(
      "typing:start",
      handleTypingStart
    );

    socket.on(
      "typing:stop",
      handleTypingStop
    );

    /*
     * Old backend/frontend compatibility.
     * New flow stable ayyaka remove cheyyachu.
     */
    socket.on(
      "typing",
      handleTypingStart
    );

    return () => {
      socket.off(
        "typing:start",
        handleTypingStart
      );

      socket.off(
        "typing:stop",
        handleTypingStop
      );

      socket.off(
        "typing",
        handleTypingStart
      );

      clearTypingTimer();

      typingUserRef.current = "";
    };
  }, []);


  /* =========================
   MESSAGE REACTIONS
========================= */

  useEffect(() => {
    const handleReactionUpdate = (
      payload = {}
    ) => {
      const messageId =
        normalizeId(
          payload?.messageId ||
          payload?.message?._id
        );

      const reactions =
        Array.isArray(
          payload?.reactions
        )
          ? payload.reactions
          : Array.isArray(
            payload?.message?.reactions
          )
            ? payload.message.reactions
            : [];

      if (!messageId) {
        return;
      }

      setMessages((previous) => {
        const safeMessages =
          Array.isArray(previous)
            ? previous
            : [];

        return safeMessages.map(
          (message) =>
            normalizeId(
              message?._id
            ) === messageId
              ? {
                ...message,
                reactions,
              }
              : message
        );
      });

      setChatSummaries(
        (previous) => {
          const safeSummaries =
            Array.isArray(previous)
              ? previous
              : [];

          return safeSummaries.map(
            (summary) => {
              const lastMessageId =
                normalizeId(
                  summary
                    ?.lastMessage
                    ?._id
                );

              if (
                lastMessageId !==
                messageId
              ) {
                return summary;
              }

              return {
                ...summary,

                lastMessage: {
                  ...summary.lastMessage,
                  reactions,
                },
              };
            }
          );
        }
      );

      setPinnedMessage(
        (previous) => {
          if (
            normalizeId(
              previous?._id
            ) !== messageId
          ) {
            return previous;
          }

          return {
            ...previous,
            reactions,
          };
        }
      );

      /*
       * Preserve reply and edit modes. A reaction update must
       * refresh only reaction data, not cancel the composer.
       */
      setReplyingTo(
        (previous) => {
          if (
            normalizeId(
              previous?._id
            ) !== messageId
          ) {
            return previous;
          }

          return {
            ...previous,
            reactions,
          };
        }
      );

      setEditingMessage(
        (previous) => {
          if (
            normalizeId(
              previous?._id
            ) !== messageId
          ) {
            return previous;
          }

          return {
            ...previous,
            reactions,
          };
        }
      );
    };

    socket.on(
      "messageReactionUpdated",
      handleReactionUpdate
    );

    return () => {
      socket.off(
        "messageReactionUpdated",
        handleReactionUpdate
      );
    };
  }, []);

  /* =========================
   MESSAGE PIN UPDATED
========================= */

  useEffect(() => {
    const handleMessagePinUpdated = (
      payload = {}
    ) => {
      const updatedMessage =
        payload?.message &&
          typeof payload.message ===
          "object"
          ? payload.message
          : null;

      const messageId =
        normalizeId(
          payload?.messageId ||
          updatedMessage?._id
        );

      if (!messageId) {
        return;
      }

      const clearedMessageIds =
        new Set(
          Array.isArray(
            payload?.clearedMessageIds
          )
            ? payload.clearedMessageIds
              .map((item) =>
                normalizeId(item)
              )
              .filter(Boolean)
            : []
        );

      const isPinned =
        Boolean(
          payload?.isPinned
        );

      console.log(
        "MESSAGE PIN UPDATED:",
        messageId,
        isPinned
      );

      const updatePinState = (
        message
      ) => {
        if (
          !message ||
          typeof message !==
          "object"
        ) {
          return message;
        }

        const currentMessageId =
          normalizeId(
            message?._id
          );

        /*
         * New message pin chesinappudu
         * previous pinned message clear.
         */
        if (
          clearedMessageIds.has(
            currentMessageId
          )
        ) {
          return {
            ...message,

            pinnedAt: null,
            pinnedBy: null,
          };
        }

        if (
          currentMessageId !==
          messageId
        ) {
          return message;
        }

        /*
         * Backend full message pampisthe
         * latest populated message merge.
         */
        if (updatedMessage) {
          return {
            ...message,
            ...updatedMessage,

            pinnedAt:
              isPinned
                ? (
                  updatedMessage
                    ?.pinnedAt ||
                  payload?.pinnedAt ||
                  message?.pinnedAt ||
                  null
                )
                : null,

            pinnedBy:
              isPinned
                ? (
                  updatedMessage
                    ?.pinnedBy ||
                  payload?.pinnedBy ||
                  message?.pinnedBy ||
                  null
                )
                : null,
          };
        }

        return {
          ...message,

          pinnedAt:
            isPinned
              ? (
                payload?.pinnedAt ||
                message?.pinnedAt ||
                null
              )
              : null,

          pinnedBy:
            isPinned
              ? (
                payload?.pinnedBy ||
                message?.pinnedBy ||
                null
              )
              : null,
        };
      };


      setMessages(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              updatePinState
            )
            : []
      );

      /*
 * Header pinned banner state update.
 */
      setPinnedMessage(
        (previous) => {
          const previousId =
            normalizeId(
              previous?._id
            );


          if (isPinned) {
            if (updatedMessage) {
              return {
                ...(previousId ===
                  messageId
                  ? previous
                  : {}),
                ...updatedMessage,
                pinnedAt:
                  updatedMessage
                    ?.pinnedAt ||
                  payload?.pinnedAt ||
                  new Date()
                    .toISOString(),
                pinnedBy:
                  updatedMessage
                    ?.pinnedBy ||
                  payload?.pinnedBy ||
                  null,
              };
            }

            return {
              _id: messageId,
              pinnedAt:
                payload?.pinnedAt ||
                new Date()
                  .toISOString(),
              pinnedBy:
                payload?.pinnedBy ||
                null,
            };
          }


          if (
            previousId ===
            messageId ||
            clearedMessageIds.has(
              previousId
            )
          ) {
            return null;
          }

          return previous;
        }
      );


      setChatSummaries(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              (summary) => {
                const lastMessage =
                  summary?.lastMessage;

                const lastMessageId =
                  normalizeId(
                    lastMessage?._id
                  );

                if (
                  lastMessageId !==
                  messageId &&
                  !clearedMessageIds.has(
                    lastMessageId
                  )
                ) {
                  return summary;
                }

                return {
                  ...summary,

                  lastMessage:
                    updatePinState(
                      lastMessage
                    ),
                };
              }
            )
            : []
      );

      /*
       * Reply composer lo selected message
       * pin state update.
       */
      setReplyingTo(
        (previous) => {
          const previousId =
            normalizeId(
              previous?._id
            );

          if (
            previousId !==
            messageId &&
            !clearedMessageIds.has(
              previousId
            )
          ) {
            return previous;
          }

          return updatePinState(
            previous
          );
        }
      );

      /*
       * Edit composer lo selected message
       * pin state update.
       */
      setEditingMessage(
        (previous) => {
          const previousId =
            normalizeId(
              previous?._id
            );

          if (
            previousId !==
            messageId &&
            !clearedMessageIds.has(
              previousId
            )
          ) {
            return previous;
          }

          return updatePinState(
            previous
          );
        }
      );
    };

    socket.on(
      "messagePinUpdated",
      handleMessagePinUpdated
    );

    return () => {
      socket.off(
        "messagePinUpdated",
        handleMessagePinUpdated
      );
    };
  }, []);

  /* =========================
    USER BLOCK STATUS UPDATED
 ========================= */

  useEffect(() => {
    const handleUserBlockStatusUpdated = (
      payload = {}
    ) => {
      const payloadUserId =
        normalizeId(
          payload?.userId
        );

      const activeChatId =
        normalizeId(
          selectedChatRef.current
        );

      if (
        !payloadUserId ||
        payloadUserId !==
        activeChatId
      ) {
        return;
      }

      const nextBlockStatus = {
        userId:
          payloadUserId,

        blockedByMe:
          Boolean(
            payload?.blockedByMe
          ),

        blockedMe:
          Boolean(
            payload?.blockedMe
          ),

        isBlocked:
          Boolean(
            payload?.isBlocked
          ),
      };

      console.log(
        "USER BLOCK STATUS UPDATED:",
        nextBlockStatus
      );

      setBlockStatus(
        nextBlockStatus
      );

      setBlockStatusError("");

      if (
        nextBlockStatus.isBlocked
      ) {
        setTypingUser(null);
        typingUserRef.current = "";

        setReplyingTo(null);
        setEditingMessage(null);
      }
    };

    socket.on(
      "userBlockStatusUpdated",
      handleUserBlockStatusUpdated
    );

    return () => {
      socket.off(
        "userBlockStatusUpdated",
        handleUserBlockStatusUpdated
      );
    };
  }, []);

  /* =========================
     MESSAGE STATUS
  ========================= */

  useEffect(() => {
    const statusPriority = {
      sending: 0,
      sent: 1,
      delivered: 2,
      read: 3,
      seen: 3,
    };

    const handleStatus = ({
      messageId,
      status,
    }) => {
      const normalizedStatus =
        status === "seen"
          ? "read"
          : status;

      console.log(
        "STATUS UPDATE:",
        messageId,
        normalizedStatus
      );

      setMessages((previous) =>
        previous.map((message) => {
          if (
            String(
              message?._id
            ) !==
            String(messageId)
          ) {
            return message;
          }

          const currentPriority =
            statusPriority[
            message?.status
            ] ?? 0;

          const incomingPriority =
            statusPriority[
            normalizedStatus
            ] ?? 0;

          if (
            incomingPriority <
            currentPriority
          ) {
            return message;
          }

          return {
            ...message,
            status:
              normalizedStatus,
          };
        })
      );

      setChatSummaries(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              (summary) => {
                if (
                  String(
                    summary
                      ?.lastMessage
                      ?._id
                  ) !==
                  String(
                    messageId
                  )
                ) {
                  return summary;
                }

                const currentPriority =
                  statusPriority[
                  summary
                    ?.lastMessage
                    ?.status
                  ] ?? 0;

                const incomingPriority =
                  statusPriority[
                  normalizedStatus
                  ] ?? 0;

                if (
                  incomingPriority <
                  currentPriority
                ) {
                  return summary;
                }

                return {
                  ...summary,
                  lastMessage: {
                    ...summary.lastMessage,
                    status:
                      normalizedStatus,
                  },
                };
              }
            )
            : []
      );
    };

    const handleDelivered = (
      payload = {}
    ) => {
      handleStatus({
        messageId:
          payload?.messageId,
        status: "delivered",
      });
    };

    const handleRead = (
      payload = {}
    ) => {
      handleStatus({
        messageId:
          payload?.messageId,
        status: "read",
      });
    };

    socket.on(
      "messageStatusUpdate",
      handleStatus
    );

    socket.on(
      "messageDelivered",
      handleDelivered
    );

    socket.on(
      "messageRead",
      handleRead
    );

    socket.on(
      "messageSeen",
      handleRead
    );

    return () => {
      socket.off(
        "messageStatusUpdate",
        handleStatus
      );

      socket.off(
        "messageDelivered",
        handleDelivered
      );

      socket.off(
        "messageRead",
        handleRead
      );

      socket.off(
        "messageSeen",
        handleRead
      );
    };
  }, []);

  /* =========================
     DELETE MESSAGE
  ========================= */

  useEffect(() => {
    const handleDelete = (
      payload = {}
    ) => {
      const messageId =
        normalizeId(
          payload?.messageId ||
          payload?.message?._id
        );

      const mode =
        String(
          payload?.mode ||
          "forEveryone"
        ).trim();

      const targetUserId =
        normalizeId(
          payload?.userId
        );

      const currentUserId =
        normalizeId(
          getStoredUser()
        );

      if (!messageId) {
        return;
      }

      /*
       * Delete-for-me event vere user
       * kosam ayithe current client ignore.
       */
      if (
        mode === "forMe" &&
        targetUserId &&
        currentUserId &&
        targetUserId !== currentUserId
      ) {
        return;
      }

      /*
       * =========================
       * DELETE FOR ME
       * =========================
       */
      if (mode === "forMe") {
        let latestRemainingMessage =
          null;

        setMessages(
          (previous) => {
            const safeMessages =
              Array.isArray(previous)
                ? previous
                : [];

            const nextMessages =
              safeMessages.filter(
                (message) =>
                  normalizeId(
                    message?._id
                  ) !== messageId
              );

            latestRemainingMessage =
              nextMessages.length > 0
                ? nextMessages[
                nextMessages.length - 1
                ]
                : null;

            return nextMessages;
          }
        );

        setPinnedMessage(
          (previous) =>
            normalizeId(
              previous?._id
            ) === messageId
              ? null
              : previous
        );

        setReplyingTo(
          (previous) =>
            normalizeId(
              previous?._id
            ) === messageId
              ? null
              : previous
        );

        setEditingMessage(
          (previous) =>
            normalizeId(
              previous?._id
            ) === messageId
              ? null
              : previous
        );

        /*
         * Sidebar cache immediate update.
         * Server refresh background lo
         * correct previous message resolve chesthundi.
         */
        setChatSummaries(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (summary) => {
                  const lastMessageId =
                    normalizeId(
                      summary
                        ?.lastMessage
                        ?._id
                    );

                  if (
                    lastMessageId !==
                    messageId
                  ) {
                    return summary;
                  }

                  return {
                    ...summary,

                    lastMessage:
                      latestRemainingMessage,
                  };
                }
              )
              : []
        );

        loadChatSummaries().catch(
          (error) => {
            console.error(
              "DELETE FOR ME SUMMARY REFRESH ERROR:",
              error.response?.data ||
              error.message
            );
          }
        );

        return;
      }

      /*
       * =========================
       * DELETE FOR EVERYONE
       * =========================
       */

      const serverMessage =
        payload?.message &&
          typeof payload.message ===
          "object"
          ? payload.message
          : null;

      const deletedAt =
        payload?.deletedAt ||
        serverMessage?.deletedAt ||
        new Date().toISOString();

      const createDeletedMessage = (
        existingMessage = {}
      ) => ({
        ...existingMessage,
        ...(serverMessage || {}),

        _id:
          serverMessage?._id ||
          existingMessage?._id ||
          messageId,

        text: "",
        image: "",
        sharedPost: null,

        replyTo: null,
        reactions: [],

        editedAt: null,

        pinnedAt: null,
        pinnedBy: null,

        deletedForEveryone: true,
        deletedAt,

        deletedBy:
          payload?.deletedBy ||
          serverMessage?.deletedBy ||
          null,
      });

      setMessages(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              (message) => {
                const currentMessageId =
                  normalizeId(
                    message?._id
                  );

                /*
                 * Original message ni
                 * deleted placeholder ga convert.
                 */
                if (
                  currentMessageId ===
                  messageId
                ) {
                  return createDeletedMessage(
                    message
                  );
                }

                /*
                 * Vere messages reply preview lo
                 * deleted message referenced unte
                 * preview ni kuda tombstone cheyyi.
                 */
                const replyToId =
                  normalizeId(
                    message?.replyTo
                  );

                if (
                  replyToId !== messageId ||
                  !message?.replyTo ||
                  typeof message.replyTo !==
                  "object"
                ) {
                  return message;
                }

                return {
                  ...message,

                  replyTo: {
                    ...message.replyTo,

                    text: "",
                    image: "",
                    sharedPost: null,

                    deletedForEveryone:
                      true,

                    deletedAt,
                  },
                };
              }
            )
            : []
      );

      /*
       * Deleted message pinned unte
       * header banner clear.
       */
      setPinnedMessage(
        (previous) =>
          normalizeId(
            previous?._id
          ) === messageId
            ? null
            : previous
      );

      /*
       * Reply composer lo selected
       * message deleted ayithe clear.
       */
      setReplyingTo(
        (previous) =>
          normalizeId(
            previous?._id
          ) === messageId
            ? null
            : previous
      );

      /*
       * Edit composer lo selected
       * message deleted ayithe clear.
       */
      setEditingMessage(
        (previous) =>
          normalizeId(
            previous?._id
          ) === messageId
            ? null
            : previous
      );

      /*
       * Sidebar last message immediate
       * deleted placeholder ga update.
       */
      setChatSummaries(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              (summary) => {
                const lastMessageId =
                  normalizeId(
                    summary
                      ?.lastMessage
                      ?._id
                  );

                if (
                  lastMessageId !==
                  messageId
                ) {
                  return summary;
                }

                return {
                  ...summary,

                  lastMessage:
                    createDeletedMessage(
                      summary.lastMessage
                    ),
                };
              }
            )
            : []
      );

      /*
       * Backend summary state tho
       * background synchronization.
       */
      loadChatSummaries().catch(
        (error) => {
          console.error(
            "DELETE FOR EVERYONE SUMMARY REFRESH ERROR:",
            error.response?.data ||
            error.message
          );
        }
      );
    };

    socket.on(
      "messageDeleted",
      handleDelete
    );

    return () => {
      socket.off(
        "messageDeleted",
        handleDelete
      );
    };
  }, [loadChatSummaries]);




  const pinnedMessageFromMessages =
    Array.isArray(messages)
      ? messages.find(
        (message) =>
          Boolean(
            message?.pinnedAt
          )
      ) || null
      : null;

  const resolvedPinnedMessage =
    pinnedMessageFromMessages ||
    pinnedMessage ||
    null;

  const requestMessageScroll = (
    messageId
  ) => {
    const normalizedMessageId =
      normalizeId(messageId);

    if (!normalizedMessageId) {
      return;
    }

    setMessageScrollRequest(
      (previous) => ({
        messageId:
          normalizedMessageId,

        requestKey:
          Number(
            previous?.requestKey ||
            0
          ) + 1,
      })
    );
  };

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,

        blockStatus,
        setBlockStatus,

        blockStatusLoading,
        blockStatusError,

        pinnedMessage:
          resolvedPinnedMessage,

        setPinnedMessage,

        messageScrollRequest,
        requestMessageScroll,

        replyingTo,
        setReplyingTo,

        editingMessage,
        setEditingMessage,

        messages,
        setMessages,

        messageSearchOpen,
        setMessageSearchOpen,

        messageSearchQuery,
        setMessageSearchQuery,

        messageSearchMatches,
        setMessageSearchMatches,

        activeSearchMatchIndex,
        setActiveSearchMatchIndex,

        onlineUsers,
        setOnlineUsers,

        lastSeenByUser,
        setLastSeenByUser,

        typingUser,
        setTypingUser,

        receivedRequests,
        setReceivedRequests,

        sentRequests,
        setSentRequests,

        notificationUnreadCount,
        setNotificationUnreadCount,
        loadNotifications,

        chatSummaries,
        setChatSummaries,

        summariesLoading,

        loadChatSummaries,

        socket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context =
    useContext(ChatContext);

  if (!context) {
    throw new Error(
      "useChat must be used inside ChatProvider"
    );
  }

  return context;
};
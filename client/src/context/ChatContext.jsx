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
  getReceivedRequests,
  getSentRequests,
} from "../services/chatRequestService";

import {
  getChatSummaries,
} from "../services/chatService";

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
    messages,
    setMessages,
  ] = useState([]);

  const [
    onlineUsers,
    setOnlineUsers,
  ] = useState([]);

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

  /* =========================
     SELECTED CHAT RESET
  ========================= */

  useEffect(() => {
    selectedChatRef.current =
      selectedChat;

    readReceiptIdsRef.current.clear();

    setReplyingTo(null);
    setTypingUser(null);

    typingUserRef.current = "";

    if (typingTimerRef.current) {
      window.clearTimeout(
        typingTimerRef.current
      );

      typingTimerRef.current = null;
    }
  }, [selectedChat]);

  /* =========================
     LOAD REQUESTS
  ========================= */

  const loadRequests =
    useCallback(async () => {
      try {
        const [
          received,
          sent,
        ] = await Promise.all([
          getReceivedRequests(),
          getSentRequests(),
        ]);

        setReceivedRequests(
          Array.isArray(
            received?.data?.requests
          )
            ? received.data.requests
            : []
        );

        setSentRequests(
          Array.isArray(
            sent?.data?.requests
          )
            ? sent.data.requests
            : []
        );
      } catch (error) {
        console.error(
          "LOAD CHAT REQUESTS ERROR:",
          error.response?.data ||
          error.message
        );
      }
    }, []);

  /* =========================
     LOAD CHAT SUMMARIES
  ========================= */

  const loadChatSummaries =
    useCallback(async () => {
      const token =
        localStorage.getItem("token");

      if (!token) {
        setChatSummaries([]);
        return;
      }

      try {
        setSummariesLoading(true);

        const response =
          await getChatSummaries();

        const summaries =
          response?.data?.chats;

        setChatSummaries(
          Array.isArray(summaries)
            ? summaries
            : []
        );
      } catch (error) {
        console.error(
          "LOAD CHAT SUMMARIES ERROR:",
          error.response?.data ||
          error.message
        );

        setChatSummaries([]);
      } finally {
        setSummariesLoading(false);
      }
    }, []);

  /* =========================
     INITIAL DATA
  ========================= */

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      return;
    }

    Promise.all([
      loadRequests(),
      loadChatSummaries(),
    ]).catch((error) => {
      console.error(
        "INITIAL CHAT DATA ERROR:",
        error
      );
    });
  }, [
    loadRequests,
    loadChatSummaries,
  ]);

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
      console.error(
        "Socket connection skipped: token or user ID missing"
      );

      return undefined;
    }

    const handleConnect = () => {
      console.log(
        "AUTHENTICATED SOCKET CONNECTED:",
        socket.id
      );
    };

    const handleOnlineUsers = (
      users
    ) => {
      const normalizedUsers =
        Array.isArray(users)
          ? users
            .map((user) =>
              normalizeId(user)
            )
            .filter(Boolean)
          : [];

      setOnlineUsers(
        normalizedUsers
      );
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "onlineUsers",
      handleOnlineUsers
    );

    if (socket.connected) {
      handleConnect();
    } else {
      connectSocket();
    }

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "onlineUsers",
        handleOnlineUsers
      );
    };
  }, []);

  /* =========================
     NEW MESSAGE
  ========================= */

  useEffect(() => {
    const handleMessage = (
      message
    ) => {
      console.log(
        "🔥 newMessage RECEIVED:",
        message
      );

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

      const selectedChatId =
        normalizeId(
          selectedChatRef.current
        );

      const isForCurrentUser =
        Boolean(currentUserId) &&
        receiverId === currentUserId;

      /*
       * URL pathname check remove chesam.
       * Selected chat ID match unte chaalu.
       */
      const isExactChatOpen =
        isForCurrentUser &&
        Boolean(selectedChatId) &&
        senderId === selectedChatId;

      if (
        isForCurrentUser &&
        message?._id
      ) {
        socket.emit(
          "messageDelivered",
          {
            messageId:
              message._id,
          }
        );
      }

      if (isExactChatOpen) {
        setMessages(
          (previous) => {
            const alreadyExists =
              previous.some(
                (item) =>
                  normalizeId(
                    item?._id
                  ) ===
                  normalizeId(
                    message?._id
                  )
              );

            if (alreadyExists) {
              return previous;
            }

            return [
              ...previous,
              message,
            ];
          }
        );

        /*
         * Current conversation open kabatti
         * immediately read receipt send.
         */
        if (message?._id) {
          readReceiptIdsRef.current.add(
            normalizeId(
              message._id
            )
          );

          socket.emit(
            "messageRead",
            {
              messageId:
                message._id,
            }
          );
        }
      }

      if (
        isForCurrentUser &&
        !isExactChatOpen
      ) {
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

            if (
              existingIndex === -1
            ) {
              return safeSummaries;
            }

            const updatedSummaries =
              safeSummaries.map(
                (
                  summary,
                  index
                ) => {
                  if (
                    index !==
                    existingIndex
                  ) {
                    return summary;
                  }

                  return {
                    ...summary,

                    lastMessage:
                      message,

                    unreadCount:
                      (Number(
                        summary
                          ?.unreadCount
                      ) || 0) + 1,
                  };
                }
              );

            return updatedSummaries.sort(
              (
                first,
                second
              ) => {
                const firstTime =
                  new Date(
                    first
                      ?.lastMessage
                      ?.createdAt ||
                    0
                  ).getTime();

                const secondTime =
                  new Date(
                    second
                      ?.lastMessage
                      ?.createdAt ||
                    0
                  ).getTime();

                return (
                  secondTime -
                  firstTime
                );
              }
            );
          }
        );
      }

      loadChatSummaries().catch(
        (error) => {
          console.error(
            "MESSAGE SUMMARY REFRESH ERROR:",
            error.response?.data ||
            error.message
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
     MARK OPEN CHAT AS READ
  ========================= */

  useEffect(() => {
    const currentUserId =
      normalizeId(
        getStoredUser()
      );

    const selectedChatId =
      normalizeId(
        selectedChat
      );

    if (
      !currentUserId ||
      !selectedChatId ||
      !socket.connected
    ) {
      return;
    }

    messages.forEach(
      (message) => {
        const messageId =
          normalizeId(
            message?._id
          );

        const senderId =
          normalizeId(
            message?.sender
          );

        const receiverId =
          normalizeId(
            message?.receiver
          );

        const alreadyRead =
          message?.status === "read" ||
          message?.status === "seen";

        const isReceivedMessage =
          senderId ===
          selectedChatId &&
          receiverId ===
          currentUserId;

        if (
          !messageId ||
          messageId.startsWith(
            "temp-"
          ) ||
          !isReceivedMessage ||
          alreadyRead ||
          readReceiptIdsRef.current.has(
            messageId
          )
        ) {
          return;
        }

        readReceiptIdsRef.current.add(
          messageId
        );

        socket.emit(
          "messageRead",
          {
            messageId,
          }
        );
      }
    );
  }, [
    messages,
    selectedChat,
  ]);

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
          payload?.messageId
        );

      const reactions =
        Array.isArray(
          payload?.reactions
        )
          ? payload.reactions
          : [];

      if (!messageId) {
        return;
      }

      console.log(
        "MESSAGE REACTION UPDATED:",
        messageId,
        reactions
      );

      setMessages((previous) =>
        previous.map((message) => {
          if (
            normalizeId(
              message?._id
            ) !== messageId
          ) {
            return message;
          }

          return {
            ...message,
            reactions,
          };
        })
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
    const handleDelete = ({
      messageId,
    } = {}) => {
      if (!messageId) {
        return;
      }

      setMessages((previous) =>
        previous.filter(
          (message) =>
            String(
              message?._id
            ) !==
            String(messageId)
        )
      );

      loadChatSummaries().catch(
        (error) => {
          console.error(
            "DELETE SUMMARY REFRESH ERROR:",
            error
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

  /* =========================
     CHAT REQUEST EVENTS
  ========================= */

  useEffect(() => {
    const refreshChatData =
      async () => {
        try {
          await Promise.all([
            loadRequests(),
            loadChatSummaries(),
          ]);
        } catch (error) {
          console.error(
            "REFRESH CHAT DATA ERROR:",
            error
          );
        }
      };

    socket.on(
      "newChatRequest",
      refreshChatData
    );

    socket.on(
      "chatRequestAccepted",
      refreshChatData
    );

    socket.on(
      "chatRequestDeclined",
      refreshChatData
    );

    return () => {
      socket.off(
        "newChatRequest",
        refreshChatData
      );

      socket.off(
        "chatRequestAccepted",
        refreshChatData
      );

      socket.off(
        "chatRequestDeclined",
        refreshChatData
      );
    };
  }, [
    loadRequests,
    loadChatSummaries,
  ]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,

        replyingTo,
        setReplyingTo,

        messages,
        setMessages,

        onlineUsers,
        setOnlineUsers,

        typingUser,
        setTypingUser,

        receivedRequests,
        setReceivedRequests,

        sentRequests,
        setSentRequests,

        chatSummaries,
        setChatSummaries,

        summariesLoading,

        loadRequests,
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
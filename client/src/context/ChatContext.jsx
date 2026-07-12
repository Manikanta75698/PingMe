import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import socket from "../socket/socket";

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
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value?._id || value?.id || ""
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

    if (!token) return;

    Promise.all([
      loadRequests(),
      loadChatSummaries(),
    ]);
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

      return;
    }

    const handleConnect = () => {
      console.log(
        "SOCKET CONNECTED:",
        socket.id
      );

      socket.emit(
        "join",
        currentUserId
      );
    };

    const handleOnlineUsers = (
      users
    ) => {
      const normalizedUsers =
        Array.isArray(users)
          ? users.map((id) =>
              String(id)
            )
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
      socket.connect();
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
        "🔥 newMessage RECEIVED",
        message
      );

      const currentUser =
        getStoredUser();

      const currentUserId =
        normalizeId(currentUser);

      const receiverId =
        normalizeId(
          message?.receiver
        );

      const senderId =
        normalizeId(
          message?.sender
        );

      const selectedChatId =
        normalizeId(selectedChat);

      const isForCurrentUser =
        receiverId ===
        currentUserId;

      const belongsToOpenChat =
        selectedChatId &&
        (senderId ===
          selectedChatId ||
          receiverId ===
            selectedChatId);

      if (isForCurrentUser) {
        socket.emit(
          "messageDelivered",
          {
            messageId:
              message?._id,
          }
        );
      }

      if (belongsToOpenChat) {
        setMessages((previous) => {
          const alreadyExists =
            previous.some(
              (item) =>
                item?._id ===
                message?._id
            );

          if (alreadyExists) {
            return previous;
          }

          return [
            ...previous,
            message,
          ];
        });
      }

      loadChatSummaries();
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
  }, [
    selectedChat,
    loadChatSummaries,
  ]);

  /* =========================
     TYPING
  ========================= */

  useEffect(() => {
    let typingTimer;

    const handleTyping = (
      data
    ) => {
      setTypingUser(
        data?.userId || null
      );

      clearTimeout(
        typingTimer
      );

      typingTimer = setTimeout(
        () => {
          setTypingUser(null);
        },
        2000
      );
    };

    socket.on(
      "typing",
      handleTyping
    );

    return () => {
      clearTimeout(
        typingTimer
      );

      socket.off(
        "typing",
        handleTyping
      );
    };
  }, []);

  /* =========================
     MESSAGE STATUS
  ========================= */

  useEffect(() => {
    const handleStatus = ({
      messageId,
      status,
    }) => {
      console.log(
        "STATUS UPDATE:",
        messageId,
        status
      );

      setMessages((previous) =>
        previous.map((message) =>
          message?._id ===
          messageId
            ? {
                ...message,
                status,
              }
            : message
        )
      );

      setChatSummaries(
        (previous) =>
          previous.map(
            (summary) => {
              if (
                summary
                  ?.lastMessage
                  ?._id !==
                messageId
              ) {
                return summary;
              }

              return {
                ...summary,
                lastMessage: {
                  ...summary.lastMessage,
                  status,
                },
              };
            }
          )
      );
    };

    socket.on(
      "messageStatusUpdate",
      handleStatus
    );

    return () => {
      socket.off(
        "messageStatusUpdate",
        handleStatus
      );
    };
  }, []);

  /* =========================
     DELETE MESSAGE
  ========================= */

  useEffect(() => {
    const handleDelete = (
      messageId
    ) => {
      setMessages((previous) =>
        previous.filter(
          (message) =>
            message?._id !==
            messageId
        )
      );

      loadChatSummaries();
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
        await Promise.all([
          loadRequests(),
          loadChatSummaries(),
        ]);
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

export const useChat = () =>
  useContext(ChatContext);
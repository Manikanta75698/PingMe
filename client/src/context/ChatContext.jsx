import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import socket from "../socket/socket";

import {
  getReceivedRequests,
  getSentRequests,
} from "../services/chatRequestService";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);

  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  const loadRequests = useCallback(async () => {
    try {
      const [received, sent] = await Promise.all([
        getReceivedRequests(),
        getSentRequests(),
      ]);

      setReceivedRequests(
        Array.isArray(received?.data?.requests)
          ? received.data.requests
          : []
      );

      setSentRequests(
        Array.isArray(sent?.data?.requests)
          ? sent.data.requests
          : []
      );
    } catch (error) {
      console.error(
        "LOAD CHAT REQUESTS ERROR:",
        error.response?.data || error.message
      );
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    loadRequests();
  }, [loadRequests]);


  useEffect(() => {
    const token = localStorage.getItem("token");

    let currentUser = null;

    try {
      currentUser = JSON.parse(
        localStorage.getItem("user")
      );
    } catch (error) {
      console.error(
        "Unable to read stored user:",
        error
      );
    }

    const currentUserId =
      currentUser?._id || currentUser?.id;

    if (!token || !currentUserId) {
      console.error(
        "Socket connection skipped: token or user ID missing"
      );
      return;
    }

    const normalizedUserId =
      String(currentUserId);

    const handleConnect = () => {
      console.log(
        "SOCKET CONNECTED:",
        socket.id
      );

      console.log(
        "JOINING USER:",
        normalizedUserId
      );

      socket.emit(
        "join",
        normalizedUserId
      );
    };

    const handleOnlineUsers = (users) => {
      const normalizedUsers =
        Array.isArray(users)
          ? users.map((id) => String(id))
          : [];

      console.log(
        "ONLINE USERS:",
        normalizedUsers
      );

      setOnlineUsers(normalizedUsers);
    };

    // First listeners register cheyyali
    socket.on("connect", handleConnect);

    // Backend event name exact same undali
    socket.on(
      "onlineUsers",
      handleOnlineUsers
    );

    // Tarvata socket connect/join
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


  useEffect(() => {

    const handleMessage = (message) => {
      console.log("🔥 newMessage RECEIVED", message);
      const currentUser = JSON.parse(localStorage.getItem("user"));

      const receiverId =
        typeof message.receiver === "object"
          ? message.receiver?._id ||
          message.receiver?.id
          : message.receiver;

      // Delivered acknowledgement
      const currentUserId =
        currentUser?._id || currentUser?.id;

      if (
        receiverId &&
        currentUserId &&
        String(receiverId) === String(currentUserId)
      ) {
        socket.emit("messageDelivered", {
          messageId: message._id,
        });
      }

      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) {
          return prev;
        }

        return [...prev, message];
      });
    };

    socket.on("newMessage", handleMessage);

    return () => {
      socket.off("newMessage", handleMessage);
    };
  }, []);


  useEffect(() => {
    const handleTyping = (data) => {
      setTypingUser(data.userId);

      setTimeout(() => {
        setTypingUser(null);
      }, 2000);
    };

    socket.on("typing", handleTyping);

    return () => {
      socket.off("typing", handleTyping);
    };
  }, []);

  useEffect(() => {
    const handleStatus = ({ messageId, status }) => {

      console.log("STATUS UPDATE:", messageId, status);

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, status }
            : msg
        )
      );
    };

    socket.on("messageStatusUpdate", handleStatus);

    return () => {
      socket.off("messageStatusUpdate", handleStatus);
    };
  }, []);

  useEffect(() => {
    const handleDelete = (messageId) => {
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== messageId)
      );
    };

    socket.on("messageDeleted", handleDelete);

    return () => {
      socket.off("messageDeleted", handleDelete);
    };
  }, []);


  useEffect(() => {
    const handleNewRequest = () => loadRequests();
    const handleAccepted = () => loadRequests();
    const handleDeclined = () => loadRequests();

    socket.on("newChatRequest", handleNewRequest);
    socket.on("chatRequestAccepted", handleAccepted);
    socket.on("chatRequestDeclined", handleDeclined);

    return () => {
      socket.off("newChatRequest", handleNewRequest);
      socket.off("chatRequestAccepted", handleAccepted);
      socket.off("chatRequestDeclined", handleDeclined);
    };
  }, [loadRequests]);


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

        loadRequests,

        socket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
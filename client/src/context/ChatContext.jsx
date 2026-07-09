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
      const received = await getReceivedRequests();
      const sent = await getSentRequests();

      setReceivedRequests(received.data.requests);
      setSentRequests(sent.data.requests);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    loadRequests();
  }, [loadRequests]);


  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) return;

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      console.log("SOCKET CONNECTED:", socket.id);
      console.log("USER:", user);

      socket.emit("join", user.id);

      console.log("JOIN EMITTED");
    };

    const handleOnlineUsers = (users) => {
      console.log("ONLINE USERS:", users);
      setOnlineUsers(users);
    };

    socket.on("connect", handleConnect);
    socket.on("online-users", handleOnlineUsers);

    // Socket already connected ayithe immediate join
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("online-users", handleOnlineUsers);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (message) => {
      console.log("🔥 newMessage RECEIVED", message);
      const currentUser = JSON.parse(localStorage.getItem("user"));

      const receiverId =
        typeof message.receiver === "object"
          ? message.receiver._id
          : message.receiver;

      // Delivered acknowledgement
      if (receiverId === (currentUser.id || currentUser._id)) {
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
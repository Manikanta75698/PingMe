import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import socket from "../socket/socket";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);

  // =========================
  // SOCKET CONNECT + ONLINE USERS
  // =========================
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

  // =========================
  // NEW MESSAGE HANDLER
  // =========================
  useEffect(() => {
    const handleMessage = (message) => {
      const currentUser = JSON.parse(localStorage.getItem("user"));

      const receiverId =
        typeof message.receiver === "object"
          ? message.receiver._id
          : message.receiver;

      console.log("========= NEW MESSAGE =========");
      console.log("Current User:", currentUser.id);
      console.log("Receiver:", receiverId);
      console.log("Message:", message);

      // Message delivered
      if (
        receiverId === currentUser.id &&
        message.status === "sent"
      ) {
        socket.emit("messageDelivered", {
          messageId: message._id,
        });
      }

      setMessages((prev) => {
        const exists = prev.some(
          (m) => m._id === message._id
        );

        if (exists) return prev;

        return [...prev, message];
      });
    };

    socket.on("newMessage", handleMessage);

    return () => {
      socket.off("newMessage", handleMessage);
    };
  }, []);

  // =========================
  // TYPING INDICATOR
  // =========================
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
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
              ...msg,
              status,
            }
            : msg
        )
      );
    };

    socket.on("messageStatusUpdate", handleStatus);

    return () => {
      socket.off("messageStatusUpdate", handleStatus);
    };
  }, []);

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

        socket,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
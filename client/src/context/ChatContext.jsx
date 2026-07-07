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

    socket.emit("join", user._id);

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    socket.on("online-users", handleOnlineUsers);

    return () => {
      socket.off("online-users", handleOnlineUsers);
    };
  }, []);

  // =========================
  // NEW MESSAGE HANDLER
  // =========================
  useEffect(() => {
    const handleMessage = (message) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m._id === message._id);
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
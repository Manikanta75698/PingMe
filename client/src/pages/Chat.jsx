import { useRef } from "react";
import "./Chat.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket";

function Chat() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const [typingUser, setTypingUser] =
    useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] =
    useState([]);
  const [darkMode, setDarkMode] =
    useState(
      localStorage.getItem("darkMode") ===
      "true"
    );
  const [selectedUser, setSelectedUser] =
    useState(
      localStorage.getItem("selectedUser")
    );
  const [unreadMessages, setUnreadMessages] =
    useState({});
  const messagesEndRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(
      "selectedUser"
    );

    navigate("/");
  };
  const toggleDarkMode = () => {
    const newMode = !darkMode;

    setDarkMode(newMode);

    localStorage.setItem(
      "darkMode",
      newMode
    );
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(
        "https://pingme-api-u477.onrender.com/api/messages"
      );

      setMessages(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    fetchMessages();

    socket.emit(
      "join",
      user?.name || "Guest"
    );
    socket.on(
      "receive_private_message",
      (data) => {
        setMessages((prev) => [
          ...prev,
          {
            _id: Date.now(),
            sender: data.sender,
            receiver: data.receiver,
            text: data.text,
            createdAt: new Date(),
          },
        ]);

        // Increase unread count only if that chat is not open
        if (selectedUser !== data.sender) {
          setUnreadMessages((prev) => ({
            ...prev,
            [data.sender]:
              (prev[data.sender] || 0) + 1,
          }));
        }
      }
    );

    socket.on("user_typing", (username) => {
      setTypingUser(username);

      setTimeout(() => {
        setTypingUser("");
      }, 2000);
    });
    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("receive_private_message");
      socket.off("online_users");
      socket.off("user_typing");
    };
  }, []);

  const handleSend = async () => {
    if (!selectedUser) {
      alert("Select a user first");
      return;
    }
    if (!message.trim()) return;

    try {
      await axios.post(
        "https://pingme-api-u477.onrender.com/api/messages",
        {
          sender: user?.name || "Guest",
          receiver: selectedUser,
          text: message,
        }
      );

      socket.emit("private_message", {
        sender: user?.name || "Guest",
        receiver: selectedUser,
        text: message,
      });

      setMessage("");
    } catch (error) {
      console.log(error);
    }
  };

  const filteredMessages = messages.filter(
    (msg) =>
      (msg.sender === user?.name &&
        msg.receiver === selectedUser) ||
      (msg.sender === selectedUser &&
        msg.receiver === user?.name)
  );

  return (
    <div
      className={`chat-container ${darkMode ? "dark" : ""
        }`}
    >
      <div className="sidebar">
        <h2>PingMe 💬</h2>

        <h3>Online Users</h3>

        {onlineUsers
          .filter(
            (user, index, self) =>
              index ===
              self.findIndex(
                (u) => u.username === user.username
              )
          )
          .map((onlineUser, index) => (
            <div
              key={`${onlineUser.id}-${index}`}
              className="user"
              onClick={() => {
                setSelectedUser(onlineUser.username);

                localStorage.setItem(
                  "selectedUser",
                  onlineUser.username
                );
              }}
            >
              🟢 {onlineUser.username}

              {unreadMessages[onlineUser.username] > 0 && (
                <span className="unread-badge">
                  {unreadMessages[onlineUser.username]}
                </span>
              )}
            </div>
          ))}
      </div>

      <div className="chat-area">

        <div className="chat-header">
          <h3>
            {selectedUser
              ? `Chat with ${selectedUser}`
              : "Select a User"}
          </h3>

          <div>
            <button
              className="dark-btn"
              onClick={toggleDarkMode}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="messages">
          {filteredMessages.map((msg) => (
            <div
              key={msg._id}
              className={
                msg.sender === user?.name
                  ? "message my-message"
                  : "message other-message"
              }
            >

              {msg.text}

              <small className="message-time">
                {new Date(
                  msg.createdAt || Date.now()
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
          ))}
          <div ref={messagesEndRef}></div>
        </div>
        {typingUser && (
          <p
            style={{
              padding: "10px",
              color: "gray",
              fontStyle: "italic",
            }}
          >
            {typingUser} is typing...
          </p>
        )}

        <div className="chat-input">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);

              socket.emit(
                "typing",
                user?.name || "Guest"
              );
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
          />

          <button onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
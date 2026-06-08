import "./Chat.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket";

function Chat() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const [typingUser, setTypingUser] =
    useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] =
    useState([]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
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
    fetchMessages();

    socket.emit(
      "join",
      user?.name || "Guest"
    );
    socket.on("receive_message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now(),
          username: data.username,
          text: data.text,
        },
      ]);
    });

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
      socket.off("receive_message");
      socket.off("online_users");
      socket.off("user_typing");
    };
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      await axios.post(
        "https://pingme-api-u477.onrender.com/api/messages",
        {
          username: user?.name || "Guest",
          text: message,
        }
      );

      socket.emit("send_message", {
        username: user?.name || "Guest",
        text: message,
      });

      setMessage("");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="chat-container">
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
            >
              🟢 {onlineUser.username}
            </div>
          ))}
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <h3>Chat Room</h3>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
        <div className="messages">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={
                msg.username === user?.name
                  ? "message my-message"
                  : "message other-message"
              }
            >
              <small>
                <strong>{msg.username}</strong>
              </small>

              <br />

              {msg.text}
            </div>
          ))}
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
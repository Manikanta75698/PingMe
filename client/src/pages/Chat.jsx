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
  const [selectedUser, setSelectedUser] =
    useState(
      localStorage.getItem("selectedUser")
    );
  const messagesEndRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(
      "selectedUser"
    );

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
              onClick={() => {
                setSelectedUser(onlineUser.username);

                localStorage.setItem(
                  "selectedUser",
                  onlineUser.username
                );
              }}
            >
              🟢 {onlineUser.username}
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

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        <div className="messages">
          {filteredMessages.map((msg) => (
            <div
              key={`${msg._id}-${msg.sender}`}
              className={
                msg.sender === user?.name
                  ? "message my-message"
                  : "message other-message"
              }
            >
              <small>
                <strong>
                  {msg.sender || msg.username}
                </strong>
              </small>

              <br />

              {msg.text}

              <br />

              <small
  style={{
    color:
      msg.sender === user?.name
        ? "#dbeafe"
        : "#64748b",
    fontSize: "11px",
    display: "block",
    textAlign: "right",
    marginTop: "5px",
  }}
>
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
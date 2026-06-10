import { useRef } from "react";
import "./Chat.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket";

function Chat() {
  console.log("Chat Component Loaded 🔥");
  const navigate = useNavigate();
  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );
  const [selectedUser, setSelectedUser] =
    useState(localStorage.getItem("selectedUser"));
  const selectedUserRef = useRef(selectedUser);

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
  const [unreadMessages, setUnreadMessages] =
    useState({});
  const messagesRef = useRef(null);

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

  const markMessagesAsSeen = async (sender) => {
    try {
      await axios.put(
        "https://pingme-api-u477.onrender.com/api/messages/seen",
        {
          sender,
          receiver: user?.name,
        }
      );

      socket.emit("message_seen", {
        sender,
        receiver: user?.name,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === sender &&
            msg.receiver === user?.name
            ? { ...msg, status: "seen" }
            : msg
        )
      );

    } catch (error) {
      console.log(error);
    }
  };

  const [profilePic, setProfilePic] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    user?.profilePic
      ? `https://pingme-api-u477.onrender.com/uploads/${user.profilePic}`
      : ""
  );

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop =
        messagesRef.current.scrollHeight;
    }
  }, [messages, selectedUser]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    fetchMessages();

    if (socket.connected) {
      console.log("Already Connected:", socket.id);

      socket.emit(
        "join",
        user?.name || "Guest"
      );
    }

    socket.on("connect", () => {
      console.log("Connected:", socket.id);

      socket.emit(
        "join",
        user?.name || "Guest"
      );
    });

    socket.on(
      "receive_private_message",
      (data) => {
        console.log("Message received:", data);

        setMessages((prev) => [
          ...prev,
          {
            _id: data._id || Date.now(),
            sender: data.sender,
            receiver: data.receiver,
            text: data.text,
            createdAt: data.createdAt || new Date(),
            status: data.status || "delivered",
          },
        ]);

        if (selectedUserRef.current === data.sender) {
          markMessagesAsSeen(data.sender);
        } else {
          setUnreadMessages((prev) => ({
            ...prev,
            [data.sender]:
              (prev[data.sender] || 0) + 1,
          }));
        }
      }
    );

    socket.on("user_typing", (username) => {
      console.log(
        "Typing from:", username,
        "Current chat:", selectedUserRef.current
      );
      if (selectedUserRef.current === username) {
        setTypingUser(username);

        setTimeout(() => {
          setTypingUser("");
        }, 2000);
      }
    });
    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("message_seen_update", (data) => {
      console.log("Seen update:", data);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === user?.name &&
            msg.receiver === data.receiver
            ? {
              ...msg,
              status: "seen",
            }
            : msg
        )
      );
    });

    return () => {
      socket.off("connect");
      socket.off("receive_private_message");
      socket.off("online_users");
      socket.off("user_typing");
      socket.off("message_seen_update");
    };
  }, []);

  const handleProfileUpload = async () => {
    if (!profilePic) {
      alert("Select an image");
      return;
    }

    const formData = new FormData();

    formData.append("profilePic", profilePic);
    formData.append("userId", user._id);

    try {
      const res = await axios.put(
        "https://pingme-api-u477.onrender.com/api/users/upload",
        formData
      );

      const updatedUser = res.data.user;

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setImagePreview(
        `https://pingme-api-u477.onrender.com/uploads/${updatedUser.profilePic}`
      );

      alert("Profile updated ✅");

    } catch (error) {
      console.log(error);
    }
  };

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
        status: "sent",
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

                markMessagesAsSeen(onlineUser.username);

                setUnreadMessages((prev) => ({
                  ...prev,
                  [onlineUser.username]: 0,
                }));

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
            <div className="profile-section">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="profile-pic"
                />
              ) : (
                <div className="profile-placeholder">
                  👤
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setProfilePic(e.target.files[0]);

                  setImagePreview(
                    URL.createObjectURL(
                      e.target.files[0]
                    )
                  );
                }}
              />

              <button onClick={handleProfileUpload}>
                Upload
              </button>
            </div>
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

        <div className="messages" ref={messagesRef}>
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

                {msg.sender === user?.name && (
                  <span
                    className={`message-status ${msg.status === "seen" ? "seen" : ""
                      }`}
                  >
                    {msg.status === "sent" && "✔"}
                    {(msg.status === "delivered" ||
                      msg.status === "seen") && "✔✔"}
                  </span>
                )}
              </small>
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

              // Emit typing event only if a user is selected
              if (selectedUser) {
                socket.emit("typing", {
                  sender: user?.name || "Guest",
                  receiver: selectedUser,
                });
                console.log(
                  "Typing sent to:",
                  selectedUser
                );
              }
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
import { useState, useEffect, useRef } from "react";
import "./Chat.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../socket";
import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";

function Chat() {
  const navigate = useNavigate();
  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );
  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserRef = useRef(selectedUser);
  const [typingUser, setTypingUser] =
    useState("");
  const [message, setMessage] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const [chatImagePreview, setChatImagePreview] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] =
    useState([]);
  const [showChat, setShowChat] =
    useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [darkMode, setDarkMode] =
    useState(
      localStorage.getItem("darkMode") ===
      "true"
    );
  const [unreadMessages, setUnreadMessages] =
    useState({});
  const menuRef = useRef(null);
  const emojiRef = useRef(null);
  const [profilePic, setProfilePic] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    user?.profilePic || ""
  );
  const [search, setSearch] = useState("");

  const [searchResults, setSearchResults] = useState([]);
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);
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
        "https://pingme-api-new.onrender.com/api/messages",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setMessages(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const markMessagesAsSeen = async (sender) => {
    try {
      await axios.put(
        "https://pingme-api-new.onrender.com/api/messages/seen",
        {
          sender,
          receiver: user.username,
        }
      );

      socket.emit("message_seen", {
        sender,
        receiver: user.username,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === sender &&
            msg.receiver === user.username
            ? { ...msg, status: "seen" }
            : msg
        )
      );

    } catch (error) {
      console.log("SEEN ERROR:", error);
      console.log(
        "PROFILE RESPONSE:",
        error.response?.data
      );
    }
  };

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
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  useEffect(() => {
    const handleEmojiOutside = (event) => {
      if (
        emojiRef.current &&
        !emojiRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleEmojiOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleEmojiOutside
      );
    };
  }, []);

  useEffect(() => {
    fetchMessages();

    if (socket.connected) {
      socket.emit("join", {
        userId: user.id || user._id,
        username: user.username,
        profilePic: user?.profilePic || "",
      });
    }
    socket.on("connect", () => {
      socket.emit("join", {
        userId: user.id || user._id,
        username: user.username,
        profilePic: user?.profilePic || "",
      });
    });

    socket.on(
      "receive_private_message",
      (data) => {
        console.log("Message received:", data);

        if (
          data.sender === user.username &&
          data.receiver === user.username
        ) {
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            _id: data._id || Date.now(),
            sender: data.sender,
            receiver: data.receiver,

            text: data.text,
            image: data.image,
            createdAt: data.createdAt || new Date(),
            status: data.status || "delivered",
          },
        ]);

        if (data.sender !== user.username) {
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
          msg.sender === user.username &&
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

  useEffect(() => {

    const searchUsers = async () => {

      if (!search.trim()) {
        setSearchResults([]);
        return;
      }

      try {

        const res = await axios.get(
          `https://pingme-api-new.onrender.com/api/users/search?keyword=${search}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setSearchResults(res.data.users);

      } catch (error) {

        console.log(
          "SEARCH ERROR:",
          error
        );

      }
    };


    const timer = setTimeout(() => {
      searchUsers();
    }, 500);


    return () => clearTimeout(timer);

  }, [search]);


  const handleProfileUpload = async () => {
    if (!profilePic) {
      toast.error("Select an image first");
      return;
    }

    const formData = new FormData();

    formData.append("profilePic", profilePic);

    try {
      const res = await axios.put(
        "https://pingme-api-new.onrender.com/api/users/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const updatedUser = {
        ...user,
        profilePic: res.data.profilePic,
      };
      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setImagePreview(updatedUser.profilePic);

      toast.success("Profile updated ✅");

    } catch (error) {
      console.log(error);
      toast.error("Failed to update profile");
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) =>
      prev + emojiData.emoji
    );

    setShowEmojiPicker(false);
  };

  const handleSend = async () => {
    if (!selectedUser) {
      toast.error("Select a user first");
      return;
    }

    if (!message.trim() && !chatImage) {
      return;
    }

    try {
      const formData = new FormData();

      formData.append(
        "sender",
        user.username
      );
      formData.append(
        "receiver",
        selectedUser
      );

      formData.append(
        "text",
        message
      );

      if (chatImage) {
        formData.append(
          "image",
          chatImage
        );
      }

      const res = await axios.post(
        "https://pingme-api-new.onrender.com/api/messages",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const newMessage = {
        ...res.data,
        status: "sent",
      };

      // Sender screen lo immediate ga show cheyyadaniki
      setMessages((prev) => [
        ...prev,
        newMessage,
      ]);

      // Receiver ki socket dwara pampadaniki
      socket.emit(
        "private_message",
        newMessage
      );

      setMessage("");
      setChatImage(null);
      setChatImagePreview("");

    } catch (error) {
      console.log("SEND ERROR:", error);
    }
  };

  const deleteForMe = async (id) => {
    try {
      await axios.put(
        `https://pingme-api-new.onrender.com/api/messages/delete-for-me/${id}`,
        {
          userId: user.username,
        }
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === id
            ? {
              ...msg,
              deletedFor: [
                ...(msg.deletedFor || []),
                user.username,
              ],
            }
            : msg
        )
      );

      setShowDeleteMenu(null);

      toast.success("Deleted for me");

    } catch (error) {
      console.log(error);
    }
  };


  const deleteForEveryone = async (id) => {
    try {
      await axios.put(
        `https://pingme-api-new.onrender.com/api/messages/delete-for-everyone/${id}`,
        {
          userId: user.username,
        }
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === id
            ? {
              ...msg,
              isDeleted: true,
              text: "",
              image: "",
            }
            : msg
        )
      );

      setShowDeleteMenu(null);

      toast.success("Message deleted");

    } catch (error) {
      console.log(error);
    }
  };

  const selectedUserData = onlineUsers.find(
    (u) => u.username === selectedUser
  );
  console.log("ONLINE USERS:", onlineUsers);

  const filteredMessages = messages.filter(
    (msg) =>
      (msg.sender === user.username &&
        msg.receiver === selectedUser) ||
      (msg.sender === selectedUser &&
        msg.receiver === user.username)
  );

  return (
    <div
      className={`chat-container ${darkMode ? "dark" : ""
        }`}
    >
      <div className={`sidebar ${showChat ? "mobile-hide" : ""}`}>

        <div className="message-header">

          <h2>
            Messages
          </h2>

          <img
            src={imagePreview}
            className="mini-profile"
            alt="Profile"
            onClick={() =>
              navigate(`/profile/${user.id || user._id}`)
            }
          />

        </div>


        <div className="search-user">

          <input
            type="text"
            placeholder="🔍 Search users"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />


          {searchResults.length > 0 && (

            <div className="search-results">

              {searchResults.map((searchUser) => (

                <div
                  key={searchUser._id}
                  className="search-user-card"
                  onClick={() => {

                    navigate(`/profile/${searchUser._id}`)
                    setSearch("");

                    setSearchResults([]);

                  }}
                >

                  <img
                    src={searchUser.profilePic}
                    alt="user"
                    className="search-avatar"
                  />


                  <div>

                    <h4>
                      {searchUser.name}
                    </h4>

                    <p>
                      @{searchUser.username}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>


        <h3 className="chat-list-title">
          Chats
        </h3>


        {onlineUsers
          .filter(
            (onlineUser) =>
              onlineUser.username !== user?.username
          )
          .filter(
            (onlineUser, index, self) =>
              index === self.findIndex(
                (u) =>
                  u.username === onlineUser.username
              )
          )
          .map((onlineUser, index) => (


            <div
              key={onlineUser.username}
              className={
                selectedUser === onlineUser.username
                  ? "user-card active-user"
                  : "user-card"
              }
              onClick={() => {
                setSelectedUser(onlineUser.username);
                setShowChat(true);

                markMessagesAsSeen(onlineUser.username);

                setUnreadMessages((prev) => ({
                  ...prev,
                  [onlineUser.username]: 0,
                }));
              }}
            >

              <div className="user-left">

                <img
                  src={
                    onlineUser.profilePic ||
                    "/default-avatar.png"
                  }
                  className="user-avatar"
                  alt="user"
                  onClick={(e) => {
                    e.stopPropagation();

                    navigate(`/profile/${onlineUser.userId}`);
                  }}
                />

                <div className="user-details">

                  <h4>
                    {onlineUser.username}
                  </h4>

                  <p>
                    Tap to chat
                  </p>

                </div>

              </div>

              {
                unreadMessages[onlineUser.username] > 0 &&
                (
                  <span className="unread-badge">
                    {
                      unreadMessages[onlineUser.username]
                    }
                  </span>
                )
              }

            </div>

          ))}

      </div>

      <div className={`chat-area ${!showChat ? "mobile-hide-chat" : ""}`}>

        <div className="chat-header">
          <div className="chat-title">

            <button
              className="back-btn"
              onClick={() => {
                setShowChat(false);
                setSelectedUser(null);
                localStorage.removeItem("selectedUser");
              }}
            >
              ←
            </button>

            <div className="chat-user-info">

              <div className="chat-user-top">

                {selectedUser && (
                  <img
                    src={
                      selectedUserData?.profilePic ||
                      "/default-avatar.png"
                    }
                    className="header-avatar"
                    alt="user"
                  />
                )}

                <div>

                  <h3>
                    {selectedUser || "Select Chat"}
                  </h3>

                  <p>
                    {selectedUser
                      ? "Active now"
                      : "Select someone to start chatting"}
                  </p>

                </div>

              </div>

            </div>

          </div>

          <div>
            <div className="header-actions">

              {selectedUser && (
                <>
                  <button className="action-btn">
                    📞
                  </button>

                  <button className="action-btn">
                    🎥
                  </button>
                </>
              )}

              <div className="profile-section" ref={menuRef}>
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="profile-pic"
                />

                <button
                  className="menu-btn"
                  onClick={() =>
                    setShowMenu(!showMenu)
                  }
                >
                  ⋮
                </button>


                {showMenu && (
                  <div className="menu-dropdown">

                    <label htmlFor="profile-upload">
                      👤 Change Photo
                    </label>

                    <input
                      id="profile-upload"
                      type="file"
                      hidden
                      onChange={(e) =>
                        setProfilePic(e.target.files[0])
                      }
                    />

                    {profilePic && (
                      <button onClick={handleProfileUpload}>
                        📤 Upload
                      </button>
                    )}

                    <button
                      onClick={() => {
                        navigate(`/profile/${user.id || user._id}`);
                        setShowMenu(false);
                      }}
                    >
                      👤 Profile
                    </button>

                    <button onClick={toggleDarkMode}>
                      {darkMode ? "☀ Light" : "🌙 Dark"}
                    </button>


                    <button onClick={handleLogout}>
                      🚪 Logout
                    </button>

                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        <div className="messages" ref={messagesRef}>
          {filteredMessages
            .filter(
              (msg) =>
                !msg.deletedFor?.includes(user.username)
            )
            .map((msg) => (
              <div
                key={msg._id}
                className={
                  msg.sender === user.username
                    ? "message my-message"
                    : "message other-message"
                }
              >

                <button
                  className="delete-menu-btn"
                  onClick={() =>
                    setShowDeleteMenu(
                      showDeleteMenu === msg._id
                        ? null
                        : msg._id
                    )
                  }
                >
                  ⋮
                </button>


                {showDeleteMenu === msg._id && (
                  <div className="delete-menu">

                    <button
                      onClick={() =>
                        deleteForMe(msg._id)
                      }
                    >
                      🗑 Delete for me
                    </button>


                    {msg.sender === user.username && (
                      <button
                        onClick={() =>
                          deleteForEveryone(msg._id)
                        }
                      >
                        🌍 Delete for everyone
                      </button>
                    )}

                  </div>
                )}


                {msg.isDeleted ? (
                  <p
                    style={{
                      color: "gray",
                      fontStyle: "italic",
                    }}
                  >
                    This message was deleted
                  </p>
                ) : (
                  <>
                    {msg.text && (
                      <p>{msg.text}</p>
                    )}

                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Chat"
                        className="chat-message-image"
                      />
                    )}
                  </>
                )}


                <small className="message-time">
                  {new Date(
                    msg.createdAt || Date.now()
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}

                  {msg.sender === user.username && (
                    <span
                      className={`message-status ${msg.status === "seen"
                        ? "seen"
                        : ""
                        }`}
                    >
                      {msg.status === "sent" && "✔"}
                      {(msg.status === "delivered" ||
                        msg.status === "seen") &&
                        "✔✔"}
                    </span>
                  )}
                </small>

              </div>
            ))}
        </div>

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

      <div
        className="chat-input-container"
        ref={emojiRef}
      >

        {showEmojiPicker && (
          <div className="emoji-picker">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
        {chatImagePreview && (
          <div className="chat-image-preview">
            <img
              src={chatImagePreview}
              alt="Preview"
              className="preview-image"
            />

            <button
              onClick={() => {
                setChatImage(null);
                setChatImagePreview("");
              }}
            >
              ❌
            </button>
          </div>
        )}

        <div className="chat-input">

          <button
            className="emoji-btn"
            onClick={() =>
              setShowEmojiPicker(!showEmojiPicker)
            }
          >
            😊
          </button>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            id="chat-image-input"
            onChange={(e) => {
              const file = e.target.files[0];

              if (file) {
                setChatImage(file);
                setChatImagePreview(
                  URL.createObjectURL(file)
                );
              }
            }}
          />

          <label
            htmlFor="chat-image-input"
            className="image-btn"
          >
            📎
          </label>

          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);

              if (selectedUser) {
                socket.emit("typing", {
                  sender: user.username,
                  receiver: selectedUser,
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
          />

          <button
            className="send-btn"
            onClick={handleSend}
          >
            ➤
          </button>

        </div>
      </div>
    </div>
  );
}

export default Chat;
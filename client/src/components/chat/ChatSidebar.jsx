import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DefaultAvatar from "../../assets/default-avatar.png";

import styles from "./ChatSidebar.module.css";

import { useChat } from "../../context/ChatContext";

const ChatSidebar = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const { userId } = useParams();

  const {
    selectedChat,
    setSelectedChat,
    onlineUsers,
    sentRequests,
    receivedRequests,
  } = useChat();

  useEffect(() => {

    const currentUser = JSON.parse(
      localStorage.getItem("user")
    );

    if (!currentUser) return;

    const accepted = [
      ...sentRequests.filter(
        (r) => r.status === "accepted"
      ),
      ...receivedRequests.filter(
        (r) => r.status === "accepted"
      ),
    ];

    const chatUsers = accepted.map((request) => {

      if (
        request.sender._id ===
        (currentUser.id || currentUser._id)
      ) {
        return request.receiver;
      }

      return request.sender;
    });

    const uniqueUsers = chatUsers.filter(
      (user, index, self) =>
        index ===
        self.findIndex(
          (u) => u._id === user._id
        )
    );

    setUsers(uniqueUsers);

    if (userId) {

      const selected = chatUsers.find(
        (u) => u._id === userId
      );

      if (selected) {
        setSelectedChat(selected);
      }
    }

  }, [
    sentRequests,
    receivedRequests,
    userId,
    setSelectedChat,
  ]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;

    const value = search.toLowerCase();

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(value) ||
        user.username.toLowerCase().includes(value)
      );
    });
  }, [users, search]);

  return (
    <div className={styles.sidebar}>

      <div className={styles.header}>

        <h1 className={styles.title}>
          Chats
        </h1>

        <input
          type="text"
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />

      </div>

      <div className={styles.userList}>

        {filteredUsers.map((user) => {

          const isOnline =
            onlineUsers.includes(user._id);

          return (
            <div
              key={user._id}
              onClick={() => setSelectedChat(user)}
              className={`${styles.userItem} ${selectedChat?._id === user._id
                ? styles.active
                : ""
                }`}
            >

              <div className={styles.avatarWrapper}>

                <img
                  src={user.profilePic || DefaultAvatar}
                  alt={user.name}
                  className={styles.avatar}
                  onError={(e) => {
                    e.target.src = DefaultAvatar;
                  }}
                />

                {isOnline && (
                  <span
                    className={styles.onlineDot}
                  />
                )}

              </div>

              <div className={styles.userInfo}>

                <h2 className={styles.name}>
                  {user.name}
                </h2>

                <p className={styles.username}>
                  @{user.username}
                </p>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
};

export default ChatSidebar;
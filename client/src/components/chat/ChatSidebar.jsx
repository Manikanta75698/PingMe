import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import DefaultAvatar from "../../assets/default-avatar.png";
import styles from "./ChatSidebar.module.css";

import { useChat } from "../../context/ChatContext";

const getUserId = (user) => {
  return user?._id || user?.id || "";
};

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
    const safeSentRequests = Array.isArray(sentRequests)
      ? sentRequests
      : [];

    const safeReceivedRequests = Array.isArray(receivedRequests)
      ? receivedRequests
      : [];

    // Current user request sender అయితే receiver chat user
    const sentChatUsers = safeSentRequests
      .filter((request) => request.status === "accepted")
      .map((request) => request.receiver);

    // Current user request receiver అయితే sender chat user
    const receivedChatUsers = safeReceivedRequests
      .filter((request) => request.status === "accepted")
      .map((request) => request.sender);

    const allChatUsers = [
      ...sentChatUsers,
      ...receivedChatUsers,
    ].filter((chatUser) => {
      return (
        chatUser &&
        typeof chatUser === "object" &&
        getUserId(chatUser)
      );
    });

    // Duplicate users remove
    const uniqueChatUsers = Array.from(
      new Map(
        allChatUsers.map((chatUser) => [
          String(getUserId(chatUser)),
          chatUser,
        ])
      ).values()
    );

    console.log("CHAT USERS:", uniqueChatUsers);

    setUsers(uniqueChatUsers);

    // /chat/:userId route open అయితే correct user select
    if (userId) {
      const selectedUser = uniqueChatUsers.find(
        (chatUser) =>
          String(getUserId(chatUser)) === String(userId)
      );

      if (selectedUser) {
        setSelectedChat(selectedUser);
      }
    }
  }, [
    sentRequests,
    receivedRequests,
    userId,
    setSelectedChat,
  ]);

  const filteredUsers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return users;
    }

    return users.filter((chatUser) => {
      const name = chatUser?.name || "";
      const username = chatUser?.username || "";

      return (
        name.toLowerCase().includes(searchValue) ||
        username.toLowerCase().includes(searchValue)
      );
    });
  }, [users, search]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>Chats</h1>

        <input
          type="text"
          placeholder="Search chats..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.userList}>
        {filteredUsers.length === 0 ? (
          <p className={styles.emptyText}>
            No accepted chats yet.
          </p>
        ) : (
          filteredUsers.map((chatUser) => {
            const chatUserId = getUserId(chatUser);

            const isOnline = Array.isArray(onlineUsers)
              ? onlineUsers.some((onlineUser) => {
                const onlineUserId =
                  typeof onlineUser === "object"
                    ? getUserId(onlineUser)
                    : onlineUser;

                return (
                  String(onlineUserId) ===
                  String(chatUserId)
                );
              })
              : false;

            const isSelected =
              String(getUserId(selectedChat)) ===
              String(chatUserId);

            return (
              <button
                type="button"
                key={chatUserId}
                onClick={() => setSelectedChat(chatUser)}
                className={`${styles.userItem} ${isSelected ? styles.active : ""
                  }`}
              >
                <div className={styles.avatarWrapper}>
                  <img
                    src={
                      chatUser?.profilePic ||
                      DefaultAvatar
                    }
                    alt={
                      chatUser?.name ||
                      "PingMe user"
                    }
                    className={styles.avatar}
                    onError={(event) => {
                      event.currentTarget.src =
                        DefaultAvatar;
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
                    {chatUser?.name ||
                      "PingMe User"}
                  </h2>

                  <p className={styles.username}>
                    @
                    {chatUser?.username ||
                      "user"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
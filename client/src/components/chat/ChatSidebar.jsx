import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DefaultAvatar from "../../assets/default-avatar.png";

import styles from "./ChatSidebar.module.css";

import { getUsers } from "../../services/userService";
import { useChat } from "../../context/ChatContext";

const ChatSidebar = () => {
  const [users, setUsers] = useState([]);

  const { userId } = useParams();

  const {
    selectedChat,
    setSelectedChat,
    onlineUsers,
  } = useChat();

  useEffect(() => {
    loadUsers();
  }, [userId]);

  const loadUsers = async () => {
    try {
      const { data } = await getUsers();

      setUsers(data.users);

      if (userId) {
        const user = data.users.find(
          (u) => u._id === userId
        );

        if (user) {
          setSelectedChat(user);
        }
      }

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={styles.sidebar}>

      <div className={styles.header}>
        <h1 className={styles.title}>
          Chats
        </h1>
      </div>

      <div className={styles.userList}>

        {users.map((user) => {

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
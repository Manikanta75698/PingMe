import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

import styles from "./Chat.module.css";

import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatHeader from "../../components/chat/ChatHeader";
import MessageList from "../../components/chat/MessageList";
import MessageInput from "../../components/chat/MessageInput";

import { useChat } from "../../context/ChatContext";
import { getConversation } from "../../services/chatService";
import { getUsers } from "../../services/userService";

const Chat = () => {
  const { userId } = useParams();

  const {
    selectedChat,
    setSelectedChat,
    setMessages,
  } = useChat();

  const { user } = useAuth();
  const { socket } = useChat();

  useEffect(() => {
    if (userId) {
      loadSelectedUser();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  const loadSelectedUser = async () => {
    try {
      const { data } = await getUsers();

      const user = data.users.find(
        (u) => u._id === userId
      );

      if (user) {
        setSelectedChat(user);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await getConversation(selectedChat._id);

      const messages = response.data.messages;

      setMessages(messages);

      // 🔥 Seen event
      messages.forEach((message) => {
        const receiverId =
          typeof message.receiver === "object"
            ? message.receiver._id
            : message.receiver;

        if (
          receiverId === user.id &&
          message.status !== "seen"
        ) {
          socket.emit("messageSeen", {
            messageId: message._id,
          });
        }
      });

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={styles.chatPage}>

      <div
        className={`
        ${styles.sidebar}
        ${selectedChat ? styles.hideSidebar : ""}
      `}
      >
        <ChatSidebar />
      </div>

      <div
        className={`
        ${styles.chatArea}
        ${!selectedChat ? styles.hideChat : ""}
      `}
      >
        {selectedChat && <ChatHeader />}

        <div className={styles.messages}>

          {selectedChat && <MessageList />}
        </div>

        {selectedChat && <MessageInput />}
      </div>

    </div>
  );
};

export default Chat;
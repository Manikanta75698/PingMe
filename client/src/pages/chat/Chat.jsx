import { useEffect } from "react";
import { useParams } from "react-router-dom";

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
      const response = await getConversation(
        selectedChat._id
      );

      setMessages(response.data.messages);
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
        <ChatHeader />

        <div className={styles.messages}>
          <MessageList />
        </div>

        <MessageInput />
      </div>

    </div>
  );
};

export default Chat;
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useParams } from "react-router-dom";

import styles from "./Chat.module.css";

import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatHeader from "../../components/chat/ChatHeader";
import MessageList from "../../components/chat/MessageList";
import MessageInput from "../../components/chat/MessageInput";

import { useChat } from "../../context/ChatContext";

import {
  getConversation,
} from "../../services/chatService";

import {
  getUsers,
} from "../../services/userService";

const MESSAGE_PAGE_SIZE = 30;

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value?._id || value?.id || ""
    );
  }

  return String(value);
};

const Chat = () => {
  const { userId } = useParams();

  const {
    selectedChat,
    setSelectedChat,

    setMessages,

    chatSummaries,
    setChatSummaries,
    loadChatSummaries,
  } = useChat();

  const selectedChatId =
    normalizeId(selectedChat);

  const [
    messagesLoading,
    setMessagesLoading,
  ] = useState(false);

  const [
    olderMessagesLoading,
    setOlderMessagesLoading,
  ] = useState(false);

  const [
    messagesError,
    setMessagesError,
  ] = useState("");

  const [
    hasMoreMessages,
    setHasMoreMessages,
  ] = useState(false);

  const [
    nextCursor,
    setNextCursor,
  ] = useState(null);

  const loadSelectedUser = useCallback(async () => {
    if (!userId) return;

    if (selectedChatId === String(userId)) {
      return;
    }

    const summaryUser = Array.isArray(chatSummaries)
      ? chatSummaries.find(
        (summary) =>
          normalizeId(summary?.user) ===
          String(userId)
      )?.user
      : null;

    if (summaryUser) {
      setSelectedChat(summaryUser);
      return;
    }

    try {
      const response = await getUsers();

      const users = Array.isArray(
        response?.data?.users
      )
        ? response.data.users
        : [];

      const matchingUser = users.find(
        (chatUser) =>
          normalizeId(chatUser) ===
          String(userId)
      );

      if (matchingUser) {
        setSelectedChat(matchingUser);
      }
    } catch (error) {
      console.error(
        "LOAD SELECTED CHAT USER ERROR:",
        error.response?.data ||
        error.message
      );
    }
  }, [
    userId,
    selectedChat,
    chatSummaries,
    setSelectedChat,
  ]);

  const loadMessages =
    useCallback(async () => {


      if (!selectedChatId) {
        setMessages([]);
        setHasMoreMessages(false);
        setNextCursor(null);
        return;
      }

      try {
        setMessagesLoading(true);
        setMessagesError("");

        const response =
          await getConversation(
            selectedChatId,
            {
              limit:
                MESSAGE_PAGE_SIZE,
            }
          );

        const conversationMessages =
          Array.isArray(
            response?.data?.messages
          )
            ? response.data.messages
            : [];

        const pagination =
          response?.data?.pagination;

        setMessages(
          conversationMessages
        );

        setHasMoreMessages(
          Boolean(
            pagination?.hasMore
          )
        );

        setNextCursor(
          pagination?.nextCursor ||
          null
        );

        setChatSummaries(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (summary) =>
                  normalizeId(
                    summary?.user
                  ) ===
                    selectedChatId
                    ? {
                      ...summary,
                      unreadCount: 0,
                    }
                    : summary
              )
              : []
        );

      } catch (error) {
        console.error(
          "LOAD CONVERSATION ERROR:",
          error.response?.data ||
          error.message
        );

        setMessages([]);
        setHasMoreMessages(false);
        setNextCursor(null);

        setMessagesError(
          error.response?.data
            ?.message ||
          "Unable to load messages"
        );
      } finally {
        setMessagesLoading(false);
      }
    }, [
      selectedChatId,
      setMessages,
      setChatSummaries,
    ]);

  const loadOlderMessages =
    useCallback(async () => {

      if (
        !selectedChatId ||
        !nextCursor ||
        !hasMoreMessages ||
        olderMessagesLoading
      ) {
        return;
      }

      try {
        setOlderMessagesLoading(true);
        setMessagesError("");

        const response =
          await getConversation(
            selectedChatId,
            {
              limit:
                MESSAGE_PAGE_SIZE,
              before: nextCursor,
            }
          );

        const olderMessages =
          Array.isArray(
            response?.data?.messages
          )
            ? response.data.messages
            : [];

        const pagination =
          response?.data?.pagination;

        setMessages((previous) => {
          const existingIds =
            new Set(
              previous.map(
                (message) =>
                  String(
                    message?._id
                  )
              )
            );

          const uniqueOlderMessages =
            olderMessages.filter(
              (message) =>
                !existingIds.has(
                  String(
                    message?._id
                  )
                )
            );

          return [
            ...uniqueOlderMessages,
            ...previous,
          ];
        });

        setHasMoreMessages(
          Boolean(
            pagination?.hasMore
          )
        );

        setNextCursor(
          pagination?.nextCursor ||
          null
        );
      } catch (error) {
        console.error(
          "LOAD OLDER MESSAGES ERROR:",
          error.response?.data ||
          error.message
        );

        setMessagesError(
          error.response?.data
            ?.message ||
          "Unable to load older messages"
        );
      } finally {
        setOlderMessagesLoading(false);
      }
    }, [
      selectedChatId,
      nextCursor,
      hasMoreMessages,
      olderMessagesLoading,
      setMessages,
    ]);

  useEffect(() => {
    if (!userId) {
      setSelectedChat(null);
      setMessages([]);
      setHasMoreMessages(false);
      setNextCursor(null);
      return;
    }

    loadSelectedUser();
  }, [
    userId,
    loadSelectedUser,
    setSelectedChat,
    setMessages,
  ]);

  useEffect(() => {
    if (!selectedChatId) return;

    loadMessages();
  }, [selectedChatId, loadMessages]);

  return (
    <main className={styles.chatPage}>
      <section
        className={`
          ${styles.sidebar}
          ${selectedChat
            ? styles.hideSidebar
            : ""
          }
        `}
      >
        <ChatSidebar />
      </section>

      <section
        className={`
          ${styles.chatArea}
          ${!selectedChat
            ? styles.hideChat
            : ""
          }
        `}
      >
        {selectedChat && (
          <ChatHeader />
        )}

        <div className={styles.messages}>
          {selectedChat &&
            messagesLoading && (
              <div
                className={
                  styles.messageState
                }
              >
                Loading messages...
              </div>
            )}

          {selectedChat &&
            !messagesLoading &&
            messagesError && (
              <div
                className={
                  styles.messageError
                }
              >
                {messagesError}
              </div>
            )}

          {selectedChat &&
            !messagesLoading &&
            !messagesError && (
              <>
                <MessageList
                  hasMoreMessages={hasMoreMessages}
                  olderMessagesLoading={
                    olderMessagesLoading
                  }
                  loadOlderMessages={
                    loadOlderMessages
                  }
                />
              </>
            )}
        </div>

        {selectedChat && (
          <MessageInput />
        )}
      </section>
    </main>
  );
};

export default Chat;
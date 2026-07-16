import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import styles from "./Chat.module.css";

import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatHeader from "../../components/chat/ChatHeader";
import PinnedMessageBanner from "../../components/chat/PinnedMessageBanner";
import MessageList from "../../components/chat/MessageList";
import MessageInput from "../../components/chat/MessageInput";

import {
  useChat,
} from "../../context/ChatContext";

import {
  getConversation,
} from "../../services/chatService";

import {
  getUsers,
} from "../../services/userService";

const MESSAGE_PAGE_SIZE = 30;

const CACHE_VERSION = 1;
const CACHE_TTL_MS =
  6 * 60 * 60 * 1000;

const MAX_CACHED_MESSAGES = 40;

const SLOW_SERVER_DELAY_MS = 2500;

const STATUS_PRIORITY = {
  sending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  seen: 3,
};

/* =========================
   ID HELPERS
========================= */

const normalizeId = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value).trim();
  }

  if (typeof value === "object") {
    if (
      value._id &&
      value._id !== value
    ) {
      return normalizeId(
        value._id
      );
    }

    if (
      value.userId &&
      value.userId !== value
    ) {
      return normalizeId(
        value.userId
      );
    }

    if (
      Object.prototype
        .hasOwnProperty.call(
          value,
          "id"
        ) &&
      value.id &&
      value.id !== value
    ) {
      return normalizeId(
        value.id
      );
    }

    return "";
  }

  return String(value).trim();
};

const getStoredUserId = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return "";
    }

    return normalizeId(
      JSON.parse(storedUser)
    );
  } catch (error) {
    console.error(
      "READ STORED USER ERROR:",
      error
    );

    return "";
  }
};

/* =========================
   MESSAGE HELPERS
========================= */

const belongsToConversation = (
  message,
  currentUserId,
  otherUserId
) => {
  const senderId =
    normalizeId(
      message?.sender
    );

  const receiverId =
    normalizeId(
      message?.receiver
    );

  return (
    (senderId === currentUserId &&
      receiverId === otherUserId) ||
    (senderId === otherUserId &&
      receiverId === currentUserId)
  );
};

const sortMessages = (
  messageList
) =>
  [...messageList].sort(
    (first, second) => {
      const firstTime =
        new Date(
          first?.createdAt || 0
        ).getTime();

      const secondTime =
        new Date(
          second?.createdAt || 0
        ).getTime();

      if (firstTime !== secondTime) {
        return (
          firstTime -
          secondTime
        );
      }

      return normalizeId(
        first?._id
      ).localeCompare(
        normalizeId(
          second?._id
        )
      );
    }
  );

const mergeMessageRecords = (
  serverMessage,
  currentMessage
) => {
  if (!serverMessage) {
    return currentMessage;
  }

  if (!currentMessage) {
    return serverMessage;
  }

  const serverPriority =
    STATUS_PRIORITY[
    serverMessage?.status
    ] ?? 0;

  const currentPriority =
    STATUS_PRIORITY[
    currentMessage?.status
    ] ?? 0;

  const status =
    currentPriority >=
      serverPriority
      ? currentMessage?.status
      : serverMessage?.status;

  const reactions =
    Array.isArray(
      currentMessage?.reactions
    )
      ? currentMessage.reactions
      : serverMessage?.reactions;

  return {
    ...serverMessage,
    ...currentMessage,

    status,

    reactions:
      Array.isArray(reactions)
        ? reactions
        : [],
  };
};

const mergeConversationMessages = (
  serverMessages,
  currentMessages,
  currentUserId,
  otherUserId
) => {
  const messageMap =
    new Map();

  const addMessage = (
    message,
    preferCurrent = false
  ) => {
    const messageId =
      normalizeId(
        message?._id
      );

    if (
      !messageId ||
      !belongsToConversation(
        message,
        currentUserId,
        otherUserId
      )
    ) {
      return;
    }

    const existing =
      messageMap.get(
        messageId
      );

    if (!existing) {
      messageMap.set(
        messageId,
        message
      );

      return;
    }

    messageMap.set(
      messageId,
      preferCurrent
        ? mergeMessageRecords(
          existing,
          message
        )
        : mergeMessageRecords(
          message,
          existing
        )
    );
  };

  const safeServerMessages =
    Array.isArray(serverMessages)
      ? serverMessages
      : [];

  const safeCurrentMessages =
    Array.isArray(currentMessages)
      ? currentMessages
      : [];

  safeServerMessages.forEach(
    (message) => {
      addMessage(
        message,
        false
      );
    }
  );

  /*
   * API fetch time lo vachina
   * socket messages preserve chesthundi.
   */
  safeCurrentMessages.forEach(
    (message) => {
      addMessage(
        message,
        true
      );
    }
  );

  return sortMessages(
    Array.from(
      messageMap.values()
    )
  );
};

/* =========================
   CACHE HELPERS
========================= */

const getConversationCacheKey = (
  currentUserId,
  otherUserId
) => {
  if (
    !currentUserId ||
    !otherUserId
  ) {
    return "";
  }

  const participantIds = [
    currentUserId,
    otherUserId,
  ].sort();

  return [
    "pingme",
    "conversation",
    `v${CACHE_VERSION}`,
    participantIds[0],
    participantIds[1],
  ].join(":");
};

const readConversationCache = (
  currentUserId,
  otherUserId
) => {
  const cacheKey =
    getConversationCacheKey(
      currentUserId,
      otherUserId
    );

  if (!cacheKey) {
    return [];
  }

  try {
    const cachedValue =
      localStorage.getItem(
        cacheKey
      );

    if (!cachedValue) {
      return [];
    }

    const parsed =
      JSON.parse(
        cachedValue
      );

    const savedAt =
      Number(
        parsed?.savedAt
      );

    const isExpired =
      !savedAt ||
      Date.now() - savedAt >
      CACHE_TTL_MS;

    if (
      parsed?.version !==
      CACHE_VERSION ||
      isExpired ||
      !Array.isArray(
        parsed?.messages
      )
    ) {
      localStorage.removeItem(
        cacheKey
      );

      return [];
    }

    return parsed.messages.filter(
      (message) =>
        belongsToConversation(
          message,
          currentUserId,
          otherUserId
        )
    );
  } catch (error) {
    console.error(
      "READ CHAT CACHE ERROR:",
      error
    );

    try {
      localStorage.removeItem(
        cacheKey
      );
    } catch {
      // Ignore storage cleanup error.
    }

    return [];
  }
};

const writeConversationCache = (
  currentUserId,
  otherUserId,
  messageList
) => {
  const cacheKey =
    getConversationCacheKey(
      currentUserId,
      otherUserId
    );

  if (!cacheKey) {
    return;
  }

  try {
    const cacheableMessages =
      sortMessages(
        Array.isArray(messageList)
          ? messageList.filter(
            (message) => {
              const messageId =
                normalizeId(
                  message?._id
                );

              return (
                messageId &&
                !messageId.startsWith(
                  "temp-"
                ) &&
                belongsToConversation(
                  message,
                  currentUserId,
                  otherUserId
                )
              );
            }
          )
          : []
      ).slice(
        -MAX_CACHED_MESSAGES
      );

    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        version:
          CACHE_VERSION,

        savedAt:
          Date.now(),

        messages:
          cacheableMessages,
      })
    );
  } catch (error) {
    /*
     * Storage full/private mode aina
     * chat functionality fail kakudadhu.
     */
    console.error(
      "WRITE CHAT CACHE ERROR:",
      error
    );
  }
};

/* =========================
   CHAT PAGE
========================= */

const Chat = () => {
  const { userId } =
    useParams();

  const {
    selectedChat,
    setSelectedChat,

    messages,
    setMessages,

    chatSummaries,
    setChatSummaries,
  } = useChat();

  const currentUserId =
    useMemo(
      () => getStoredUserId(),
      []
    );

  const selectedChatId =
    normalizeId(
      selectedChat
    );

  const activeChatIdRef =
    useRef("");

  const messagesRef =
    useRef([]);

  const loadRequestIdRef =
    useRef(0);

  const slowServerTimerRef =
    useRef(null);

  const [
    messagesLoading,
    setMessagesLoading,
  ] = useState(false);

  const [
    messagesRefreshing,
    setMessagesRefreshing,
  ] = useState(false);

  const [
    showSlowServerMessage,
    setShowSlowServerMessage,
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

  const clearSlowServerTimer =
    useCallback(() => {
      if (
        !slowServerTimerRef.current
      ) {
        return;
      }

      window.clearTimeout(
        slowServerTimerRef.current
      );

      slowServerTimerRef.current =
        null;
    }, []);

  /* =========================
     KEEP LATEST MESSAGES
  ========================= */

  useEffect(() => {
    messagesRef.current =
      Array.isArray(messages)
        ? messages
        : [];
  }, [messages]);

  /* =========================
     LOAD SELECTED USER
  ========================= */

  const loadSelectedUser =
    useCallback(async () => {
      const routeUserId =
        String(
          userId || ""
        ).trim();

      if (!routeUserId) {
        return;
      }

      if (
        selectedChatId ===
        routeUserId
      ) {
        return;
      }

      const summaryUser =
        Array.isArray(
          chatSummaries
        )
          ? chatSummaries.find(
            (summary) =>
              normalizeId(
                summary?.user
              ) === routeUserId
          )?.user
          : null;

      if (summaryUser) {
        setSelectedChat(
          summaryUser
        );

        return;
      }

      try {
        const response =
          await getUsers();

        const users =
          Array.isArray(
            response?.data?.users
          )
            ? response.data.users
            : [];

        const matchingUser =
          users.find(
            (chatUser) =>
              normalizeId(
                chatUser
              ) === routeUserId
          );

        if (matchingUser) {
          setSelectedChat(
            matchingUser
          );
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
      selectedChatId,
      chatSummaries,
      setSelectedChat,
    ]);

  /* =========================
     INSTANT CACHE HYDRATION
  ========================= */

  useLayoutEffect(() => {
    activeChatIdRef.current =
      selectedChatId;

    /*
     * Previous conversation request
     * result ni invalidate chesthundi.
     */
    loadRequestIdRef.current += 1;

    clearSlowServerTimer();

    setShowSlowServerMessage(
      false
    );

    setMessagesError("");
    setOlderMessagesLoading(
      false
    );

    setHasMoreMessages(false);
    setNextCursor(null);

    if (
      !selectedChatId ||
      !currentUserId
    ) {
      messagesRef.current = [];

      setMessages([]);
      setMessagesLoading(false);
      setMessagesRefreshing(
        false
      );

      return;
    }

    const cachedMessages =
      readConversationCache(
        currentUserId,
        selectedChatId
      );

    messagesRef.current =
      cachedMessages;

    /*
     * API wait cheyyakunda
     * cache immediate render.
     */
    setMessages(
      cachedMessages
    );

    setMessagesLoading(
      cachedMessages.length === 0
    );

    setMessagesRefreshing(
      cachedMessages.length > 0
    );
  }, [
    selectedChatId,
    currentUserId,
    setMessages,
    clearSlowServerTimer,
  ]);

  /* =========================
     LOAD LATEST MESSAGES
  ========================= */

  const loadMessages =
    useCallback(async () => {
      const chatId =
        selectedChatId;

      if (
        !chatId ||
        !currentUserId
      ) {
        return;
      }

      const requestId =
        ++loadRequestIdRef.current;

      const hasInstantMessages =
        messagesRef.current
          .length > 0;

      clearSlowServerTimer();

      setMessagesError("");

      setMessagesLoading(
        !hasInstantMessages
      );

      setMessagesRefreshing(
        hasInstantMessages
      );

      setShowSlowServerMessage(
        false
      );

      if (!hasInstantMessages) {
        slowServerTimerRef.current =
          window.setTimeout(() => {
            if (
              requestId ===
              loadRequestIdRef.current
            ) {
              setShowSlowServerMessage(
                true
              );
            }
          }, SLOW_SERVER_DELAY_MS);
      }

      try {
        const response =
          await getConversation(
            chatId,
            {
              limit:
                MESSAGE_PAGE_SIZE,
            }
          );

        if (
          requestId !==
          loadRequestIdRef.current ||
          activeChatIdRef.current !==
          chatId
        ) {
          return;
        }

        const serverMessages =
          Array.isArray(
            response?.data?.messages
          )
            ? response.data.messages
            : [];

        const pagination =
          response?.data?.pagination;

        setMessages(
          (previous) => {
            const mergedMessages =
              mergeConversationMessages(
                serverMessages,
                previous,
                currentUserId,
                chatId
              );

            messagesRef.current =
              mergedMessages;

            writeConversationCache(
              currentUserId,
              chatId,
              mergedMessages
            );

            return mergedMessages;
          }
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
                  ) === chatId
                    ? {
                      ...summary,
                      unreadCount: 0,
                    }
                    : summary
              )
              : []
        );
      } catch (error) {
        if (
          requestId !==
          loadRequestIdRef.current ||
          activeChatIdRef.current !==
          chatId
        ) {
          return;
        }

        console.error(
          "LOAD CONVERSATION ERROR:",
          {
            status:
              error.response?.status,

            data:
              error.response?.data,

            message:
              error.message,
          }
        );

        setMessagesError(
          error.response?.data
            ?.message ||
          "Unable to refresh messages"
        );
      } finally {
        if (
          requestId ===
          loadRequestIdRef.current &&
          activeChatIdRef.current ===
          chatId
        ) {
          clearSlowServerTimer();

          setMessagesLoading(
            false
          );

          setMessagesRefreshing(
            false
          );

          setShowSlowServerMessage(
            false
          );
        }
      }
    }, [
      selectedChatId,
      currentUserId,
      setMessages,
      setChatSummaries,
      clearSlowServerTimer,
    ]);

  /* =========================
     LOAD OLDER MESSAGES
  ========================= */

  const loadOlderMessages =
    useCallback(async () => {
      const chatId =
        selectedChatId;

      if (
        !chatId ||
        !currentUserId ||
        !nextCursor ||
        !hasMoreMessages ||
        olderMessagesLoading
      ) {
        return;
      }

      try {
        setOlderMessagesLoading(
          true
        );

        setMessagesError("");

        const response =
          await getConversation(
            chatId,
            {
              limit:
                MESSAGE_PAGE_SIZE,

              before:
                nextCursor,
            }
          );

        if (
          activeChatIdRef.current !==
          chatId
        ) {
          return;
        }

        const olderMessages =
          Array.isArray(
            response?.data?.messages
          )
            ? response.data.messages
            : [];

        const pagination =
          response?.data?.pagination;

        setMessages(
          (previous) => {
            const mergedMessages =
              mergeConversationMessages(
                olderMessages,
                previous,
                currentUserId,
                chatId
              );

            messagesRef.current =
              mergedMessages;

            return mergedMessages;
          }
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
      } catch (error) {
        if (
          activeChatIdRef.current !==
          chatId
        ) {
          return;
        }

        console.error(
          "LOAD OLDER MESSAGES ERROR:",
          {
            status:
              error.response?.status,

            data:
              error.response?.data,

            message:
              error.message,
          }
        );

        setMessagesError(
          error.response?.data
            ?.message ||
          "Unable to load older messages"
        );
      } finally {
        if (
          activeChatIdRef.current ===
          chatId
        ) {
          setOlderMessagesLoading(
            false
          );
        }
      }
    }, [
      selectedChatId,
      currentUserId,
      nextCursor,
      hasMoreMessages,
      olderMessagesLoading,
      setMessages,
    ]);

  /* =========================
     ROUTE USER
  ========================= */

  useEffect(() => {
    if (!userId) {
      setSelectedChat(null);
      setMessages([]);

      setHasMoreMessages(
        false
      );

      setNextCursor(null);

      return;
    }

    void loadSelectedUser();
  }, [
    userId,
    loadSelectedUser,
    setSelectedChat,
    setMessages,
  ]);

  /* =========================
     BACKGROUND REFRESH
  ========================= */

  useEffect(() => {
    if (!selectedChatId) {
      return;
    }

    void loadMessages();
  }, [
    selectedChatId,
    loadMessages,
  ]);

  /* =========================
     KEEP CACHE FRESH
  ========================= */

  useEffect(() => {
    if (
      !selectedChatId ||
      !currentUserId ||
      !Array.isArray(messages)
    ) {
      return undefined;
    }

    const timerId =
      window.setTimeout(() => {
        writeConversationCache(
          currentUserId,
          selectedChatId,
          messages
        );
      }, 150);

    return () => {
      window.clearTimeout(
        timerId
      );
    };
  }, [
    messages,
    selectedChatId,
    currentUserId,
  ]);

  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      loadRequestIdRef.current += 1;

      clearSlowServerTimer();
    };
  }, [
    clearSlowServerTimer,
  ]);

  const hasMessages =
    Array.isArray(messages) &&
    messages.length > 0;

  return (
    <main
      className={
        styles.chatPage
      }
    >
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
          <>
            <ChatHeader />

            <PinnedMessageBanner />
          </>
        )}

        <div
          className={
            styles.messages
          }
        >
          {selectedChat &&
            messagesLoading &&
            !hasMessages && (
              <div
                className={
                  styles.messageState
                }
                role="status"
              >
                <div
                  className={
                    styles.messageSkeleton
                  }
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                {showSlowServerMessage && (
                  <p>
                    Connecting to chat
                    server…
                  </p>
                )}
              </div>
            )}

          {selectedChat &&
            messagesError &&
            !hasMessages &&
            !messagesLoading && (
              <div
                className={
                  styles.messageError
                }
                role="alert"
              >
                <p>
                  {messagesError}
                </p>

                <button
                  type="button"
                  className={
                    styles.retryButton
                  }
                  onClick={() => {
                    void loadMessages();
                  }}
                >
                  Try again
                </button>
              </div>
            )}

          {selectedChat &&
            (hasMessages ||
              (!messagesLoading &&
                !messagesError)) && (
              <MessageList
                hasMoreMessages={
                  hasMoreMessages
                }
                olderMessagesLoading={
                  olderMessagesLoading
                }
                loadOlderMessages={
                  loadOlderMessages
                }
              />
            )}

          {selectedChat &&
            messagesRefreshing &&
            hasMessages && (
              <div
                className={
                  styles.syncBadge
                }
                role="status"
              >
                Syncing…
              </div>
            )}

          {selectedChat &&
            messagesError &&
            hasMessages && (
              <button
                type="button"
                className={
                  styles.refreshWarning
                }
                onClick={() => {
                  void loadMessages();
                }}
              >
                Couldn’t refresh.
                Tap to retry.
              </button>
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
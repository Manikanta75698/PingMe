import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import styles from "./MessageList.module.css";

import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

import MessageBubble from "./MessageBubble";

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value?._id || value?.id || "");
  }

  return String(value);
};

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error
    );

    return null;
  }
};

const MessageList = ({
  hasMoreMessages = false,
  olderMessagesLoading = false,
  loadOlderMessages,
}) => {

  const {
    messages,
    socket,
    selectedChat,
    setReplyingTo,
  } = useChat();


  const { user } = useAuth();

  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  const selectedChatId =
    normalizeId(selectedChat);

  const initialScrollDoneRef =
    useRef(false);

  const previousScrollHeightRef =
    useRef(0);

  const loadingOlderRef =
    useRef(false);

  const previousFirstMessageIdRef =
    useRef("");

  const storedUser = useMemo(
    () => getStoredUser(),
    []
  );

  const currentUserId = normalizeId(
    user?._id ||
    user?.id ||
    storedUser?._id ||
    storedUser?.id
  );

  const safeMessages = Array.isArray(messages)
    ? messages
    : [];

  const firstMessageId = normalizeId(
    safeMessages[0]?._id
  );

  const lastMessageId = normalizeId(
    safeMessages[
      safeMessages.length - 1
    ]?._id
  );

  useEffect(() => {
    initialScrollDoneRef.current = false;
    previousFirstMessageIdRef.current = "";
    loadingOlderRef.current = false;
  }, [selectedChatId]);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (
      !container ||
      safeMessages.length === 0 ||
      initialScrollDoneRef.current
    ) {
      return;
    }

    const scrollToBottom = () => {
      container.scrollTop =
        container.scrollHeight;

      bottomRef.current?.scrollIntoView({
        block: "end",
        behavior: "auto",
      });

      initialScrollDoneRef.current = true;
      previousFirstMessageIdRef.current =
        firstMessageId;
    };

    requestAnimationFrame(scrollToBottom);

    const timer = window.setTimeout(
      scrollToBottom,
      120
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    selectedChatId,
    safeMessages.length,
    firstMessageId,
  ]);

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) return;

    const previousFirstId =
      previousFirstMessageIdRef.current;

    const olderMessagesWerePrepended =
      previousFirstId &&
      firstMessageId &&
      previousFirstId !== firstMessageId &&
      loadingOlderRef.current;

    if (olderMessagesWerePrepended) {
      requestAnimationFrame(() => {
        const newScrollHeight =
          container.scrollHeight;

        const heightDifference =
          newScrollHeight -
          previousScrollHeightRef.current;

        container.scrollTop +=
          heightDifference;

        loadingOlderRef.current = false;
      });
    }

    previousFirstMessageIdRef.current =
      firstMessageId;
  }, [
    firstMessageId,
    safeMessages.length,
  ]);


  useEffect(() => {
    const container = containerRef.current;

    if (
      !container ||
      !initialScrollDoneRef.current ||
      loadingOlderRef.current ||
      !lastMessageId
    ) {
      return;
    }

    const lastMessage =
      safeMessages[safeMessages.length - 1];

    const lastSenderId =
      normalizeId(lastMessage?.sender);

    const isOwnNewMessage =
      lastSenderId === currentUserId;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    const isNearBottom =
      distanceFromBottom < 220;

    /*
     * Own message always bottom ki.
     * Incoming message user bottom daggara
     * unte bottom ki.
     */
    if (isOwnNewMessage || isNearBottom) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    }
  }, [
    lastMessageId,
    currentUserId,
    safeMessages,
  ]);

  /*
   * Scroll top reach ayithe older messages
   * automatically fetch chestundi.
   */
  const handleScroll = async () => {
    const container =
      containerRef.current;

    if (
      !container ||
      container.scrollTop > 80 ||
      !hasMoreMessages ||
      olderMessagesLoading ||
      loadingOlderRef.current ||
      typeof loadOlderMessages !== "function"
    ) {
      return;
    }

    previousScrollHeightRef.current =
      container.scrollHeight;

    loadingOlderRef.current = true;

    try {
      await loadOlderMessages();
    } catch (error) {
      loadingOlderRef.current = false;

      console.error(
        "AUTO LOAD OLDER MESSAGES ERROR:",
        error
      );
    }
  };

  /*
   * Received messages ni read ga mark chestundi.
   */
  useEffect(() => {
    if (
      !currentUserId ||
      safeMessages.length === 0 ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    safeMessages.forEach((message) => {
      const messageId =
        normalizeId(message?._id);

      const receiverId =
        normalizeId(message?.receiver);

      const senderId =
        normalizeId(message?.sender);

      const isReceivedMessage =
        receiverId === currentUserId &&
        senderId !== currentUserId;

      const shouldMarkAsRead =
        messageId &&
        !messageId.startsWith("temp-") &&
        isReceivedMessage &&
        message?.status !== "read";

      if (shouldMarkAsRead) {
        socket.emit("messageRead", {
          messageId,
        });
      }
    });
  }, [
    safeMessages,
    socket,
    currentUserId,
  ]);

  if (safeMessages.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyContent}>
          <h3>No messages yet</h3>

          <p>
            Start the conversation with a message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onScroll={handleScroll}
    >
      <div className={styles.messagesInner}>
        {olderMessagesLoading && (
          <div className={styles.loadingOlder}>
            Loading older messages...
          </div>
        )}

        {!hasMoreMessages &&
          safeMessages.length > 0 && (
            <div className={styles.startText}>
              Beginning of conversation
            </div>
          )}

        {safeMessages.map((message) => {
          const messageId =
            normalizeId(message?._id);

          const senderId =
            normalizeId(message?.sender);

          return (
            <MessageBubble
              key={messageId}
              message={message}
              isOwn={senderId === currentUserId}
              onReply={setReplyingTo}
            />
          );
        })}

        <div
          ref={bottomRef}
          className={styles.bottomAnchor}
        />
      </div>
    </div>
  );
};

export default MessageList;
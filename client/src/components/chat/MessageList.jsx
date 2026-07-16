import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./MessageList.module.css";

import {
  useChat,
} from "../../context/ChatContext";

import {
  useAuth,
} from "../../context/AuthContext";

import MessageBubble from "./MessageBubble";

import ForwardMessageModal from "./ForwardMessageModal";

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value?._id ||
      value?.id ||
      ""
    );
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
    setEditingMessage,
  } = useChat();

  const { user } = useAuth();

  const [
    forwardingMessage,
    setForwardingMessage,
  ] = useState(null);

  const containerRef =
    useRef(null);

  const bottomRef =
    useRef(null);

  const initialScrollDoneRef =
    useRef(false);

  const previousScrollHeightRef =
    useRef(0);

  const previousFirstMessageIdRef =
    useRef("");

  const loadingOlderRef =
    useRef(false);


  const messagesRef =
    useRef([]);

  const readEmittedIdsRef =
    useRef(new Set());

  const pendingReadIdsRef =
    useRef(new Set());

  const selectedChatId =
    normalizeId(selectedChat);

  const storedUser = useMemo(
    () => getStoredUser(),
    []
  );

  const currentUserId =
    normalizeId(
      user?._id ||
      user?.id ||
      storedUser?._id ||
      storedUser?.id
    );

  const safeMessages =
    Array.isArray(messages)
      ? messages
      : [];

  const firstMessageId =
    normalizeId(
      safeMessages[0]?._id
    );

  const lastMessage =
    safeMessages[
    safeMessages.length - 1
    ];

  const lastMessageId =
    normalizeId(
      lastMessage?._id
    );

  const lastSenderId =
    normalizeId(
      lastMessage?.sender
    );


  useLayoutEffect(() => {
    messagesRef.current =
      safeMessages;
  }, [safeMessages]);

  useLayoutEffect(() => {
    initialScrollDoneRef.current =
      false;

    previousScrollHeightRef.current =
      0;

    previousFirstMessageIdRef.current =
      "";

    loadingOlderRef.current =
      false;

    readEmittedIdsRef.current.clear();
    pendingReadIdsRef.current.clear();

  }, [selectedChatId]);


  useLayoutEffect(() => {
    const container =
      containerRef.current;

    if (
      !container ||
      safeMessages.length === 0 ||
      initialScrollDoneRef.current
    ) {
      return undefined;
    }

    const scrollToBottom = () => {
      container.scrollTop =
        container.scrollHeight;

      initialScrollDoneRef.current =
        true;

      previousFirstMessageIdRef.current =
        firstMessageId;
    };

    const animationFrameId =
      window.requestAnimationFrame(
        scrollToBottom
      );

    const timerId =
      window.setTimeout(
        scrollToBottom,
        150
      );

    return () => {
      window.cancelAnimationFrame(
        animationFrameId
      );

      window.clearTimeout(
        timerId
      );
    };
  }, [
    selectedChatId,
    safeMessages.length,
    firstMessageId,
  ]);


  useLayoutEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const previousFirstId =
      previousFirstMessageIdRef.current;

    const olderMessagesWerePrepended =
      Boolean(previousFirstId) &&
      Boolean(firstMessageId) &&
      previousFirstId !==
      firstMessageId &&
      loadingOlderRef.current;

    if (
      olderMessagesWerePrepended
    ) {
      const newScrollHeight =
        container.scrollHeight;

      const heightDifference =
        newScrollHeight -
        previousScrollHeightRef.current;

      container.scrollTop +=
        heightDifference;

      loadingOlderRef.current =
        false;
    }

    previousFirstMessageIdRef.current =
      firstMessageId;
  }, [
    firstMessageId,
    safeMessages.length,
  ]);

  /*
   * New own message always bottom ki.
   * Incoming message user bottom daggara
   * unte matrame auto-scroll.
   */
  useEffect(() => {
    const container =
      containerRef.current;

    if (
      !container ||
      !initialScrollDoneRef.current ||
      loadingOlderRef.current ||
      !lastMessageId
    ) {
      return undefined;
    }

    const isOwnNewMessage =
      lastSenderId ===
      currentUserId;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    const isNearBottom =
      distanceFromBottom < 220;

    if (
      !isOwnNewMessage &&
      !isNearBottom
    ) {
      return undefined;
    }

    const animationFrameId =
      window.requestAnimationFrame(
        () => {
          bottomRef.current
            ?.scrollIntoView({
              behavior: "smooth",
              block: "end",
            });
        }
      );

    return () => {
      window.cancelAnimationFrame(
        animationFrameId
      );
    };
  }, [
    lastMessageId,
    lastSenderId,
    currentUserId,
  ]);


  /* =========================
   START EDITING MESSAGE
========================= */

  const handleEditMessage =
    useCallback(
      (message) => {
        if (!message?._id) {
          return;
        }

        /*
         * Reply and Edit modes
         * same time lo undakudadhu.
         */
        setReplyingTo(null);
        setEditingMessage(message);
      },
      [
        setReplyingTo,
        setEditingMessage,
      ]
    );


  /* =========================
 FORWARD MESSAGE
========================= */

  const handleForwardMessage =
    useCallback(
      (message) => {
        if (!message?._id) {
          return;
        }

        setForwardingMessage(
          message
        );
      },
      []
    );

  const closeForwardModal =
    useCallback(() => {
      setForwardingMessage(
        null
      );
    }, []);

  /* =========================
     MARK VISIBLE MESSAGE READ
  ========================= */

  const handleMessageVisible =
    useCallback(
      (message) => {
        const messageId =
          normalizeId(
            message?._id
          );

        const senderId =
          normalizeId(
            message?.sender
          );

        const receiverId =
          normalizeId(
            message?.receiver
          );

        const alreadyRead =
          message?.status === "read" ||
          message?.status === "seen";

        const isReceivedMessage =
          Boolean(messageId) &&
          senderId ===
          selectedChatId &&
          receiverId ===
          currentUserId;

        if (
          !isReceivedMessage ||
          alreadyRead ||
          messageId.startsWith(
            "temp-"
          ) ||
          readEmittedIdsRef.current.has(
            messageId
          )
        ) {
          return;
        }

        if (!socket?.connected) {
          pendingReadIdsRef.current.add(
            messageId
          );

          return;
        }

        readEmittedIdsRef.current.add(
          messageId
        );

        pendingReadIdsRef.current.delete(
          messageId
        );

        socket.emit(
          "messageRead",
          {
            messageId,
          }
        );
      },
      [
        socket,
        selectedChatId,
        currentUserId,
      ]
    );

  /* =========================
 FLUSH PENDING READ RECEIPTS
========================= */

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const flushPendingReads = () => {
      if (!socket.connected) {
        return;
      }

      pendingReadIdsRef.current.forEach(
        (messageId) => {
          if (
            readEmittedIdsRef.current.has(
              messageId
            )
          ) {
            pendingReadIdsRef.current.delete(
              messageId
            );

            return;
          }

          readEmittedIdsRef.current.add(
            messageId
          );

          pendingReadIdsRef.current.delete(
            messageId
          );

          socket.emit(
            "messageRead",
            {
              messageId,
            }
          );
        }
      );
    };

    socket.on(
      "connect",
      flushPendingReads
    );

    flushPendingReads();

    return () => {
      socket.off(
        "connect",
        flushPendingReads
      );
    };
  }, [socket]);

  const handleScroll = async () => {
    const container =
      containerRef.current;

    if (
      !container ||
      container.scrollTop > 80 ||
      !hasMoreMessages ||
      olderMessagesLoading ||
      loadingOlderRef.current ||
      typeof loadOlderMessages !==
      "function"
    ) {
      return;
    }

    const firstIdBeforeRequest =
      normalizeId(
        messagesRef.current[0]?._id
      );

    previousScrollHeightRef.current =
      container.scrollHeight;

    loadingOlderRef.current =
      true;

    try {
      await loadOlderMessages();

      /*
       * No older messages returned
       * ayithe pagination lock release.
       */
      window.setTimeout(() => {
        const currentFirstId =
          normalizeId(
            messagesRef.current[0]?._id
          );

        if (
          loadingOlderRef.current &&
          currentFirstId ===
          firstIdBeforeRequest
        ) {
          loadingOlderRef.current =
            false;
        }
      }, 250);
    } catch (error) {
      loadingOlderRef.current =
        false;

      console.error(
        "AUTO LOAD OLDER MESSAGES ERROR:",
        error
      );
    }
  };

  if (
    safeMessages.length === 0
  ) {
    return (
      <div className={styles.empty}>
        <div
          className={
            styles.emptyContent
          }
        >
          <h3>No messages yet</h3>

          <p>
            Start the conversation
            with a message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        styles.container
      }
      onScroll={handleScroll}
    >
      <div
        className={
          styles.messagesInner
        }
      >
        {olderMessagesLoading && (
          <div
            className={
              styles.loadingOlder
            }
          >
            Loading older messages...
          </div>
        )}

        {!hasMoreMessages &&
          safeMessages.length > 0 && (
            <div
              className={
                styles.startText
              }
            >
              Beginning of conversation
            </div>
          )}

        {safeMessages.map(
          (message, index) => {
            const messageId =
              normalizeId(
                message?._id
              );

            const senderId =
              normalizeId(
                message?.sender
              );

            const fallbackKey =
              `${senderId}-${message?.createdAt ||
              index
              }-${index}`;

            return (
              <MessageBubble
                key={
                  messageId ||
                  fallbackKey
                }
                message={message}
                isOwn={
                  senderId ===
                  currentUserId
                }
                onReply={(replyMessage) => {
                  setEditingMessage(null);
                  setReplyingTo(
                    replyMessage
                  );
                }}
                onEdit={
                  handleEditMessage
                }
                onForward={
                  handleForwardMessage
                }
                onVisible={
                  handleMessageVisible
                }
                visibilityRoot={
                  containerRef
                }
              />
            );
          }
        )}

        <ForwardMessageModal
          open={
            Boolean(
              forwardingMessage
            )
          }
          message={
            forwardingMessage
          }
          onClose={
            closeForwardModal
          }
        />

        <div
          ref={bottomRef}
          className={
            styles.bottomAnchor
          }
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default MessageList;
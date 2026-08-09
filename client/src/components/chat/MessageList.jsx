import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowDown,
} from "lucide-react";

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
    setMessages,

    setChatSummaries,
    setPinnedMessage,
    blockStatus,

    pinnedMessage,
    messageScrollRequest,

    socket,
    selectedChat,

    setReplyingTo,
    setEditingMessage,

    messageSearchOpen,
    messageSearchQuery,

    messageSearchMatches,
    setMessageSearchMatches,

    activeSearchMatchIndex,
    setActiveSearchMatchIndex,
  } = useChat();

  const { user } = useAuth();

  const [
    forwardingMessage,
    setForwardingMessage,
  ] = useState(null);

  const [
    pinnedScrollTargetId,
    setPinnedScrollTargetId,
  ] = useState("");

  const [
    showScrollButton,
    setShowScrollButton,
  ] = useState(false);

  const [
    unreadNewMessages,
    setUnreadNewMessages,
  ] = useState(0);

  const pinnedScrollTimerRef =
    useRef(null);

  const pendingPinnedScrollIdRef =
    useRef("");

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

  const messageElementRefs =
    useRef(new Map());

  const messagesRef =
    useRef([]);

  const readEmittedIdsRef =
    useRef(new Set());

  const pendingReadIdsRef =
    useRef(new Set());

  const isNearBottomRef =
    useRef(true);

  const previousLastMessageIdRef =
    useRef("");


  /* =========================
 BOTTOM SCROLL HELPERS
========================= */

  const checkIsNearBottom =
    useCallback(() => {
      const container =
        containerRef.current;

      if (!container) {
        return true;
      }

      const distanceFromBottom =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight;

      return distanceFromBottom < 180;
    }, []);

  const scrollToLatest =
    useCallback(
      (
        behavior = "auto",
        {
          clearUnread = true,
        } = {}
      ) => {
        const container =
          containerRef.current;

        if (!container) {
          return;
        }

        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });

        isNearBottomRef.current =
          true;

        setShowScrollButton(false);

        if (clearUnread) {
          setUnreadNewMessages(0);
        }
      },
      []
    );

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

  /* =========================
     MESSAGE SEARCH
  ========================= */

  const normalizedSearchQuery =
    String(
      messageSearchQuery || ""
    )
      .trim()
      .toLocaleLowerCase();

  const calculatedSearchMatches =
    useMemo(() => {
      if (
        !messageSearchOpen ||
        !normalizedSearchQuery
      ) {
        return [];
      }

      return safeMessages
        .filter((message) => {
          const messageText =
            String(
              message?.text || ""
            )
              .trim()
              .toLocaleLowerCase();

          return (
            Boolean(messageText) &&
            messageText.includes(
              normalizedSearchQuery
            )
          );
        })
        .map((message) =>
          normalizeId(
            message?._id
          )
        )
        .filter(Boolean);
    }, [
      safeMessages,
      messageSearchOpen,
      normalizedSearchQuery,
    ]);

  const activeSearchMessageId =
    messageSearchMatches[
    activeSearchMatchIndex
    ] || "";

  const searchMatchIdSet =
    useMemo(
      () =>
        new Set(
          Array.isArray(
            messageSearchMatches
          )
            ? messageSearchMatches
              .map((item) =>
                normalizeId(item)
              )
              .filter(Boolean)
            : []
        ),
      [messageSearchMatches]
    );

  /* =========================
     PINNED MESSAGE SCROLL
  ========================= */

  const scrollToMessageById =
    useCallback((messageId) => {
      const normalizedMessageId =
        normalizeId(messageId);

      if (!normalizedMessageId) {
        return false;
      }

      const messageElement =
        messageElementRefs.current.get(
          normalizedMessageId
        );

      if (!messageElement) {
        return false;
      }

      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      setPinnedScrollTargetId(
        normalizedMessageId
      );

      if (
        pinnedScrollTimerRef.current
      ) {
        window.clearTimeout(
          pinnedScrollTimerRef.current
        );
      }

      pinnedScrollTimerRef.current =
        window.setTimeout(() => {
          setPinnedScrollTargetId("");

          pinnedScrollTimerRef.current =
            null;
        }, 1800);

      return true;
    }, []);

  useEffect(() => {
    const requestedMessageId =
      normalizeId(
        messageScrollRequest
          ?.messageId
      );

    if (!requestedMessageId) {
      return;
    }

    if (
      scrollToMessageById(
        requestedMessageId
      )
    ) {
      pendingPinnedScrollIdRef.current =
        "";

      return;
    }

    const pinnedMessageId =
      normalizeId(
        pinnedMessage?._id
      );

    if (
      !pinnedMessage ||
      pinnedMessageId !==
      requestedMessageId
    ) {
      pendingPinnedScrollIdRef.current =
        "";

      console.warn(
        "Pinned message is unavailable:",
        requestedMessageId
      );

      return;
    }

    pendingPinnedScrollIdRef.current =
      requestedMessageId;

    setMessages((previous) => {
      const safePrevious =
        Array.isArray(previous)
          ? previous
          : [];

      const alreadyLoaded =
        safePrevious.some(
          (currentMessage) =>
            normalizeId(
              currentMessage?._id
            ) === requestedMessageId
        );

      if (alreadyLoaded) {
        return safePrevious;
      }

      const mergedMessages = [
        ...safePrevious,
        pinnedMessage,
      ];

      mergedMessages.sort(
        (
          firstMessage,
          secondMessage
        ) => {
          const firstTime =
            new Date(
              firstMessage?.createdAt ||
              0
            ).getTime();

          const secondTime =
            new Date(
              secondMessage?.createdAt ||
              0
            ).getTime();

          return (
            firstTime -
            secondTime
          );
        }
      );

      return mergedMessages;
    });
  }, [
    messageScrollRequest
      ?.messageId,

    messageScrollRequest
      ?.requestKey,

    pinnedMessage,
    scrollToMessageById,
    setMessages,
  ]);

  /* =========================
     SCROLL AFTER INSERT
  ========================= */

  useEffect(() => {
    const pendingMessageId =
      normalizeId(
        pendingPinnedScrollIdRef
          .current
      );

    if (!pendingMessageId) {
      return undefined;
    }

    const frameId =
      window.requestAnimationFrame(
        () => {
          const didScroll =
            scrollToMessageById(
              pendingMessageId
            );

          if (didScroll) {
            pendingPinnedScrollIdRef.current =
              "";
          }
        }
      );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );
    };
  }, [
    messages,

    messageScrollRequest
      ?.requestKey,

    scrollToMessageById,
  ]);

  useEffect(() => {
    return () => {
      if (
        pinnedScrollTimerRef.current
      ) {
        window.clearTimeout(
          pinnedScrollTimerRef.current
        );

        pinnedScrollTimerRef.current =
          null;
      }
    };
  }, []);

  useEffect(() => {
    setMessageSearchMatches(
      calculatedSearchMatches
    );

    setActiveSearchMatchIndex(
      (previousIndex) => {
        if (
          calculatedSearchMatches
            .length === 0
        ) {
          return 0;
        }

        return Math.min(
          previousIndex,
          calculatedSearchMatches
            .length - 1
        );
      }
    );
  }, [
    calculatedSearchMatches,
    setMessageSearchMatches,
    setActiveSearchMatchIndex,
  ]);

  useEffect(() => {
    if (
      !messageSearchOpen ||
      !normalizedSearchQuery ||
      !activeSearchMessageId
    ) {
      return undefined;
    }

    const frameId =
      window.requestAnimationFrame(
        () => {
          const messageElement =
            messageElementRefs.current
              .get(
                activeSearchMessageId
              );

          messageElement
            ?.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
        }
      );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );
    };
  }, [
    messageSearchOpen,
    normalizedSearchQuery,
    activeSearchMessageId,
  ]);

  useLayoutEffect(() => {
    messagesRef.current =
      safeMessages;
  }, [safeMessages]);

  /* =========================
     EXPLICIT BOTTOM SCROLL
  ========================= */

  useEffect(() => {
    const handleScrollToBottom = (
      event
    ) => {
      if (messageSearchOpen) {
        return;
      }

      const behavior =
        event?.detail?.behavior ===
          "auto"
          ? "auto"
          : "smooth";

      window.requestAnimationFrame(
        () => {
          scrollToLatest(
            behavior
          );
        }
      );
    };

    window.addEventListener(
      "chat:scroll-bottom",
      handleScrollToBottom
    );

    return () => {
      window.removeEventListener(
        "chat:scroll-bottom",
        handleScrollToBottom
      );
    };
  }, [
    messageSearchOpen,
    scrollToLatest,
  ]);

  /* =========================
     SELECTED CHAT RESET
  ========================= */

  useLayoutEffect(() => {
    initialScrollDoneRef.current =
      false;

    previousScrollHeightRef.current =
      0;

    previousFirstMessageIdRef.current =
      "";

    previousLastMessageIdRef.current =
      "";

    loadingOlderRef.current =
      false;

    isNearBottomRef.current =
      true;

    readEmittedIdsRef.current.clear();
    pendingReadIdsRef.current.clear();
    messageElementRefs.current.clear();

    pendingPinnedScrollIdRef.current =
      "";

    setPinnedScrollTargetId("");
    setShowScrollButton(false);
    setUnreadNewMessages(0);

    if (
      pinnedScrollTimerRef.current
    ) {
      window.clearTimeout(
        pinnedScrollTimerRef.current
      );

      pinnedScrollTimerRef.current =
        null;
    }
  }, [selectedChatId]);

  /* =========================
     INITIAL BOTTOM SCROLL
  ========================= */

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

      isNearBottomRef.current =
        true;

      previousFirstMessageIdRef.current =
        firstMessageId;

      previousLastMessageIdRef.current =
        lastMessageId;

      setShowScrollButton(false);
      setUnreadNewMessages(0);
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
    lastMessageId,
  ]);
  /* =========================
     PRESERVE OLDER SCROLL
  ========================= */

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

  /* =========================
     NEW MESSAGE AUTO SCROLL
  ========================= */

  useEffect(() => {
    if (
      !initialScrollDoneRef.current ||
      loadingOlderRef.current ||
      !lastMessageId ||
      messageSearchOpen
    ) {
      previousLastMessageIdRef.current =
        lastMessageId;

      return undefined;
    }

    const previousLastMessageId =
      previousLastMessageIdRef.current;

    previousLastMessageIdRef.current =
      lastMessageId;

    /*
     * Status/update render ayithe
     * new message ga treat cheyyam.
     */
    if (
      previousLastMessageId ===
      lastMessageId
    ) {
      return undefined;
    }

    /*
     * Own message send chesthe
     * always latest message ki scroll.
     */
    const isOwnMessage =
      lastSenderId ===
      currentUserId;

    if (isOwnMessage) {
      const frameId =
        window.requestAnimationFrame(
          () => {
            scrollToLatest(
              "auto"
            );
          }
        );

      return () => {
        window.cancelAnimationFrame(
          frameId
        );
      };
    }

    /*
     * Receiver message:
     * user already bottom daggara unte
     * automatic scroll.
     */
    if (isNearBottomRef.current) {
      const frameId =
        window.requestAnimationFrame(
          () => {
            scrollToLatest(
              "smooth"
            );
          }
        );

      return () => {
        window.cancelAnimationFrame(
          frameId
        );
      };
    }

    /*
     * User old messages chusthunte
     * scroll position disturb cheyyam.
     */
    setShowScrollButton(true);

    setUnreadNewMessages(
      (previous) =>
        Math.min(
          previous + 1,
          99
        )
    );

    return undefined;
  }, [
    lastMessageId,
    lastSenderId,
    currentUserId,
    messageSearchOpen,
    scrollToLatest,
  ]);

  /* =========================
     MOBILE KEYBOARD SCROLL
  ========================= */

  useEffect(() => {
    const viewport =
      window.visualViewport;

    let frameId = 0;
    let timerId = 0;

    const maintainLatestPosition =
      () => {
        /*
         * User old messages chusthunte
         * keyboard resize force scroll cheyyakudadhu.
         */
        if (
          messageSearchOpen ||
          loadingOlderRef.current ||
          !initialScrollDoneRef.current ||
          !isNearBottomRef.current
        ) {
          return;
        }

        window.cancelAnimationFrame(
          frameId
        );

        window.clearTimeout(
          timerId
        );

        frameId =
          window.requestAnimationFrame(
            () => {
              scrollToLatest(
                "auto"
              );
            }
          );

        timerId =
          window.setTimeout(
            () => {
              scrollToLatest(
                "auto"
              );
            },
            200
          );
      };

    viewport?.addEventListener(
      "resize",
      maintainLatestPosition
    );

    viewport?.addEventListener(
      "scroll",
      maintainLatestPosition
    );

    window.addEventListener(
      "resize",
      maintainLatestPosition
    );

    document.addEventListener(
      "focusin",
      maintainLatestPosition
    );

    document.addEventListener(
      "focusout",
      maintainLatestPosition
    );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );

      window.clearTimeout(
        timerId
      );

      viewport?.removeEventListener(
        "resize",
        maintainLatestPosition
      );

      viewport?.removeEventListener(
        "scroll",
        maintainLatestPosition
      );

      window.removeEventListener(
        "resize",
        maintainLatestPosition
      );

      document.removeEventListener(
        "focusin",
        maintainLatestPosition
      );

      document.removeEventListener(
        "focusout",
        maintainLatestPosition
      );
    };
  }, [
    selectedChatId,
    messageSearchOpen,
    scrollToLatest,
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

        setReplyingTo(null);
        setEditingMessage(message);
      },
      [
        setReplyingTo,
        setEditingMessage,
      ]
    );

  /* =========================
     START REPLYING
  ========================= */

  const handleReplyMessage =
    useCallback(
      (message) => {
        if (!message?._id) {
          return;
        }

        setEditingMessage(null);
        setReplyingTo(message);
      },
      [
        setEditingMessage,
        setReplyingTo,
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
      setForwardingMessage(null);
    }, []);

  /* =========================
     MARK MESSAGE READ
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
     FLUSH PENDING READS
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

  /* =========================
     HANDLE LIST SCROLL
  ========================= */

  const handleScroll = async () => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const nearBottom =
      checkIsNearBottom();

    isNearBottomRef.current =
      nearBottom;

    /*
     * User latest message daggaraki
     * manual ga scroll chesthe button
     * and unread count clear.
     */
    if (nearBottom) {
      setShowScrollButton(false);
      setUnreadNewMessages(0);
    } else {
      setShowScrollButton(true);
    }

    /*
     * Top daggara scroll chesinappudu
     * older messages load.
     */
    if (
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
      className={
        styles.listShell
      }
    >
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

              const isSearchMatch =
                Boolean(messageId) &&
                searchMatchIdSet.has(
                  messageId
                );

              const isActiveSearchMatch =
                Boolean(messageId) &&
                activeSearchMessageId ===
                messageId;

              const isPinnedScrollTarget =
                Boolean(messageId) &&
                pinnedScrollTargetId ===
                messageId;

              return (
                <div
                  key={
                    messageId ||
                    fallbackKey
                  }
                  ref={(element) => {
                    if (!messageId) {
                      return;
                    }

                    if (element) {
                      messageElementRefs.current.set(
                        messageId,
                        element
                      );
                    } else {
                      messageElementRefs.current.delete(
                        messageId
                      );
                    }
                  }}
                  data-message-id={
                    messageId ||
                    undefined
                  }
                >
                  <MessageBubble
                    message={message}
                    isOwn={
                      senderId ===
                      currentUserId
                    }

                    onReply={
                      handleReplyMessage
                    }
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

                    searchQuery={
                      isSearchMatch
                        ? messageSearchQuery
                        : ""
                    }

                    isSearchMatch={
                      isSearchMatch
                    }

                    isActiveSearchMatch={
                      isActiveSearchMatch
                    }

                    isPinnedScrollTarget={
                      isPinnedScrollTarget
                    }

                    isBlocked={
                      isBlocked
                    }

                    setMessages={
                      setMessages
                    }

                    setChatSummaries={
                      setChatSummaries
                    }

                    setPinnedMessage={
                      setPinnedMessage
                    }
                  />
                </div>
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

      {showScrollButton &&
        !messageSearchOpen && (
          <button
            type="button"
            className={
              styles.scrollToBottomButton
            }
            onClick={() =>
              scrollToLatest(
                "smooth"
              )
            }
            aria-label={
              unreadNewMessages > 0
                ? `${unreadNewMessages} new messages. Scroll to latest message.`
                : "Scroll to latest message"
            }
          >
            <ArrowDown
              size={20}
              strokeWidth={2.2}
              aria-hidden="true"
            />

            {unreadNewMessages > 0 && (
              <span
                className={
                  styles.newMessageCount
                }
              >
                {unreadNewMessages > 99
                  ? "99+"
                  : unreadNewMessages}
              </span>
            )}
          </button>
        )}
    </div>
  );
};

export default MessageList;
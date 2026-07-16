import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Forward,
  Image as ImageIcon,
  Search,
  X,
} from "lucide-react";

import {
  forwardMessage as forwardMessageRequest,
} from "../../services/chatService";

import {
  useChat,
} from "../../context/ChatContext";

import styles from "./ForwardMessageModal.module.css";

const normalizeId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(
      value?._id ||
      value?.id ||
      value?.userId ||
      ""
    );
  }

  return String(value);
};

const getUserName = (user) =>
  String(
    user?.name ||
    user?.username ||
    "User"
  );

const ForwardMessageModal = ({
  open,
  message,
  onClose,
}) => {
  const {
    selectedChat,
    chatSummaries,
    setMessages,
    loadChatSummaries,
  } = useChat();

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    forwardingToId,
    setForwardingToId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const searchInputRef =
    useRef(null);

  const forwardingToIdRef =
    useRef("");

  const messageId =
    normalizeId(message);

  const selectedChatId =
    normalizeId(selectedChat);

  const previewText =
    message?.text?.trim() ||
    (message?.image
      ? "Photo"
      : "Message");

  const availableChats =
    useMemo(() => {
      const safeSummaries =
        Array.isArray(chatSummaries)
          ? chatSummaries
          : [];

      const normalizedSearch =
        searchText
          .trim()
          .toLowerCase();

      return safeSummaries
        .filter(
          (summary) =>
            Boolean(
              normalizeId(
                summary?.user
              )
            )
        )
        .filter((summary) => {
          if (!normalizedSearch) {
            return true;
          }

          const user =
            summary?.user;

          const searchableText =
            `${user?.name || ""} ${user?.username || ""}`
              .toLowerCase();

          return searchableText.includes(
            normalizedSearch
          );
        });
    }, [
      chatSummaries,
      searchText,
    ]);

  useEffect(() => {
    forwardingToIdRef.current =
      forwardingToId;
  }, [forwardingToId]);

  /* =========================
     OPEN RESET
  ========================= */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    forwardingToIdRef.current =
      "";

    setSearchText("");
    setForwardingToId("");
    setError("");

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const focusTimer =
      window.setTimeout(() => {
        searchInputRef.current
          ?.focus();
      }, 50);

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape" &&
        !forwardingToIdRef.current
      ) {
        onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.clearTimeout(
        focusTimer
      );

      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    onClose,
  ]);

  if (
    !open ||
    !messageId ||
    typeof document === "undefined"
  ) {
    return null;
  }

  /* =========================
     FORWARD
  ========================= */

  const handleForward = async (
    user
  ) => {
    const receiverId =
      normalizeId(user);

    if (
      !receiverId ||
      forwardingToId
    ) {
      return;
    }

    setForwardingToId(
      receiverId
    );

    setError("");

    try {
      const response =
        await forwardMessageRequest(
          messageId,
          receiverId
        );

      const forwardedMessage =
        response?.data?.data;

      if (!forwardedMessage?._id) {
        throw new Error(
          "Invalid forward response from server"
        );
      }

      /*
       * Destination currently open chat ayithe
       * sender UI lo immediate ga append.
       */
      if (
        receiverId ===
        selectedChatId
      ) {
        setMessages(
          (previous) => {
            const safeMessages =
              Array.isArray(previous)
                ? previous
                : [];

            const alreadyExists =
              safeMessages.some(
                (item) =>
                  normalizeId(item) ===
                  normalizeId(
                    forwardedMessage
                  )
              );

            return alreadyExists
              ? safeMessages
              : [
                ...safeMessages,
                forwardedMessage,
              ];
          }
        );
      }

      loadChatSummaries()
        .catch((summaryError) => {
          console.error(
            "FORWARD SUMMARY REFRESH ERROR:",
            summaryError.response?.data ||
            summaryError.message
          );
        });

      onClose?.();
    } catch (forwardError) {
      console.error(
        "FORWARD MESSAGE ERROR:",
        forwardError.response?.data ||
        forwardError.message
      );

      setError(
        forwardError.response?.data
          ?.message ||
        forwardError.userMessage ||
        "Unable to forward message"
      );
    } finally {
      setForwardingToId("");
    }
  };

  const handleBackdropClick = (
    event
  ) => {
    if (
      event.target ===
      event.currentTarget &&
      !forwardingToId
    ) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      className={
        styles.backdrop
      }
      onClick={
        handleBackdropClick
      }
      role="presentation"
    >
      <section
        className={
          styles.modal
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-message-title"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header
          className={
            styles.header
          }
        >
          <div>
            <h2
              id="forward-message-title"
              className={
                styles.title
              }
            >
              Forward message
            </h2>

            <p
              className={
                styles.subtitle
              }
            >
              Select a chat
            </p>
          </div>

          <button
            type="button"
            className={
              styles.closeButton
            }
            onClick={
              onClose
            }
            disabled={
              Boolean(
                forwardingToId
              )
            }
            aria-label="Close forward message"
          >
            <X
              size={19}
              aria-hidden="true"
            />
          </button>
        </header>

        <div
          className={
            styles.messagePreview
          }
        >
          {message?.image && (
            <ImageIcon
              size={16}
              aria-hidden="true"
            />
          )}

          <span>
            {previewText}
          </span>
        </div>

        <div
          className={
            styles.searchBox
          }
        >
          <Search
            size={18}
            aria-hidden="true"
          />

          <input
            ref={
              searchInputRef
            }
            type="search"
            value={
              searchText
            }
            onChange={(event) => {
              setSearchText(
                event.target.value
              );
            }}
            placeholder="Search chats"
            aria-label="Search chats"
          />
        </div>

        {error && (
          <p
            className={
              styles.error
            }
            role="alert"
          >
            {error}
          </p>
        )}

        <div
          className={
            styles.chatList
          }
        >
          {availableChats.length ===
            0 ? (
            <p
              className={
                styles.empty
              }
            >
              No chats found
            </p>
          ) : (
            availableChats.map(
              (summary) => {
                const chatUser =
                  summary?.user;

                const userId =
                  normalizeId(
                    chatUser
                  );

                const name =
                  getUserName(
                    chatUser
                  );

                const username =
                  chatUser?.username
                    ? `@${chatUser.username}`
                    : "";

                const isLoading =
                  forwardingToId ===
                  userId;

                return (
                  <button
                    key={
                      userId
                    }
                    type="button"
                    className={
                      styles.chatButton
                    }
                    onClick={() => {
                      void handleForward(
                        chatUser
                      );
                    }}
                    disabled={
                      Boolean(
                        forwardingToId
                      )
                    }
                  >
                    <span
                      className={
                        styles.avatar
                      }
                    >
                      {chatUser
                        ?.profilePic ? (
                        <img
                          src={
                            chatUser.profilePic
                          }
                          alt=""
                        />
                      ) : (
                        name
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </span>

                    <span
                      className={
                        styles.userInfo
                      }
                    >
                      <strong>
                        {name}
                      </strong>

                      {username && (
                        <small>
                          {username}
                        </small>
                      )}
                    </span>

                    <span
                      className={
                        styles.forwardIcon
                      }
                    >
                      {isLoading ? (
                        <span
                          className={
                            styles.spinner
                          }
                          aria-label="Forwarding"
                        />
                      ) : (
                        <Forward
                          size={18}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </button>
                );
              }
            )
          )}
        </div>
      </section>
    </div>,
    document.body
  );
};

export default ForwardMessageModal;
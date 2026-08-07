import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./MessageInput.module.css";

import {
  editMessage,
  sendMessage,
} from "../../services/chatService";

import {
  useChat,
} from "../../context/ChatContext";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  useToastContext,
} from "../ui/toast/ToastProvider";

import {
  Ban,
  Check,
  Smile,
  ImagePlus,
  SendHorizontal,
  Mic,
  X,
} from "lucide-react";

const MAX_MESSAGE_LENGTH = 5000;

const createClientMessageId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
    "function"
  ) {
    return `msg-${crypto.randomUUID()}`;
  }

  return `msg-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
};

const getUserId = (value) => {
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

const MessageInput = () => {
  const { user } = useAuth();

  const toast =
    useToastContext();

  const [
    text,
    setText,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    selectedImage,
    setSelectedImage,
  ] = useState(null);

  const imageRef =
    useRef(null);

  const textareaRef =
    useRef(null);


  const editingMessageRef =
    useRef(null);


  const editSubmittingIdRef =
    useRef("");

  const typingTimerRef =
    useRef(null);

  const typingActiveRef =
    useRef(false);

  const typingReceiverRef =
    useRef("");

  const {
    selectedChat,
    setMessages,
    setChatSummaries,

    blockStatus,
    blockStatusLoading,

    socket,
    loadChatSummaries,

    replyingTo,
    setReplyingTo,

    editingMessage,
    setEditingMessage,
  } = useChat();

  const selectedChatId =
    getUserId(selectedChat);

  const editingMessageId =
    getUserId(editingMessage);

  const isEditing =
    Boolean(editingMessageId);

  /*
   * Context object refresh ayina edit target
   * lose kakunda stable reference maintain.
   */
  useEffect(() => {
    if (
      editingMessageId &&
      editSubmittingIdRef.current !==
      editingMessageId
    ) {
      editingMessageRef.current =
        editingMessage;
    }
  }, [
    editingMessageId,
    editingMessage,
  ]);



  const blockedByMe =
    Boolean(
      blockStatus?.blockedByMe
    );

  const blockedMe =
    Boolean(
      blockStatus?.blockedMe
    );

  const isBlocked =
    Boolean(
      blockStatus?.isBlocked
    );

  const composerDisabled =
    !selectedChat ||
    blockStatusLoading ||
    isBlocked;

  /* =========================
     IMAGE PREVIEW
  ========================= */

  const previewUrl =
    useMemo(() => {
      if (!selectedImage) {
        return "";
      }

      return URL.createObjectURL(
        selectedImage
      );
    }, [selectedImage]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);

  /* =========================
     RESET HELPERS
  ========================= */

  const resetImage =
    useCallback(() => {
      setSelectedImage(null);

      if (imageRef.current) {
        imageRef.current.value = "";
      }
    }, []);

  const resetTextareaHeight =
    useCallback(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) {
        return;
      }


      textarea.style.height = "";
    }, []);

  /* =========================
 RESET ON CHAT CHANGE
========================= */

  useEffect(() => {
    editingMessageRef.current = null;

    setReplyingTo(null);
    setEditingMessage(null);

    setText("");

    resetImage();
    resetTextareaHeight();
  }, [
    selectedChatId,
    setReplyingTo,
    setEditingMessage,
    resetImage,
    resetTextareaHeight,
  ]);

  const resizeTextarea =
    useCallback(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) {
        return;
      }


      textarea.style.height = "auto";

      const maximumHeight =
        window.innerWidth <= 768
          ? 120
          : 140;

      textarea.style.height =
        `${Math.min(
          textarea.scrollHeight,
          maximumHeight
        )}px`;
    }, []);

  /* =========================
     TYPING
  ========================= */

  const stopTyping =
    useCallback(() => {
      if (typingTimerRef.current) {
        window.clearTimeout(
          typingTimerRef.current
        );

        typingTimerRef.current =
          null;
      }

      const receiverId =
        typingReceiverRef.current;

      if (
        typingActiveRef.current &&
        receiverId &&
        socket?.connected
      ) {
        socket.emit(
          "typing:stop",
          {
            receiverId,
          }
        );
      }

      typingActiveRef.current =
        false;

      typingReceiverRef.current =
        "";
    }, [socket]);

  /* =========================
     BLOCKED CHAT RESET
  ========================= */

  useEffect(() => {
    if (!isBlocked) {
      return;
    }

    stopTyping();

    setText("");
    setReplyingTo(null);
    setEditingMessage(null);

    resetImage();
    resetTextareaHeight();
  }, [
    isBlocked,
    stopTyping,
    setReplyingTo,
    setEditingMessage,
    resetImage,
    resetTextareaHeight,
  ]);

  const emitTypingActivity =
    useCallback(() => {

      if (
        isBlocked ||
        blockStatusLoading
      ) {
        stopTyping();
        return;
      }
      if (isEditing) {
        stopTyping();
        return;
      }

      const receiverId =
        getUserId(selectedChat);

      if (
        !receiverId ||
        !socket?.connected
      ) {
        return;
      }

      if (
        typingReceiverRef.current &&
        typingReceiverRef.current !==
        receiverId
      ) {
        stopTyping();
      }

      typingReceiverRef.current =
        receiverId;

      if (!typingActiveRef.current) {
        socket.emit(
          "typing:start",
          {
            receiverId,
          }
        );

        typingActiveRef.current =
          true;
      }

      if (typingTimerRef.current) {
        window.clearTimeout(
          typingTimerRef.current
        );
      }

      typingTimerRef.current =
        window.setTimeout(() => {
          stopTyping();
        }, 1200);
    }, [
      isBlocked,
      blockStatusLoading,
      isEditing,
      selectedChat,
      socket,
      stopTyping,
    ]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [
    selectedChatId,
    stopTyping,
  ]);

  /* =========================
     START EDIT MODE
  ========================= */

  useEffect(() => {
    if (
      !editingMessageId ||
      editSubmittingIdRef.current ===
      editingMessageId
    ) {
      return undefined;
    }

    editingMessageRef.current =
      editingMessage;

    stopTyping();

    setReplyingTo(null);

    resetImage();

    setText(
      String(
        editingMessage?.text ||
        ""
      )
    );

    const frameId =
      window.requestAnimationFrame(
        () => {
          resizeTextarea();

          textareaRef.current
            ?.focus();

          const textarea =
            textareaRef.current;

          if (textarea) {
            const textLength =
              textarea.value.length;

            textarea.setSelectionRange(
              textLength,
              textLength
            );
          }
        }
      );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );
    };
  }, [
    editingMessageId,
    editingMessage?.text,
    resetImage,
    resizeTextarea,
    setReplyingTo,
    stopTyping,
  ]);

  /* =========================
     CANCEL EDIT
  ========================= */

  const cancelEditing =
    useCallback(() => {
      if (loading) {
        return;
      }

      stopTyping();

      editingMessageRef.current =
        null;

      setEditingMessage(null);
      setText("");

      resetImage();
      resetTextareaHeight();

      window.requestAnimationFrame(
        () => {
          textareaRef.current
            ?.focus();
        }
      );
    }, [
      loading,
      stopTyping,
      setEditingMessage,
      resetImage,
      resetTextareaHeight,
    ]);

  /* =========================
     SAVE EDIT
  ========================= */

  const handleSaveEdit =
    async (
      messageToEdit =
        editingMessageRef.current ||
        editingMessage
    ) => {
      const messageId =
        getUserId(
          messageToEdit
        );

      const currentText =
        text.trim();

      if (
        !messageId ||
        loading ||
        blockStatusLoading ||
        isBlocked
      ) {
        return;
      }

      if (!currentText) {
        toast.warning(
          "Edited message cannot be empty"
        );

        return;
      }

      if (
        currentText.length >
        MAX_MESSAGE_LENGTH
      ) {
        toast.warning(
          `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`
        );

        return;
      }

      const originalText =
        String(
          messageToEdit?.text ||
          ""
        );

      const originalEditedAt =
        messageToEdit?.editedAt ||
        null;

      /*
       * Text change lekapothe
       * API request waste cheyyam.
       */
      if (
        currentText ===
        originalText.trim()
      ) {
        cancelEditing();
        return;
      }

      setLoading(true);
      stopTyping();

      /*
       * Edit save tap chesina ventane composer
       * normal empty mode ki return avuthundi.
       * Socket messageEdited event/API response
       * stale edited text ni input lo malli
       * populate cheyyaledhu.
       */
      editSubmittingIdRef.current =
        messageId;

      editingMessageRef.current =
        null;

      setEditingMessage(null);
      setText("");
      resetTextareaHeight();

      const optimisticEditedAt =
        new Date().toISOString();

      /*
       * Immediate optimistic update.
       */
      setMessages(
        (previous) =>
          Array.isArray(previous)
            ? previous.map(
              (message) =>
                getUserId(message) ===
                  messageId
                  ? {
                    ...message,

                    text:
                      currentText,

                    editedAt:
                      optimisticEditedAt,
                  }
                  : message
            )
            : []
      );

      try {
        const response =
          await editMessage(
            messageId,
            currentText
          );

        const updatedMessage =
          response?.data?.data;

        if (!updatedMessage?._id) {
          throw new Error(
            "Invalid edit response from server"
          );
        }

        setMessages(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (message) =>
                  getUserId(
                    message
                  ) ===
                    messageId
                    ? {
                      ...message,
                      ...updatedMessage,
                    }
                    : message
              )
              : []
        );

        editSubmittingIdRef.current =
          "";

        /*
         * Edit success ayyaka conversation latest
         * message daggaraki move avvadaniki
         * MessageList ki explicit request.
         */
        window.dispatchEvent(
          new CustomEvent(
            "chat:scroll-bottom",
            {
              detail: {
                behavior:
                  "smooth",

                reason:
                  "message-edited",
              },
            }
          )
        );

        loadChatSummaries()
          .catch((error) => {
            console.error(
              "EDIT SUMMARY REFRESH ERROR:",
              error.response?.data ||
              error.message
            );
          });
      } catch (error) {
        console.error(
          "EDIT MESSAGE ERROR:",
          error.response?.data ||
          error.message
        );


        setMessages(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (message) =>
                  getUserId(
                    message
                  ) ===
                    messageId
                    ? {
                      ...message,

                      text:
                        originalText,

                      editedAt:
                        originalEditedAt,
                    }
                    : message
              )
              : []
        );

        /*
         * User typed content preserve.
         */
        setText(currentText);

        window.requestAnimationFrame(
          () => {
            resizeTextarea();

            textareaRef.current
              ?.focus();
          }
        );

        /*
         * Request fail ayithe original edit mode
         * and typed value restore chestham.
         */
        editSubmittingIdRef.current =
          "";

        editingMessageRef.current =
          messageToEdit;

        setEditingMessage(
          messageToEdit
        );

        setText(
          currentText
        );

        window.requestAnimationFrame(
          () => {
            resizeTextarea();

            textareaRef.current
              ?.focus();
          }
        );

        toast.error(
          error.response?.data
            ?.message ||
          error.userMessage ||
          "Unable to edit message"
        );
      } finally {
        setLoading(false);

        if (
          editSubmittingIdRef.current ===
          messageId
        ) {
          editSubmittingIdRef.current =
            "";
        }
      }
    };

  /* =========================
     SEND NEW MESSAGE
  ========================= */

  const handleSendMessage =
    async () => {
      const currentText =
        text.trim();

      const imageToSend =
        selectedImage;

      const replyToSend =
        replyingTo;

      if (
        (
          !currentText &&
          !imageToSend
        ) ||
        !selectedChat ||
        blockStatusLoading ||
        isBlocked
      ) {
        return;
      }

      if (
        currentText.length >
        MAX_MESSAGE_LENGTH
      ) {
        toast.warning(
          `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`
        );

        return;
      }

      const currentUserId =
        getUserId(user);

      const receiverId =
        getUserId(selectedChat);

      if (!currentUserId) {
        toast.error(
          "Current user information is missing"
        );

        return;
      }

      if (!receiverId) {
        toast.error(
          "Unable to identify the selected user"
        );

        return;
      }

      stopTyping();

      const clientMessageId =
        createClientMessageId();

      const tempId =
        `temp-${clientMessageId}`;


      const optimisticImageUrl =
        imageToSend
          ? URL.createObjectURL(
            imageToSend
          )
          : "";

      const tempMessage = {
        _id: tempId,

        clientMessageId,

        text:
          currentText,

        sender: {
          _id:
            currentUserId,

          name:
            user?.name,

          username:
            user?.username,

          profilePic:
            user?.profilePic,
        },

        receiver:
          receiverId,

        createdAt:
          new Date()
            .toISOString(),

        editedAt:
          null,

        status:
          "sending",

        image:
          optimisticImageUrl,

        replyTo:
          replyToSend
            ? {
              _id: replyToSend._id,

              text:
                replyToSend.text || "",

              image:
                replyToSend.image || "",

              sharedPost:
                replyToSend.sharedPost || null,

              sender:
                replyToSend.sender || null,

              deletedForEveryone:
                Boolean(
                  replyToSend
                    .deletedForEveryone
                ),
            }
            : null,

        reactions: [],

        retryPayload: {
          receiver:
            receiverId,

          text:
            currentText,

          replyTo:
            replyToSend?._id ||
            "",

          imageFile:
            imageToSend ||
            null,
        },

        sendError: "",
      };

      let previousSidebarMessage =
        null;

      setChatSummaries(
        (previous) => {
          const safeSummaries =
            Array.isArray(previous)
              ? previous
              : [];

          const matchingSummary =
            safeSummaries.find(
              (summary) =>
                getUserId(
                  summary?.user
                ) === receiverId
            );

          previousSidebarMessage =
            matchingSummary
              ?.lastMessage ||
            null;

          return safeSummaries;
        }
      );

      setMessages(
        (previous) => [
          ...(Array.isArray(previous)
            ? previous
            : []),

          tempMessage,
        ]
      );

      setChatSummaries(
        (previous) => {
          const safeSummaries =
            Array.isArray(previous)
              ? previous
              : [];

          const updatedSummaries =
            safeSummaries.map(
              (summary) => {
                const summaryUserId =
                  getUserId(
                    summary?.user
                  );

                if (
                  summaryUserId !==
                  receiverId
                ) {
                  return summary;
                }

                return {
                  ...summary,
                  lastMessage:
                    tempMessage,
                };
              }
            );

          return updatedSummaries.sort(
            (first, second) => {
              const firstTime =
                new Date(
                  first?.lastMessage
                    ?.createdAt || 0
                ).getTime();

              const secondTime =
                new Date(
                  second?.lastMessage
                    ?.createdAt || 0
                ).getTime();

              return (
                secondTime -
                firstTime
              );
            }
          );
        }
      );

      setText("");
      setReplyingTo(null);

      if (imageToSend) {
        resetImage();
      }

      resetTextareaHeight();

      /*
       * Submit button pointer-down lo focus
       * preserve chestham. Ikkada forced
       * re-focus chesthe mobile keyboard
       * hide/show flicker ravachu.
       */

      try {
        let requestData;

        if (imageToSend) {
          const formData =
            new FormData();

          formData.append(
            "receiver",
            receiverId
          );

          formData.append(
            "clientMessageId",
            clientMessageId
          );

          formData.append(
            "text",
            currentText
          );

          if (replyToSend?._id) {
            formData.append(
              "replyTo",
              replyToSend._id
            );
          }

          formData.append(
            "image",
            imageToSend
          );

          requestData = formData;
        } else {
          requestData = {
            receiver:
              receiverId,

            clientMessageId,

            text:
              currentText,

            ...(replyToSend?._id
              ? {
                replyTo:
                  replyToSend._id,
              }
              : {}),
          };
        }

        const response =
          await sendMessage(
            requestData
          );

        const realMessage =
          response?.data?.data;

        if (!realMessage?._id) {
          throw new Error(
            "Invalid message response from server"
          );
        }

        setMessages(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (message) =>
                  message?._id ===
                    tempId
                    ? realMessage
                    : message
              )
              : []
        );

        setChatSummaries(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (summary) => {
                  const summaryUserId =
                    getUserId(
                      summary?.user
                    );

                  if (
                    summaryUserId !==
                    receiverId
                  ) {
                    return summary;
                  }

                  const lastMessageId =
                    getUserId(
                      summary?.lastMessage
                    );

                  if (
                    lastMessageId !==
                    tempId
                  ) {
                    return summary;
                  }

                  return {
                    ...summary,
                    lastMessage:
                      realMessage,
                  };
                }
              )
              : []
        );

      } catch (error) {
        console.error(
          "SEND MESSAGE ERROR:",
          error.response?.data ||
          error.message
        );

        const sendErrorMessage =
          error.response?.data
            ?.message ||
          error.userMessage ||
          "Message failed to send";

        setMessages(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (message) =>
                  message?._id ===
                    tempId
                    ? {
                      ...message,

                      status:
                        "failed",

                      sendError:
                        sendErrorMessage,

                      retryPayload: {
                        receiver:
                          receiverId,

                        clientMessageId,

                        text:
                          currentText,

                        replyTo:
                          replyToSend?._id ||
                          "",

                        imageFile:
                          imageToSend ||
                          null,
                      },
                    }
                    : message
              )
              : []
        );

        setChatSummaries(
          (previous) =>
            Array.isArray(previous)
              ? previous.map(
                (summary) => {
                  const summaryUserId =
                    getUserId(
                      summary?.user
                    );

                  const lastMessageId =
                    getUserId(
                      summary?.lastMessage
                    );

                  if (
                    summaryUserId !==
                    receiverId ||
                    lastMessageId !==
                    tempId
                  ) {
                    return summary;
                  }

                  return {
                    ...summary,

                    lastMessage: {
                      ...tempMessage,

                      status:
                        "failed",

                      sendError:
                        sendErrorMessage,
                    },
                  };
                }
              )
              : []
        );

        toast.error(
          "Message not sent. Tap Retry on the bubble."
        );
      } finally {
        /*
         * Failed image retry kosam optimistic
         * blob URL page lifecycle varaku valid.
         */
      }
    };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit =
    async () => {
      if (loading) {
        return;
      }

      const pendingEditMessage =
        editingMessageRef.current ||
        editingMessage;

      const pendingEditMessageId =
        getUserId(
          pendingEditMessage
        );

      /*
       * Pending edit target unte normal send
       * endpoint eppudu call kakudadhu.
       */
      if (pendingEditMessageId) {
        await handleSaveEdit(
          pendingEditMessage
        );

        return;
      }

      await handleSendMessage();
    };

  /* =========================
     INPUT CHANGE
  ========================= */

  const handleChange = (
    event
  ) => {
    const nextValue =
      event.target.value;

    setText(nextValue);

    if (isEditing) {
      stopTyping();
    } else if (nextValue.trim()) {
      emitTypingActivity();
    } else {
      stopTyping();
    }

    resizeTextarea();
  };

  const handleEnter = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void handleSubmit();
    }
  };

  const showSubmitButton =
    isEditing ||
    Boolean(text.trim()) ||
    Boolean(selectedImage);

  if (
    selectedChat &&
    isBlocked
  ) {
    const blockedText =
      blockedByMe
        ? "You blocked this user. Unblock them to send messages."
        : blockedMe
          ? "You can’t message this account."
          : "Messaging is unavailable in this conversation.";

    return (
      <div
        className={`${styles.container} ${styles.blockedContainer}`}
        role="status"
      >
        <div
          className={
            styles.blockedNotice
          }
        >
          <Ban
            size={19}
            aria-hidden="true"
          />

          <span>
            {blockedText}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        styles.container
      }
    >
      {isEditing ? (
        <div
          className={`${styles.replyBar} ${styles.editBar}`}
        >
          <div
            className={
              styles.replyInfo
            }
          >
            <span
              className={`${styles.replyLabel} ${styles.editLabel}`}
            >
              Editing message
            </span>
          </div>

          <button
            type="button"
            className={
              styles.replyClose
            }
            onClick={
              cancelEditing
            }
            disabled={
              loading
            }
            aria-label="Cancel editing"
          >
            <X
              size={18}
              aria-hidden="true"
            />
          </button>
        </div>
      ) : (
        replyingTo && (
          <div
            className={
              styles.replyBar
            }
          >
            <div
              className={
                styles.replyInfo
              }
            >
              <span
                className={
                  styles.replyLabel
                }
              >
                Replying to
              </span>

              <p
                className={
                  styles.replyMessage
                }
              >
                {replyingTo.deletedForEveryone
                  ? "Original message was deleted"
                  : replyingTo.text?.trim()
                    ? replyingTo.text
                    : replyingTo.image
                      ? "Photo"
                      : replyingTo
                        .sharedPost?.postId
                        ? "Shared post"
                        : "Message"}
              </p>
            </div>

            <button
              type="button"
              className={
                styles.replyClose
              }
              onClick={() =>
                setReplyingTo(
                  null
                )
              }
              aria-label="Cancel reply"
            >
              <X
                size={18}
                aria-hidden="true"
              />
            </button>
          </div>
        )
      )}

      {!isEditing && (
        <>
          <button
            className={
              styles.icon
            }
            type="button"
            aria-label="Choose emoji"
            disabled={
              composerDisabled
            }
          >
            <Smile
              size={22}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>

          <button
            className={
              styles.icon
            }
            type="button"
            aria-label="Attach image"
            disabled={
              composerDisabled
            }
            onClick={() =>
              imageRef.current
                ?.click()
            }
          >
            <ImagePlus
              size={22}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>

          <input
            type="file"
            hidden
            ref={imageRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file =
                event.target
                  .files?.[0];

              if (!file) {
                return;
              }

              const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
              ];

              if (
                !allowedTypes.includes(
                  file.type
                )
              ) {
                toast.warning(
                  "Please select a JPG, PNG, or WebP image"
                );

                event.target.value =
                  "";

                return;
              }

              const maximumImageSize =
                5 * 1024 * 1024;

              if (
                file.size >
                maximumImageSize
              ) {
                toast.warning(
                  "Image size must be less than 5 MB"
                );

                event.target.value =
                  "";

                return;
              }

              setSelectedImage(
                file
              );
            }}
          />
        </>
      )}

      {!isEditing &&
        selectedImage &&
        previewUrl && (
          <div
            className={
              styles.preview
            }
          >
            <img
              src={previewUrl}
              alt="Selected attachment"
            />

            <button
              type="button"
              aria-label="Remove image"
              onClick={
                resetImage
              }
            >
              <X
                size={16}
                aria-hidden="true"
              />
            </button>
          </div>
        )}

      <div
        className={
          styles.inputWrapper
        }
      >
        <textarea
          ref={
            textareaRef
          }
          rows={1}
          maxLength={
            MAX_MESSAGE_LENGTH
          }
          placeholder={
            isEditing
              ? "Edit message..."
              : "Message..."
          }
          className={
            styles.input
          }
          value={text}
          disabled={
            composerDisabled
          }
          onChange={
            handleChange
          }
          onKeyDown={
            handleEnter
          }
          onFocus={() => {
            /*
             * Chat parent visualViewport height
             * already keyboard ni handle chesthundi.
             * Delayed smooth scroll mobile lo
             * 250–500ms jump/flicker create chesthundi.
             */
            resizeTextarea();
          }}
          onBlur={() => {
            if (!isEditing) {
              stopTyping();
            }
          }}
        />
      </div>

      {showSubmitButton ? (
        <button
          type="button"
          className={
            styles.send
          }
          data-mode={
            isEditing
              ? "edit"
              : "send"
          }
          onPointerDown={(event) => {
            /*
             * Button focus textarea nundi steal
             * cheyyakunda prevent chestham.
             * Keyboard send/edit request time lo
             * continuously open ga untundi.
             */
            event.preventDefault();
          }}
          onClick={() => {
            void handleSubmit();
          }}
          disabled={
            composerDisabled ||
            loading ||
            (
              isEditing &&
              !text.trim()
            )
          }
          aria-label={
            isEditing
              ? "Save edited message"
              : "Send message"
          }
        >
          {isEditing ? (
            <Check
              size={21}
              strokeWidth={2.5}
              aria-hidden="true"
            />
          ) : (
            <SendHorizontal
              size={20}
              strokeWidth={2.5}
              aria-hidden="true"
            />
          )}
        </button>
      ) : (
        <button
          type="button"
          className={
            styles.icon
          }
          aria-label="Record voice message"
          disabled={
            composerDisabled
          }
        >
          <Mic
            size={22}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
};

export default MessageInput;
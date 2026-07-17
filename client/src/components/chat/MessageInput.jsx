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
  Ban,
  Check,
  Smile,
  ImagePlus,
  SendHorizontal,
  Mic,
  X,
} from "lucide-react";

const MAX_MESSAGE_LENGTH = 5000;

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

  const typingTimerRef =
    useRef(null);

  const typingActiveRef =
    useRef(false);

  const typingReceiverRef =
    useRef("");

  const {
    selectedChat,
    setMessages,

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
    loading ||
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
      if (!textareaRef.current) {
        return;
      }

      textareaRef.current.style.height =
        "44px";
    }, []);

  const resizeTextarea =
    useCallback(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.style.height =
        "44px";

      textarea.style.height =
        `${Math.min(
          textarea.scrollHeight,
          140
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
    if (!editingMessageId) {
      return undefined;
    }

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

  const cancelEditing = () => {
    if (loading) {
      return;
    }

    stopTyping();

    setEditingMessage(null);

    setText("");

    resetImage();
    resetTextareaHeight();

    textareaRef.current?.focus();
  };

  /* =========================
     SAVE EDIT
  ========================= */

  const handleSaveEdit =
    async () => {
      const messageId =
        getUserId(
          editingMessage
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
        alert(
          "Edited message cannot be empty"
        );

        return;
      }

      if (
        currentText.length >
        MAX_MESSAGE_LENGTH
      ) {
        alert(
          `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`
        );

        return;
      }

      const originalText =
        String(
          editingMessage?.text ||
          ""
        );

      const originalEditedAt =
        editingMessage?.editedAt ||
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

        setEditingMessage(null);

        setText("");
        resetTextareaHeight();

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

        /*
         * API fail ayithe previous
         * message restore.
         */
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

        alert(
          error.response?.data
            ?.message ||
          error.userMessage ||
          "Unable to edit message"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =========================
     SEND NEW MESSAGE
  ========================= */

  const handleSendMessage =
    async () => {
      const currentText =
        text.trim();

      if (
        (
          !currentText &&
          !selectedImage
        ) ||
        !selectedChat ||
        loading ||
        blockStatusLoading ||
        isBlocked
      ) {
        return;
      }

      if (
        currentText.length >
        MAX_MESSAGE_LENGTH
      ) {
        alert(
          `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`
        );

        return;
      }

      const currentUserId =
        getUserId(user);

      const receiverId =
        getUserId(selectedChat);

      if (!currentUserId) {
        console.error(
          "MESSAGE SEND FAILED: Current user ID missing"
        );

        alert(
          "Current user information is missing"
        );

        return;
      }

      if (!receiverId) {
        console.error(
          "MESSAGE SEND FAILED: Receiver ID missing"
        );

        alert(
          "Unable to identify the selected user"
        );

        return;
      }

      stopTyping();

      const tempId =
        `temp-${Date.now()}`;

      const tempMessage = {
        _id: tempId,

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
          previewUrl,

        replyTo:
          replyingTo
            ? {
              _id:
                replyingTo._id,

              text:
                replyingTo.text ||
                "",

              image:
                replyingTo.image ||
                "",

              sender:
                replyingTo.sender,
            }
            : null,

        reactions: [],
      };

      setMessages(
        (previous) => [
          ...previous,
          tempMessage,
        ]
      );

      setText("");

      resetTextareaHeight();

      setLoading(true);

      try {
        const formData =
          new FormData();

        formData.append(
          "receiver",
          receiverId
        );

        formData.append(
          "text",
          currentText
        );

        if (replyingTo?._id) {
          formData.append(
            "replyTo",
            replyingTo._id
          );
        }

        if (selectedImage) {
          formData.append(
            "image",
            selectedImage
          );
        }

        const response =
          await sendMessage(
            formData
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
            previous.map(
              (message) =>
                message?._id ===
                  tempId
                  ? realMessage
                  : message
            )
        );

        setReplyingTo(null);

        resetImage();

        loadChatSummaries()
          .catch((error) => {
            console.error(
              "LOAD CHAT SUMMARIES ERROR:",
              error.response?.data ||
              error.message
            );
          });
      } catch (error) {
        console.error(
          "SEND MESSAGE ERROR:",
          error.response?.data ||
          error.message
        );

        setMessages(
          (previous) =>
            previous.filter(
              (message) =>
                message?._id !==
                tempId
            )
        );

        /*
         * API fail ayithe typed text
         * and selected image preserve.
         */
        setText(currentText);

        window.requestAnimationFrame(
          () => {
            resizeTextarea();

            textareaRef.current
              ?.focus();
          }
        );

        alert(
          error.response?.data
            ?.message ||
          error.userMessage ||
          "Unable to send message"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit =
    async () => {
      if (isEditing) {
        await handleSaveEdit();
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
                {replyingTo
                  .text?.trim()
                  ? replyingTo.text
                  : replyingTo.image
                    ? "Photo"
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
                alert(
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
                alert(
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
          onClick={() => {
            void handleSubmit();
          }}
          disabled={
            composerDisabled ||
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
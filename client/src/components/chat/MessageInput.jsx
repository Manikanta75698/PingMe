import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./MessageInput.module.css";

import {
  sendMessage,
} from "../../services/chatService";

import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

import {
  Smile,
  ImagePlus,
  SendHorizontal,
  Mic,
  X,
} from "lucide-react";

const getUserId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value?._id || value?.id || ""
    );
  }

  return String(value);
};

const MessageInput = () => {
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [loading, setLoading] =
    useState(false);

  const [
    selectedImage,
    setSelectedImage,
  ] = useState(null);

  const imageRef = useRef(null);
  const textareaRef = useRef(null);

  const {
    selectedChat,
    setMessages,
    socket,
    loadChatSummaries,
    replyingTo,
    setReplyingTo,
  } = useChat();

  const previewUrl = useMemo(() => {
    if (!selectedImage) return "";

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

  const resetImage = () => {
    setSelectedImage(null);

    if (imageRef.current) {
      imageRef.current.value = "";
    }
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height =
        "44px";
    }
  };

  const handleSend = async () => {
    const currentText = text.trim();

    if (
      (!currentText &&
        !selectedImage) ||
      !selectedChat ||
      loading
    ) {
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

    const tempId =
      `temp-${Date.now()}`;

    const tempMessage = {
      _id: tempId,
      text: currentText,

      sender: {
        _id: currentUserId,
        name: user?.name,
        username: user?.username,
        profilePic: user?.profilePic,
      },

      receiver: receiverId,

      createdAt: new Date().toISOString(),

      status: "sending",

      image: previewUrl,

      replyTo: replyingTo
        ? {
          _id: replyingTo._id,
          text: replyingTo.text || "",
          image: replyingTo.image || "",
          sender: replyingTo.sender,
        }
        : null,
    };

    setMessages((previous) => [
      ...previous,
      tempMessage,
    ]);

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
        await sendMessage(formData);

      const realMessage =
        response?.data?.data;

      if (!realMessage) {
        throw new Error(
          "Invalid message response from server"
        );
      }

      setMessages((previous) =>
        previous.map((message) =>
          message?._id === tempId
            ? realMessage
            : message
        )
      );

      setReplyingTo(null);

      loadChatSummaries().catch((error) => {
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

      setMessages((previous) =>
        previous.filter(
          (message) =>
            message?._id !== tempId
        )
      );

      setText(currentText);

      alert(
        error.response?.data
          ?.message ||
        "Unable to send message"
      );
    } finally {
      setLoading(false);
      resetImage();
    }
  };

  const handleChange = (event) => {
    setText(event.target.value);

    const textarea =
      textareaRef.current;

    if (!textarea) return;

    textarea.style.height =
      "44px";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        140
      )}px`;
  };

  const handleEnter = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    const receiverId =
      getUserId(selectedChat);

    const currentUserId =
      getUserId(user);

    if (
      !receiverId ||
      !currentUserId
    ) {
      return;
    }

    socket?.emit("typing", {
      receiverId,
      userId: currentUserId,
    });
  };

  return (
    <div
      className={styles.container}
    >

      {replyingTo && (
        <div className={styles.replyBar}>
          <div className={styles.replyInfo}>
            <span className={styles.replyLabel}>
              Replying to
            </span>

            <p className={styles.replyMessage}>
              {replyingTo.text?.trim()
                ? replyingTo.text
                : replyingTo.image
                  ? "Photo"
                  : "Message"}
            </p>
          </div>

          <button
            type="button"
            className={styles.replyClose}
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <button
        className={styles.icon}
        type="button"
        aria-label="Choose emoji"
      >
        <Smile
          size={22}
          strokeWidth={2}
        />
      </button>

      <button
        className={styles.icon}
        type="button"
        aria-label="Attach image"
        onClick={() =>
          imageRef.current?.click()
        }
      >
        <ImagePlus
          size={22}
          strokeWidth={2}
        />
      </button>

      <input
        type="file"
        hidden
        ref={imageRef}
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file =
            event.target.files?.[0];

          if (!file) return;

          const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
          ];

          if (
            !allowedTypes.includes(file.type)
          ) {
            alert(
              "Please select a JPG, PNG, or WebP image"
            );

            event.target.value = "";
            return;
          }

          const MAX_IMAGE_SIZE =
            5 * 1024 * 1024;

          if (file.size > MAX_IMAGE_SIZE) {
            alert(
              "Image size must be less than 5 MB"
            );

            event.target.value = "";
            return;
          }

          setSelectedImage(file);
        }}
      />

      {selectedImage &&
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
              onClick={resetImage}
            >
              <X size={16} />
            </button>
          </div>
        )}

      <div
        className={
          styles.inputWrapper
        }
      >
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message..."
          className={styles.input}
          value={text}
          disabled={
            loading ||
            !selectedChat
          }
          onChange={handleChange}
          onInput={handleTyping}
          onKeyDown={handleEnter}
        />
      </div>

      {text.trim() ||
        selectedImage ? (
        <button
          type="button"
          className={styles.send}
          onClick={handleSend}
          disabled={
            loading ||
            !selectedChat
          }
          aria-label="Send message"
        >
          <SendHorizontal
            size={20}
            strokeWidth={2.5}
          />
        </button>
      ) : (
        <button
          type="button"
          className={styles.icon}
          aria-label="Record voice message"
          disabled={!selectedChat}
        >
          <Mic
            size={22}
            strokeWidth={2}
          />
        </button>
      )}
    </div>
  );
};

export default MessageInput;
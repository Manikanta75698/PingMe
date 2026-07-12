import { useEffect, useState, useRef } from "react";

import styles from "./MessageInput.module.css";

import { sendMessage } from "../../services/chatService";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

import {
  Smile,
  ImagePlus,
  SendHorizontal,
  Mic,
} from "lucide-react";

const MessageInput = () => {
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);

  const imageRef = useRef(null);
  const textareaRef = useRef(null);

  const {
    selectedChat,
    messages,
    setMessages,
    socket,
  } = useChat();

  useEffect(() => {
    if (
      !selectedChat ||
      !Array.isArray(messages) ||
      document.visibilityState !== "visible"
    ) {
      return;
    }

    const currentUserId =
      user?._id || user?.id;

    const selectedChatId =
      selectedChat?._id || selectedChat?.id;

    if (!currentUserId || !selectedChatId) {
      return;
    }

    const unreadMessageIds = messages
      .filter((message) => {
        const senderId =
          typeof message?.sender === "object"
            ? message.sender?._id ||
            message.sender?.id
            : message?.sender;

        const receiverId =
          typeof message?.receiver === "object"
            ? message.receiver?._id ||
            message.receiver?.id
            : message?.receiver;

        const isReceivedMessage =
          String(senderId) ===
          String(selectedChatId) &&
          String(receiverId) ===
          String(currentUserId);

        return (
          message?._id &&
          !String(message._id).startsWith("temp-") &&
          isReceivedMessage &&
          message.status !== "read"
        );
      })
      .map((message) => String(message._id));

    if (unreadMessageIds.length === 0) {
      return;
    }

    unreadMessageIds.forEach((messageId) => {
      socket.emit("messageRead", {
        messageId,
      });
    });

    // Receiver UI lo repeated emit raakunda local status update
    setMessages((previousMessages) =>
      previousMessages.map((message) =>
        unreadMessageIds.includes(
          String(message?._id)
        )
          ? {
            ...message,
            status: "read",
          }
          : message
      )
    );
  }, [
    messages,
    selectedChat,
    user?._id,
    user?.id,
    socket,
    setMessages,
  ]);

  const handleSend = async () => {
    if ((!text.trim() && !selectedImage) || !selectedChat || loading) {
      return;
    }

    const currentUserId =
      user?._id || user?.id;

    const receiverId =
      selectedChat?._id || selectedChat?.id;

    if (!currentUserId) {
      console.error(
        "MESSAGE SEND FAILED: Current user ID missing",
        user
      );

      alert("Current user information is missing");
      return;
    }

    if (!receiverId) {
      console.error(
        "MESSAGE SEND FAILED: Receiver ID missing",
        selectedChat
      );

      alert("Unable to identify the selected user");
      return;
    }

    const currentText = text.trim();
    const tempId = `temp-${Date.now()}`;

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
      status: "sent",

      image: selectedImage
        ? URL.createObjectURL(selectedImage)
        : "",
    };

    // Message ni UI lo immediate ga show chestundi
    setMessages((prev) => [
      ...prev,
      tempMessage,
    ]);

    // Input clear
    setText("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append(
        "receiver",
        receiverId
      );

      formData.append(
        "text",
        currentText
      );

      if (selectedImage) {
        formData.append(
          "image",
          selectedImage
        );
      }

      console.log("SENDING MESSAGE:", {
        currentUserId,
        receiverId,
        text: currentText,
      });

      const response =
        await sendMessage(formData);

      const realMessage =
        response?.data?.data;

      if (!realMessage) {
        throw new Error(
          "Invalid message response from server"
        );
      }

      // Temporary message ni actual backend message tho replace chestundi
      setMessages((prev) =>
        prev.map((message) =>
          message._id === tempId
            ? realMessage
            : message
        )
      );
    } catch (error) {
      console.error(
        "SEND MESSAGE ERROR:",
        error.response?.data ||
        error.message
      );

      // API fail ayithe temporary message remove
      setMessages((prev) =>
        prev.filter(
          (message) =>
            message._id !== tempId
        )
      );

      alert(
        error.response?.data?.message ||
        "Unable to send message"
      );
    } finally {
      setLoading(false);
      setSelectedImage(null);

      if (imageRef.current) {
        imageRef.current.value = "";
      }
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);

    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleEnter = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.icon}
        type="button"
      >
        <Smile
          size={22}
          strokeWidth={2}
        />
      </button>

      <button
        className={styles.icon}
        type="button"
        onClick={() => imageRef.current?.click()}
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
        accept="image/*"
        onChange={(e) => {
          if (e.target.files.length) {
            setSelectedImage(e.target.files[0]);
          }
        }}
      />

      {selectedImage && (
        <div className={styles.preview}>
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="preview"
          />

          <button
            type="button"
            onClick={() => {
              setSelectedImage(null);

              if (imageRef.current) {
                imageRef.current.value = "";
              }
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message..."
          className={styles.input}
          value={text}
          onChange={handleChange}
          onKeyDown={handleEnter}
        />
      </div>

      {(text.trim() || selectedImage) ? (
        <button
          type="button"
          className={styles.send}
          onClick={handleSend}
          disabled={loading}
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
import { useState, useRef } from "react";

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
    setMessages,
  } = useChat();

  const handleSend = async () => {
    if ((!text.trim() && !selectedImage) || !selectedChat || loading)
      return;

    const currentText = text.trim();

    const tempId = `temp-${Date.now()}`;

    const tempMessage = {
      _id: tempId,
      text: currentText,
      sender: {
        _id: user.id,
        name: user.name,
        username: user.username,
        profilePic: user.profilePic,
      },
      receiver: selectedChat._id,
      createdAt: new Date().toISOString(),
      status: "sent",
      image: selectedImage
        ? URL.createObjectURL(selectedImage)
        : "",
    };

    // Show instantly
    setMessages((prev) => [...prev, tempMessage]);

    // Clear input instantly
    setText("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }

    setLoading(true);

    try {

      const formData = new FormData();

      formData.append("receiver", selectedChat._id);
      formData.append("text", currentText);

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const response = await sendMessage(formData);


      const realMessage = response.data.data;

      // Replace temp message
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? realMessage : msg
        )
      );
    } catch (error) {
      console.error(error);

      // Remove temp message if API failed
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== tempId)
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
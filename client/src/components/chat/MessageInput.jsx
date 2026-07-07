import { useState, useRef } from "react";

import styles from "./MessageInput.module.css";

import { sendMessage } from "../../services/chatService";
import { useChat } from "../../context/ChatContext";

import {
  FiSmile,
  FiPaperclip,
  FiImage,
  FiSend,
} from "react-icons/fi";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const imageRef = useRef(null);

  const {
    selectedChat,
    messages,
    setMessages,
  } = useChat();

  const handleSend = async () => {
    if (!text.trim() || !selectedChat) return;

    try {
      setLoading(true);

      const response = await sendMessage({
        receiver: selectedChat._id,
        text,
      });

      setMessages((prev) => [
        ...prev,
        response.data.data,
      ]);

      setText("");

    } catch (error) {
      console.error(error);

    } finally {
      setLoading(false);
    }
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className={styles.container}>

      <button className={styles.icon}>
        <FiSmile />
      </button>

      <button className={styles.icon}>
        <FiPaperclip />
      </button>

      <button
        className={styles.icon}
        onClick={() => imageRef.current.click()}
      >
        <FiImage />
      </button>

      <input
        type="file"
        hidden
        ref={imageRef}
      />

      <input
        type="text"
        placeholder="Type a message..."
        className={styles.input}
        value={text}
        onChange={(e) =>
          setText(e.target.value)
        }
        onKeyDown={handleEnter}
      />

      <button
        className={styles.send}
        onClick={handleSend}
        disabled={loading}
      >
        <FiSend />
      </button>

    </div>
  );
};

export default MessageInput;
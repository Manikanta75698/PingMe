import {
  ChevronRight,
  Image as ImageIcon,
  Pin,
} from "lucide-react";

import styles from "./PinnedMessageBanner.module.css";

import {
  useChat,
} from "../../context/ChatContext";

const normalizeId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(
      value?._id ||
      value?.id ||
      ""
    );
  }

  return String(value);
};

const PinnedMessageBanner = () => {
  const {
    pinnedMessage,
    requestMessageScroll,
    messageSearchOpen,
  } = useChat();

  const messageId =
    normalizeId(
      pinnedMessage?._id
    );

  if (
    !messageId ||
    !pinnedMessage?.pinnedAt ||
    messageSearchOpen
  ) {
    return null;
  }

  const messageText =
    String(
      pinnedMessage?.text ||
      ""
    ).trim();

  const hasImage =
    Boolean(
      pinnedMessage?.image
    );

  const previewText =
    messageText ||
    (hasImage
      ? "Photo"
      : "Pinned message");

  const pinnedByName =
    pinnedMessage?.pinnedBy
      ?.name ||
    pinnedMessage?.pinnedBy
      ?.username ||
    "";

  const handleClick = () => {
    requestMessageScroll(
      messageId
    );
  };

  return (
    <button
      type="button"
      className={styles.banner}
      onClick={handleClick}
      aria-label="Go to pinned message"
    >
      <span
        className={
          styles.iconWrapper
        }
        aria-hidden="true"
      >
        <Pin
          size={18}
          strokeWidth={2.2}
        />
      </span>

      <span
        className={
          styles.content
        }
      >
        <span
          className={
            styles.title
          }
        >
          Pinned message

          {pinnedByName && (
            <span
              className={
                styles.pinnedBy
              }
            >
              {" "}
              by {pinnedByName}
            </span>
          )}
        </span>

        <span
          className={
            styles.preview
          }
        >
          {hasImage && (
            <ImageIcon
              size={14}
              aria-hidden="true"
            />
          )}

          <span>
            {previewText}
          </span>
        </span>
      </span>

      <ChevronRight
        className={
          styles.chevron
        }
        size={19}
        aria-hidden="true"
      />
    </button>
  );
};

export default PinnedMessageBanner;
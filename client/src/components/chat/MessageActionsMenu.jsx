import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Reply,
  Trash2,
} from "lucide-react";

import styles from "./MessageActionsMenu.module.css";

const REACTIONS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "👍",
  "🔥",
];

const MOBILE_QUERY =
  "(max-width: 768px)";

const VIEWPORT_GAP = 10;
const MENU_GAP = 8;

const MessageActionsMenu = ({
  open,
  anchorRef,
  isOwn = false,
  preview = "Message",
  selectedReaction = "",
  onClose,
  onReply,
  onDelete,
  onReact,
}) => {
  const menuRef = useRef(null);
  const firstReactionRef =
    useRef(null);

  const [
    isMobile,
    setIsMobile,
  ] = useState(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return false;
    }

    return window.matchMedia(
      MOBILE_QUERY
    ).matches;
  });

  const [
    position,
    setPosition,
  ] = useState({
    top: 0,
    left: 0,
    placement: "below",
    ready: false,
  });

  /* =========================
     MOBILE DETECTION
  ========================= */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return undefined;
    }

    const mediaQuery =
      window.matchMedia(
        MOBILE_QUERY
      );

    const handleChange = (
      event
    ) => {
      setIsMobile(
        event.matches
      );
    };

    setIsMobile(
      mediaQuery.matches
    );

    mediaQuery.addEventListener(
      "change",
      handleChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleChange
      );
    };
  }, []);

  /* =========================
     DESKTOP POSITION
  ========================= */

  useLayoutEffect(() => {
    if (
      !open ||
      isMobile ||
      typeof window ===
      "undefined"
    ) {
      return undefined;
    }

    const updatePosition = () => {
      const anchor =
        anchorRef?.current;

      const menu =
        menuRef.current;

      if (!anchor || !menu) {
        return;
      }

      const anchorRect =
        anchor.getBoundingClientRect();

      const menuRect =
        menu.getBoundingClientRect();

      const viewportWidth =
        window.innerWidth;

      const viewportHeight =
        window.innerHeight;

      const spaceBelow =
        viewportHeight -
        anchorRect.bottom;

      const shouldPlaceAbove =
        spaceBelow <
        menuRect.height +
        MENU_GAP &&
        anchorRect.top >
        menuRect.height +
        MENU_GAP;

      const rawTop =
        shouldPlaceAbove
          ? anchorRect.top -
          menuRect.height -
          MENU_GAP
          : anchorRect.bottom +
          MENU_GAP;

      const rawLeft =
        anchorRect.right -
        menuRect.width;

      const top = Math.min(
        Math.max(
          rawTop,
          VIEWPORT_GAP
        ),
        viewportHeight -
        menuRect.height -
        VIEWPORT_GAP
      );

      const left = Math.min(
        Math.max(
          rawLeft,
          VIEWPORT_GAP
        ),
        viewportWidth -
        menuRect.width -
        VIEWPORT_GAP
      );

      setPosition({
        top,
        left,
        placement:
          shouldPlaceAbove
            ? "above"
            : "below",
        ready: true,
      });
    };

    const frameId =
      window.requestAnimationFrame(
        updatePosition
      );

    window.addEventListener(
      "resize",
      updatePosition
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true
    );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );

      window.removeEventListener(
        "resize",
        updatePosition
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true
      );
    };
  }, [
    open,
    isMobile,
    anchorRef,
  ]);

  /* =========================
     ESCAPE + FOCUS
  ========================= */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousFocusedElement =
      document.activeElement;

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const focusTimer =
      window.setTimeout(() => {
        firstReactionRef.current
          ?.focus();
      }, 0);

    return () => {
      window.clearTimeout(
        focusTimer
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      if (
        previousFocusedElement
        instanceof HTMLElement
      ) {
        previousFocusedElement.focus();
      }
    };
  }, [open, onClose]);

  /* =========================
     MOBILE SCROLL LOCK
  ========================= */

  useEffect(() => {
    if (
      !open ||
      !isMobile
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    open,
    isMobile,
  ]);

  if (
    !open ||
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  const handleBackdropClick = (
    event
  ) => {
    if (
      event.target ===
      event.currentTarget
    ) {
      onClose?.();
    }
  };

  const handleReaction = (
    emoji
  ) => {
    onReact?.(emoji);
    onClose?.();
  };

  const handleReply = () => {
    onReply?.();
    onClose?.();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose?.();
  };

  const menuStyle =
    isMobile
      ? undefined
      : {
        top: `${position.top}px`,
        left: `${position.left}px`,
        visibility:
          position.ready
            ? "visible"
            : "hidden",
      };

  return createPortal(
    <div
      className={`${styles.backdrop} ${isMobile
          ? styles.mobileBackdrop
          : styles.desktopBackdrop
        }`}
      onMouseDown={
        handleBackdropClick
      }
      onTouchStart={
        handleBackdropClick
      }
      role="presentation"
    >
      <div
        ref={menuRef}
        className={`${styles.menu} ${isMobile
            ? styles.mobileMenu
            : styles.desktopMenu
          } ${position.placement ===
            "above"
            ? styles.above
            : styles.below
          }`}
        style={menuStyle}
        role="menu"
        aria-label="Message actions"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        onTouchStart={(event) =>
          event.stopPropagation()
        }
      >
        <div
          className={
            styles.preview
          }
        >
          <span
            className={
              styles.previewLabel
            }
          >
            Message
          </span>

          <p
            className={
              styles.previewText
            }
          >
            {preview}
          </p>
        </div>

        <div
          className={
            styles.reactionSection
          }
        >
          <span
            className={
              styles.reactionLabel
            }
          >
            React
          </span>

          <div
            className={
              styles.reactionRow
            }
            role="group"
            aria-label="Choose a reaction"
          >
            {REACTIONS.map(
              (emoji, index) => {
                const isSelected =
                  selectedReaction ===
                  emoji;

                return (
                  <button
                    key={emoji}
                    ref={
                      index === 0
                        ? firstReactionRef
                        : undefined
                    }
                    type="button"
                    className={`${styles.reactionButton} ${isSelected
                        ? styles.selectedReaction
                        : ""
                      }`}
                    onClick={() =>
                      handleReaction(
                        emoji
                      )
                    }
                    aria-label={
                      isSelected
                        ? `Remove ${emoji} reaction`
                        : `React with ${emoji}`
                    }
                    aria-pressed={
                      isSelected
                    }
                    role="menuitem"
                  >
                    <span
                      aria-hidden="true"
                    >
                      {emoji}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div
          className={
            styles.divider
          }
        />

        <div
          className={
            styles.actions
          }
        >
          <button
            type="button"
            className={
              styles.actionButton
            }
            onClick={
              handleReply
            }
            role="menuitem"
          >
            <Reply
              size={19}
              aria-hidden="true"
            />

            <span>Reply</span>
          </button>

          {isOwn && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={
                handleDelete
              }
              role="menuitem"
            >
              <Trash2
                size={19}
                aria-hidden="true"
              />

              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MessageActionsMenu;
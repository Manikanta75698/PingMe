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
  Pencil,
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

const OPEN_GUARD_MS = 550;

const MessageActionsMenu = ({
  open,
  anchorRef,
  isOwn = false,
  canEdit = false,
  selectedReaction = "",
  onClose,
  onReply,
  onEdit,
  onDelete,
  onReact,
}) => {
  const menuRef = useRef(null);

  const firstReactionRef =
    useRef(null);

  const onCloseRef =
    useRef(onClose);

  const openedAtRef =
    useRef(0);

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
     LATEST CLOSE CALLBACK
  ========================= */

  useEffect(() => {
    onCloseRef.current =
      onClose;
  }, [onClose]);

  /* =========================
     OPEN TIME GUARD
  ========================= */

  useEffect(() => {
    if (open) {
      openedAtRef.current =
        Date.now();
    }
  }, [open]);

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

    if (
      typeof mediaQuery
        .addEventListener ===
      "function"
    ) {
      mediaQuery.addEventListener(
        "change",
        handleChange
      );
    } else {
      mediaQuery.addListener(
        handleChange
      );
    }

    return () => {
      if (
        typeof mediaQuery
          .removeEventListener ===
        "function"
      ) {
        mediaQuery.removeEventListener(
          "change",
          handleChange
        );
      } else {
        mediaQuery.removeListener(
          handleChange
        );
      }
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

    setPosition(
      (previous) => ({
        ...previous,
        ready: false,
      })
    );

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
     ESCAPE + DESKTOP FOCUS
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

        onCloseRef.current?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    let focusTimer = null;

    /*
     * Mobile lo auto-focus remove.
     * Android/iOS focus flicker prevent.
     */
    if (!isMobile) {
      focusTimer =
        window.setTimeout(() => {
          firstReactionRef.current
            ?.focus();
        }, 0);
    }

    return () => {
      if (focusTimer) {
        window.clearTimeout(
          focusTimer
        );
      }

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      /*
       * Mobile lo focus restore cheyyam.
       * Touch gesture duplicate events prevent.
       */
      if (
        !isMobile &&
        previousFocusedElement
        instanceof HTMLElement &&
        previousFocusedElement
          .isConnected
      ) {
        previousFocusedElement.focus();
      }
    };
  }, [
    open,
    isMobile,
  ]);

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

    const previousOverscroll =
      document.body.style
        .overscrollBehavior;

    document.body.style.overflow =
      "hidden";

    document.body.style
      .overscrollBehavior =
      "none";

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.body.style
        .overscrollBehavior =
        previousOverscroll;
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

  const closeImmediately = () => {
    onCloseRef.current?.();
  };

  const handleBackdropClick = (
    event
  ) => {
    if (
      event.target !==
      event.currentTarget
    ) {
      return;
    }

    const timeSinceOpen =
      Date.now() -
      openedAtRef.current;

    /*
     * Long-press generated click
     * immediate ga menu close cheyyakudadhu.
     */
    if (
      isMobile &&
      timeSinceOpen <
      OPEN_GUARD_MS
    ) {
      return;
    }

    closeImmediately();
  };

  const handleReaction = (
    emoji
  ) => {
    onReact?.(emoji);
    closeImmediately();
  };

  const handleReply = () => {
    onReply?.();
    closeImmediately();
  };

  const handleEdit = () => {
    if (!canEdit) {
      return;
    }

    onEdit?.();
    closeImmediately();
  };

  const handleDelete = () => {
    onDelete?.();
    closeImmediately();
  };

  const stopMenuEvent = (
    event
  ) => {
    event.stopPropagation();
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
      /*
       * pointerdown remove chesam.
       * Click gesture complete ayyaka
       * matrame backdrop close avutundi.
       */
      onClick={
        handleBackdropClick
      }
      onContextMenu={(event) => {
        event.preventDefault();
      }}
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
        onClick={
          stopMenuEvent
        }
        onPointerDown={
          stopMenuEvent
        }
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >

        <div
          className={
            styles.reactionSection
          }
        >

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

          {isOwn && canEdit && (
            <button
              type="button"
              className={
                styles.actionButton
              }
              onClick={
                handleEdit
              }
              role="menuitem"
            >
              <Pencil
                size={19}
                aria-hidden="true"
              />

              <span>Edit</span>
            </button>
          )}

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
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import {
  Reply,
  Trash2,
  X,
} from "lucide-react";

import styles from "./MessageActionsMenu.module.css";

const MOBILE_QUERY =
  "(max-width: 768px)";

const clamp = (
  value,
  minimum,
  maximum
) =>
  Math.min(
    Math.max(value, minimum),
    maximum
  );

const MessageActionsMenu = ({
  open,
  anchorRef,
  isOwn,
  preview,
  onClose,
  onReply,
  onDelete,
}) => {
  const menuRef = useRef(null);
  const firstActionRef = useRef(null);

  const [isMobile, setIsMobile] =
    useState(false);

  const [position, setPosition] =
    useState({
      top: 0,
      left: 0,
      ready: false,
    });

  /*
   * Desktop / mobile layout detection.
   */
  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        MOBILE_QUERY
      );

    const updateDeviceMode = () => {
      setIsMobile(
        mediaQuery.matches
      );
    };

    updateDeviceMode();

    mediaQuery.addEventListener(
      "change",
      updateDeviceMode
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateDeviceMode
      );
    };
  }, []);

  /*
   * Desktop menu placement.
   * Viewport space batti menu paina
   * లేదా kinda automatic ga place avutundi.
   */
  useLayoutEffect(() => {
    if (
      !open ||
      isMobile ||
      !anchorRef?.current
    ) {
      return undefined;
    }

    const updatePosition = () => {
      const anchor =
        anchorRef.current
          ?.getBoundingClientRect();

      const menu =
        menuRef.current
          ?.getBoundingClientRect();

      if (!anchor) {
        return;
      }

      const viewportPadding = 12;
      const menuGap = 8;

      const menuWidth =
        menu?.width || 188;

      const menuHeight =
        menu?.height || 108;

      let left = isOwn
        ? anchor.right - menuWidth
        : anchor.left;

      left = clamp(
        left,
        viewportPadding,
        window.innerWidth -
        menuWidth -
        viewportPadding
      );

      const availableAbove =
        anchor.top -
        viewportPadding;

      const availableBelow =
        window.innerHeight -
        anchor.bottom -
        viewportPadding;

      let top;

      if (
        availableAbove >=
        menuHeight + menuGap ||
        availableAbove >
        availableBelow
      ) {
        top =
          anchor.top -
          menuHeight -
          menuGap;
      } else {
        top =
          anchor.bottom +
          menuGap;
      }

      top = clamp(
        top,
        viewportPadding,
        window.innerHeight -
        menuHeight -
        viewportPadding
      );

      setPosition({
        top,
        left,
        ready: true,
      });
    };

    updatePosition();

    const animationFrame =
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
        animationFrame
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
    isOwn,
    anchorRef,
  ]);

  /*
   * Keyboard accessibility.
   */
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (
      event
    ) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const focusTimer =
      window.setTimeout(() => {
        firstActionRef.current?.focus();
      }, 40);

    return () => {
      window.clearTimeout(
        focusTimer
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, onClose]);

  /*
   * Mobile sheet open unnappudu
   * background scroll lock.
   */
  useEffect(() => {
    if (!open || !isMobile) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open, isMobile]);

  if (
    !open ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const menuStyle = isMobile
    ? undefined
    : {
      top: `${position.top}px`,
      left: `${position.left}px`,
      visibility: position.ready
        ? "visible"
        : "hidden",
    };

  const menu = (
    <>
      <button
        type="button"
        className={
          styles.backdrop
        }
        onClick={onClose}
        aria-label="Close message actions"
        tabIndex={-1}
      />

      <div
        ref={menuRef}
        className={`${styles.menu} ${isMobile
            ? styles.mobileSheet
            : styles.desktopPopover
          }`}
        style={menuStyle}
        role="menu"
        aria-label="Message actions"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div
          className={
            styles.mobileHeader
          }
        >
          <div
            className={
              styles.dragHandle
            }
          />

          <div
            className={
              styles.headerRow
            }
          >
            <div>
              <h3>Message actions</h3>

              {preview && (
                <p>{preview}</p>
              )}
            </div>

            <button
              type="button"
              className={
                styles.closeButton
              }
              onClick={onClose}
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div
          className={
            styles.actions
          }
        >
          <button
            ref={firstActionRef}
            type="button"
            className={
              styles.actionButton
            }
            role="menuitem"
            onClick={() => {
              onReply();
              onClose();
            }}
          >
            <span
              className={
                styles.actionIcon
              }
            >
              <Reply size={19} />
            </span>

            <span
              className={
                styles.actionContent
              }
            >
              <strong>Reply</strong>

              <small>
                Reply to this message
              </small>
            </span>
          </button>

          {isOwn && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.dangerAction}`}
              role="menuitem"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              <span
                className={
                  styles.actionIcon
                }
              >
                <Trash2 size={19} />
              </span>

              <span
                className={
                  styles.actionContent
                }
              >
                <strong>
                  Delete
                </strong>

                <small>
                  Delete this message
                </small>
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(
    menu,
    document.body
  );
};

export default MessageActionsMenu;
import {
  useEffect,
  useRef,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  AlertTriangle,
  Trash2,
  UserRoundX,
  UsersRound,
  X,
} from "lucide-react";

import styles from "./DeleteMessageModal.module.css";

const DeleteMessageModal = ({
  open,
  isOwn = false,
  loadingMode = "",
  error = "",
  onClose,
  onDeleteForMe,
  onDeleteForEveryone,
}) => {
  const modalRef =
    useRef(null);

  const isLoading =
    Boolean(loadingMode);

  /* =========================
     MODAL EFFECTS
  ========================= */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const frameId =
      window.requestAnimationFrame(
        () => {
          modalRef.current?.focus();
        }
      );

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape" &&
        !isLoading
      ) {
        onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    open,
    isLoading,
    onClose,
  ]);

  if (
    !open ||
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  /* =========================
     BACKDROP CLOSE
  ========================= */

  const handleBackdropClick = (
    event
  ) => {
    if (
      event.target ===
      event.currentTarget &&
      !isLoading
    ) {
      onClose?.();
    }
  };

  /* =========================
     MODAL
  ========================= */

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={
        handleBackdropClick
      }
    >
      <section
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-message-title"
        tabIndex={-1}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        {/* CLOSE */}

        <button
          type="button"
          className={
            styles.closeButton
          }
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close delete message"
        >
          <X
            size={19}
            aria-hidden="true"
          />
        </button>

        {/* ICON */}

        <div
          className={
            styles.iconWrapper
          }
        >
          <AlertTriangle
            size={27}
            aria-hidden="true"
          />
        </div>

        {/* TITLE */}

        <h2 id="delete-message-title">
          Delete message?
        </h2>

        <p
          className={
            styles.description
          }
        >
          {isOwn
            ? "Choose how you want to delete this message."
            : "This message will be removed only from your chat."}
        </p>

        {/* ERROR */}

        {error && (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* DELETE OPTIONS */}

        <div
          className={
            styles.deleteOptions
          }
        >
          <button
            type="button"
            className={
              styles.optionButton
            }
            onClick={
              onDeleteForMe
            }
            disabled={isLoading}
          >
            <span
              className={
                styles.optionIcon
              }
            >
              {loadingMode ===
                "forMe" ? (
                <span
                  className={
                    styles.spinner
                  }
                  aria-hidden="true"
                />
              ) : (
                <UserRoundX
                  size={20}
                  aria-hidden="true"
                />
              )}
            </span>

            <span
              className={
                styles.optionText
              }
            >
              <strong>
                Delete for me
              </strong>

              <small>
                Remove only from your chat
              </small>
            </span>
          </button>

          {isOwn && (
            <button
              type="button"
              className={`${styles.optionButton} ${styles.dangerOption}`}
              onClick={
                onDeleteForEveryone
              }
              disabled={isLoading}
            >
              <span
                className={`${styles.optionIcon} ${styles.dangerIcon}`}
              >
                {loadingMode ===
                  "forEveryone" ? (
                  <span
                    className={
                      styles.spinner
                    }
                    aria-hidden="true"
                  />
                ) : (
                  <UsersRound
                    size={20}
                    aria-hidden="true"
                  />
                )}
              </span>

              <span
                className={
                  styles.optionText
                }
              >
                <strong>
                  Delete for everyone
                </strong>

                <small>
                  Remove for everyone in this chat
                </small>
              </span>
            </button>
          )}
        </div>

        {/* FOOTER */}

        <div
          className={
            styles.actions
          }
        >
          <button
            type="button"
            className={
              styles.cancelButton
            }
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>

          {!isOwn && (
            <button
              type="button"
              className={
                styles.deleteButton
              }
              onClick={
                onDeleteForMe
              }
              disabled={isLoading}
            >
              {loadingMode ===
                "forMe" ? (
                <span
                  className={
                    styles.spinner
                  }
                  aria-hidden="true"
                />
              ) : (
                <Trash2
                  size={17}
                  aria-hidden="true"
                />
              )}

              <span>
                {loadingMode ===
                  "forMe"
                  ? "Deleting..."
                  : "Delete"}
              </span>
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
};

export default DeleteMessageModal;
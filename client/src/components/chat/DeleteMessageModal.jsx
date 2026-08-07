import {
  useEffect,
  useRef,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  AlertTriangle,
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
  const modalRef = useRef(null);
  const actionLockedRef = useRef(false);

  const isBusy = Boolean(loadingMode);

  /* =========================
     RESET ACTION LOCK
  ========================= */

  useEffect(() => {
    if (open) {
      actionLockedRef.current = false;
    }
  }, [open]);

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
        !isBusy
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
    isBusy,
    onClose,
  ]);

  if (
    !open ||
    typeof document === "undefined"
  ) {
    return null;
  }

  /* =========================
     BACKDROP
  ========================= */

  const handleBackdropClick = (
    event
  ) => {
    if (
      event.target ===
      event.currentTarget &&
      !isBusy
    ) {
      onClose?.();
    }
  };

  /* =========================
     SAFE ACTION RUNNER
  ========================= */

  const runDeleteAction = (
    callback
  ) => {
    if (
      typeof callback !==
      "function" ||
      actionLockedRef.current ||
      isBusy
    ) {
      return;
    }

    actionLockedRef.current = true;

    try {
      const result = callback();

      if (
        result &&
        typeof result.finally ===
        "function"
      ) {
        result.finally(() => {
          actionLockedRef.current =
            false;
        });
      } else {
        window.setTimeout(() => {
          actionLockedRef.current =
            false;
        }, 350);
      }
    } catch (actionError) {
      actionLockedRef.current = false;

      throw actionError;
    }
  };

  const handleDeleteForMe = () => {
    runDeleteAction(
      onDeleteForMe
    );
  };

  const handleDeleteForEveryone =
    () => {
      if (!isOwn) {
        return;
      }

      runDeleteAction(
        onDeleteForEveryone
      );
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
        aria-describedby="delete-message-description"
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
          disabled={isBusy}
          aria-label="Close delete message dialog"
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
          aria-hidden="true"
        >
          <AlertTriangle
            size={27}
          />
        </div>

        {/* TITLE */}

        <h2 id="delete-message-title">
          Delete message?
        </h2>

        <p
          id="delete-message-description"
          className={
            styles.description
          }
        >
          {isOwn
            ? "Choose who this message should be deleted for."
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

        {/* OPTIONS */}

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
              handleDeleteForMe
            }
            disabled={isBusy}
          >
            <span
              className={
                styles.optionIcon
              }
            >
              <UserRoundX
                size={20}
                aria-hidden="true"
              />
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
                Remove this message only
                from your chat
              </small>
            </span>
          </button>

          {isOwn && (
            <button
              type="button"
              className={`${styles.optionButton} ${styles.dangerOption}`}
              onClick={
                handleDeleteForEveryone
              }
              disabled={isBusy}
            >
              <span
                className={`${styles.optionIcon} ${styles.dangerIcon}`}
              >
                <UsersRound
                  size={20}
                  aria-hidden="true"
                />
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
                  Remove this message
                  for everyone in this chat
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
            disabled={isBusy}
          >
            Cancel
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default DeleteMessageModal;
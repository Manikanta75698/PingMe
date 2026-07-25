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
  if (!open) {
    return null;
  }

  const loading =
    Boolean(loadingMode);

  const handleBackdropClick = (
    event
  ) => {
    if (
      event.target ===
      event.currentTarget &&
      !loading
    ) {
      onClose?.();
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={
        handleBackdropClick
      }
      role="presentation"
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-message-title"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          className={
            styles.closeButton
          }
          onClick={onClose}
          disabled={loading}
          aria-label="Close delete message"
        >
          <X
            size={19}
            aria-hidden="true"
          />
        </button>

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

        {error && (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        )}

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
            disabled={loading}
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
                onDeleteForEveryone
              }
              disabled={loading}
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
                  Replace it with a deleted
                  message notice
                </small>
              </span>
            </button>
          )}
        </div>

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
            disabled={loading}
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
              disabled={loading}
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
    </div>
  );
};

export default DeleteMessageModal;
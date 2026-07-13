import { AlertTriangle, Trash2, X } from "lucide-react";
import styles from "./DeleteMessageModal.module.css";

const DeleteMessageModal = ({
  open,
  loading,
  error,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-message-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className={styles.iconWrapper}>
          <AlertTriangle size={28} />
        </div>

        <h2 id="delete-message-title">Delete message?</h2>

        <p>
          This message will be permanently deleted. This action cannot be
          undone.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className={styles.deleteButton}
            onClick={onConfirm}
            disabled={loading}
          >
            <Trash2 size={17} />

            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteMessageModal;
import {
  memo,
  useEffect,
  useRef,
} from "react";

import {
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";

import styles from "./StoryDeleteModal.module.css";

const StoryDeleteModal = ({
  open,
  deleting = false,
  onCancel,
  onConfirm,
}) => {
  const cancelButtonRef =
    useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow = "hidden";

    const focusTimer =
      window.setTimeout(
        () => {
          cancelButtonRef.current
            ?.focus();
        },
        50
      );

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          "Escape" &&
          !deleting
        ) {
          onCancel();
        }

        if (
          event.key ===
          "Enter" &&
          !deleting
        ) {
          event.preventDefault();
          void onConfirm();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.clearTimeout(
        focusTimer
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style
        .overflow =
        previousOverflow;
    };
  }, [
    deleting,
    onCancel,
    onConfirm,
    open,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={
        styles.backdrop
      }
      role="presentation"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget &&
          !deleting
        ) {
          onCancel();
        }
      }}
    >
      <section
        className={
          styles.modal
        }
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="story-delete-title"
        aria-describedby="story-delete-description"
      >
        <button
          type="button"
          className={
            styles.closeButton
          }
          onClick={
            onCancel
          }
          disabled={
            deleting
          }
          aria-label="Close delete confirmation"
        >
          <X />
        </button>

        <div
          className={
            styles.iconWrapper
          }
        >
          <Trash2 />
        </div>

        <h2
          id="story-delete-title"
        >
          Delete this story?
        </h2>

        <p
          id="story-delete-description"
        >
          This story will be
          permanently removed.
          This action cannot be
          undone.
        </p>

        <div
          className={
            styles.actions
          }
        >
          <button
            ref={
              cancelButtonRef
            }
            type="button"
            className={
              styles.cancelButton
            }
            onClick={
              onCancel
            }
            disabled={
              deleting
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className={
              styles.deleteButton
            }
            onClick={() =>
              void onConfirm()
            }
            disabled={
              deleting
            }
          >
            {deleting ? (
              <>
                <LoaderCircle
                  className={
                    styles.spinner
                  }
                />

                Deleting...
              </>
            ) : (
              <>
                <Trash2 />

                Delete story
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};

export default memo(
  StoryDeleteModal
);
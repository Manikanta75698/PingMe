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

import {
  createPortal,
} from "react-dom";

import styles from "./StoryDeleteModal.module.css";

const StoryDeleteModal = ({
  open,
  deleting = false,
  onCancel,
  onConfirm,
}) => {
  const cancelButtonRef =
    useRef(null);

  const modalRef =
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
        60
      );

    const handleKeyDown =
      (event) => {
        if (
          event.key === "Escape" &&
          !deleting
        ) {
          event.preventDefault();

          onCancel();
          return;
        }

        if (
          event.key === "Enter" &&
          !deleting
        ) {
          const target =
            event.target;

          if (
            target instanceof HTMLElement &&
            target.tagName === "BUTTON"
          ) {
            return;
          }

          event.preventDefault();

          void onConfirm();
        }

        if (
          event.key === "Tab" &&
          modalRef.current
        ) {
          const focusableElements =
            modalRef.current
              .querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
              );

          if (
            focusableElements.length ===
            0
          ) {
            return;
          }

          const firstElement =
            focusableElements[0];

          const lastElement =
            focusableElements[
            focusableElements.length -
            1
            ];

          if (
            event.shiftKey &&
            document.activeElement ===
            firstElement
          ) {
            event.preventDefault();

            lastElement.focus();
          } else if (
            !event.shiftKey &&
            document.activeElement ===
            lastElement
          ) {
            event.preventDefault();

            firstElement.focus();
          }
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

  if (
    !open ||
    typeof document === "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div
      className={
        styles.backdrop
      }
      role="presentation"
      onPointerDown={(event) => {
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
        ref={modalRef}
        className={
          styles.modal
        }
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="story-delete-title"
        aria-describedby="story-delete-description"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
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
          aria-hidden="true"
        >
          <Trash2 />
        </div>

        <div
          className={
            styles.content
          }
        >
          <h2
            id="story-delete-title"
          >
            Delete this story?
          </h2>

          <p
            id="story-delete-description"
          >
            This story will be permanently
            removed. This action cannot be
            undone.
          </p>
        </div>

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
            onClick={() => {
              void onConfirm();
            }}
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

                <span>
                  Deleting...
                </span>
              </>
            ) : (
              <>
                <Trash2 />

                <span>
                  Delete story
                </span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default memo(
  StoryDeleteModal
);
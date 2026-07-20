import {
  memo,
  useEffect,
} from "react";

import {
  CheckCircle2,
  CircleAlert,
  Info,
  X,
} from "lucide-react";

import styles from "./StoryToast.module.css";

const StoryToast = ({
  toast,
  onClose,
}) => {
  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          onClose();
        },
        toast.duration ||
        3500
      );

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [
    onClose,
    toast,
  ]);

  if (!toast) {
    return null;
  }

  const toastType =
    toast.type ||
    "info";

  const ToastIcon =
    toastType ===
      "success"
      ? CheckCircle2
      : toastType ===
        "error"
        ? CircleAlert
        : Info;

  return (
    <div
      className={`${styles.toast} ${styles[toastType] ||
        styles.info
        }`}
      role={
        toastType === "error"
          ? "alert"
          : "status"
      }
      aria-live={
        toastType === "error"
          ? "assertive"
          : "polite"
      }
    >
      <div
        className={
          styles.icon
        }
      >
        <ToastIcon />
      </div>

      <div
        className={
          styles.content
        }
      >
        {toast.title && (
          <strong>
            {toast.title}
          </strong>
        )}

        <span>
          {toast.message}
        </span>
      </div>

      <button
        type="button"
        onClick={
          onClose
        }
        aria-label="Close notification"
      >
        <X />
      </button>
    </div>
  );
};

export default memo(
  StoryToast
);
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

import styles from "./ToastProvider.module.css";

const ToastContext = createContext(null);

const AUTO_CLOSE_TIME = 3500;
const EXIT_ANIMATION_TIME = 200;
const MAX_VISIBLE_TOASTS = 4;

const createToastId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const TOAST_CONFIG = {
  success: {
    title: "Success",
    icon: CheckCircle2,
  },
  error: {
    title: "Error",
    icon: AlertCircle,
  },
  warning: {
    title: "Warning",
    icon: AlertTriangle,
  },
  info: {
    title: "Information",
    icon: Info,
  },
};

const ToastItem = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const removeTimerRef = useRef(null);
  const exitTimerRef = useRef(null);

  const handleRemove = useCallback(() => {
    if (isExiting) return;

    setIsExiting(true);

    exitTimerRef.current = window.setTimeout(() => {
      onRemove(toast.id);
    }, EXIT_ANIMATION_TIME);
  }, [isExiting, onRemove, toast.id]);

  useEffect(() => {
    removeTimerRef.current = window.setTimeout(() => {
      handleRemove();
    }, toast.duration);

    return () => {
      window.clearTimeout(removeTimerRef.current);
      window.clearTimeout(exitTimerRef.current);
    };
  }, [handleRemove, toast.duration]);

  const config =
    TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;

  const Icon = config.icon;

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${isExiting ? styles.exiting : ""
        }`}
      role={toast.type === "error" ? "alert" : "status"}
      style={{
        "--toast-duration": `${toast.duration}ms`,
      }}
    >
      <div className={styles.iconWrapper} aria-hidden="true">
        <Icon className={styles.icon} />
      </div>

      <div className={styles.content}>
        <p className={styles.title}>
          {toast.title || config.title}
        </p>

        <p className={styles.message}>{toast.message}</p>
      </div>

      <button
        type="button"
        className={styles.closeButton}
        onClick={handleRemove}
        aria-label="Dismiss notification"
      >
        <X className={styles.closeIcon} />
      </button>

      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressBar} />
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((toastId) => {
    setToasts((previous) =>
      previous.filter((toast) => toast.id !== toastId)
    );
  }, []);

  const showToast = useCallback(
    ({
      message,
      title,
      type = "info",
      duration = AUTO_CLOSE_TIME,
    }) => {
      if (!message || typeof message !== "string") return null;

      const safeType = TOAST_CONFIG[type] ? type : "info";
      const safeDuration =
        Number.isFinite(duration) && duration > 0
          ? duration
          : AUTO_CLOSE_TIME;

      const id = createToastId();

      const newToast = {
        id,
        message: message.trim(),
        title,
        type: safeType,
        duration: safeDuration,
      };

      setToasts((previous) => [
        ...previous.slice(-(MAX_VISIBLE_TOASTS - 1)),
        newToast,
      ]);

      return id;
    },
    []
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({
      show: showToast,

      success: (message, options = {}) =>
        showToast({
          ...options,
          message,
          type: "success",
        }),

      error: (message, options = {}) =>
        showToast({
          ...options,
          message,
          type: "error",
        }),

      warning: (message, options = {}) =>
        showToast({
          ...options,
          message,
          type: "warning",
        }),

      info: (message, options = {}) =>
        showToast({
          ...options,
          message,
          type: "info",
        }),

      remove: removeToast,
      clear: clearToasts,
    }),
    [clearToasts, removeToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className={styles.viewport}
        aria-live="polite"
        aria-relevant="additions removals"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToastContext must be used inside ToastProvider"
    );
  }

  return context;
};
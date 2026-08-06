import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

import styles from "./ToastProvider.module.css";

const ToastContext =
  createContext(null);

const AUTO_CLOSE_TIME = 3500;
const EXIT_ANIMATION_TIME = 220;
const MAX_VISIBLE_TOASTS = 4;
const DUPLICATE_WINDOW = 1200;

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

const createToastId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
    "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const getSafeDuration = (
  duration
) => {
  const numericDuration =
    Number(duration);

  if (
    !Number.isFinite(
      numericDuration
    ) ||
    numericDuration <= 0
  ) {
    return AUTO_CLOSE_TIME;
  }

  return Math.max(
    1000,
    Math.round(
      numericDuration
    )
  );
};

const ToastItem = ({
  toast,
  onRemove,
}) => {
  const [
    isExiting,
    setIsExiting,
  ] = useState(false);

  const [
    paused,
    setPaused,
  ] = useState(false);

  const autoCloseTimerRef =
    useRef(null);

  const exitTimerRef =
    useRef(null);

  const startedAtRef =
    useRef(Date.now());

  const remainingTimeRef =
    useRef(toast.duration);

  const removeStartedRef =
    useRef(false);

  const clearAutoCloseTimer =
    useCallback(() => {
      if (
        autoCloseTimerRef.current
      ) {
        window.clearTimeout(
          autoCloseTimerRef.current
        );

        autoCloseTimerRef.current =
          null;
      }
    }, []);

  const handleRemove =
    useCallback(() => {
      if (
        removeStartedRef.current
      ) {
        return;
      }

      removeStartedRef.current =
        true;

      clearAutoCloseTimer();
      setIsExiting(true);

      exitTimerRef.current =
        window.setTimeout(
          () => {
            onRemove(toast.id);
          },
          EXIT_ANIMATION_TIME
        );
    }, [
      clearAutoCloseTimer,
      onRemove,
      toast.id,
    ]);

  const startAutoCloseTimer =
    useCallback(() => {
      clearAutoCloseTimer();

      if (
        removeStartedRef.current ||
        remainingTimeRef.current <=
        0
      ) {
        return;
      }

      startedAtRef.current =
        Date.now();

      autoCloseTimerRef.current =
        window.setTimeout(
          handleRemove,
          remainingTimeRef.current
        );
    }, [
      clearAutoCloseTimer,
      handleRemove,
    ]);

  const pauseTimer =
    useCallback(() => {
      if (
        removeStartedRef.current ||
        paused
      ) {
        return;
      }

      const elapsed =
        Date.now() -
        startedAtRef.current;

      remainingTimeRef.current =
        Math.max(
          0,
          remainingTimeRef.current -
          elapsed
        );

      clearAutoCloseTimer();
      setPaused(true);
    }, [
      clearAutoCloseTimer,
      paused,
    ]);

  const resumeTimer =
    useCallback(() => {
      if (
        removeStartedRef.current ||
        !paused
      ) {
        return;
      }

      setPaused(false);

      if (
        remainingTimeRef.current <=
        0
      ) {
        handleRemove();
        return;
      }

      startAutoCloseTimer();
    }, [
      handleRemove,
      paused,
      startAutoCloseTimer,
    ]);

  useState(() => {
    startAutoCloseTimer();

    return undefined;
  });

  const config =
    TOAST_CONFIG[
    toast.type
    ] ||
    TOAST_CONFIG.info;

  const Icon =
    config.icon;

  const role =
    toast.type === "error" ||
      toast.type === "warning"
      ? "alert"
      : "status";

  return (
    <article
      className={`${styles.toast} ${styles[toast.type]
        } ${isExiting
          ? styles.exiting
          : ""
        } ${paused
          ? styles.paused
          : ""
        }`}
      role={role}
      aria-atomic="true"
      onMouseEnter={
        pauseTimer
      }
      onMouseLeave={
        resumeTimer
      }
      onFocusCapture={
        pauseTimer
      }
      onBlurCapture={(
        event
      ) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget
          )
        ) {
          resumeTimer();
        }
      }}
      style={{
        "--toast-duration":
          `${toast.duration}ms`,
      }}
    >
      <div
        className={
          styles.iconWrapper
        }
        aria-hidden="true"
      >
        <Icon
          className={
            styles.icon
          }
        />
      </div>

      <div
        className={
          styles.content
        }
      >
        <p
          className={
            styles.title
          }
        >
          {toast.title ||
            config.title}
        </p>

        <p
          className={
            styles.message
          }
        >
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        className={
          styles.closeButton
        }
        onClick={
          handleRemove
        }
        aria-label="Dismiss notification"
      >
        <X
          className={
            styles.closeIcon
          }
          aria-hidden="true"
        />
      </button>

      <div
        className={
          styles.progressTrack
        }
        aria-hidden="true"
      >
        <div
          className={
            styles.progressBar
          }
        />
      </div>
    </article>
  );
};

export const ToastProvider = ({
  children,
}) => {
  const [
    toasts,
    setToasts,
  ] = useState([]);

  const recentToastRef =
    useRef({
      signature: "",
      timestamp: 0,
      id: null,
    });

  const removeToast =
    useCallback(
      (toastId) => {
        setToasts(
          (previous) =>
            previous.filter(
              (toast) =>
                toast.id !==
                toastId
            )
        );
      },
      []
    );

  const showToast =
    useCallback(
      ({
        message,
        title,
        type = "info",
        duration =
        AUTO_CLOSE_TIME,
      }) => {
        if (
          typeof message !==
          "string"
        ) {
          return null;
        }

        const cleanMessage =
          message.trim();

        if (!cleanMessage) {
          return null;
        }

        const safeType =
          TOAST_CONFIG[type]
            ? type
            : "info";

        const cleanTitle =
          typeof title ===
            "string" &&
            title.trim()
            ? title.trim()
            : undefined;

        const safeDuration =
          getSafeDuration(
            duration
          );

        const signature =
          `${safeType}|${cleanTitle || ""}|${cleanMessage}`;

        const now =
          Date.now();

        if (
          recentToastRef.current
            .signature ===
          signature &&
          now -
          recentToastRef.current
            .timestamp <
          DUPLICATE_WINDOW
        ) {
          return recentToastRef
            .current.id;
        }

        const id =
          createToastId();

        recentToastRef.current =
        {
          signature,
          timestamp: now,
          id,
        };

        const newToast = {
          id,
          type: safeType,
          title: cleanTitle,
          message: cleanMessage,
          duration:
            safeDuration,
        };

        setToasts(
          (previous) => {
            const withoutExactDuplicate =
              previous.filter(
                (toast) =>
                  !(
                    toast.type ===
                    safeType &&
                    toast.title ===
                    cleanTitle &&
                    toast.message ===
                    cleanMessage
                  )
              );

            return [
              ...withoutExactDuplicate.slice(
                -(
                  MAX_VISIBLE_TOASTS -
                  1
                )
              ),

              newToast,
            ];
          }
        );

        return id;
      },
      []
    );

  const clearToasts =
    useCallback(() => {
      setToasts([]);

      recentToastRef.current =
      {
        signature: "",
        timestamp: 0,
        id: null,
      };
    }, []);

  const success =
    useCallback(
      (
        message,
        options = {}
      ) =>
        showToast({
          ...options,
          message,
          type: "success",
        }),
      [showToast]
    );

  const error =
    useCallback(
      (
        message,
        options = {}
      ) =>
        showToast({
          ...options,
          message,
          type: "error",
        }),
      [showToast]
    );

  const warning =
    useCallback(
      (
        message,
        options = {}
      ) =>
        showToast({
          ...options,
          message,
          type: "warning",
        }),
      [showToast]
    );

  const info =
    useCallback(
      (
        message,
        options = {}
      ) =>
        showToast({
          ...options,
          message,
          type: "info",
        }),
      [showToast]
    );

  const value =
    useMemo(
      () => ({
        show: showToast,
        success,
        error,
        warning,
        info,
        remove:
          removeToast,
        clear:
          clearToasts,
      }),
      [
        clearToasts,
        error,
        info,
        removeToast,
        showToast,
        success,
        warning,
      ]
    );

  return (
    <ToastContext.Provider
      value={value}
    >
      {children}

      <div
        className={
          styles.viewport
        }
        aria-label="Notifications"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map(
          (toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={
                removeToast
              }
            />
          )
        )}
      </div>
    </ToastContext.Provider>
  );
};

export const useToastContext =
  () => {
    const context =
      useContext(
        ToastContext
      );

    if (!context) {
      throw new Error(
        "useToastContext must be used inside ToastProvider"
      );
    }

    return context;
  };
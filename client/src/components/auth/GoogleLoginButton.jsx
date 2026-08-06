import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  GoogleLogin,
} from "@react-oauth/google";

import {
  useNavigate,
} from "react-router-dom";

import {
  AlertCircle,
  LoaderCircle,
  X,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  googleLogin,
} from "../../services/authService";

import styles from "./GoogleLoginButton.module.css";

const DEFAULT_BUTTON_WIDTH = 400;
const MIN_BUTTON_WIDTH = 250;

/* =====================================
   GOOGLE BUTTON
===================================== */

const GoogleButtonCore = memo(
  ({
    onSuccess,
    onError,
    width,
  }) => (
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      theme="outline"
      shape="pill"
      size="large"
      text="continue_with"
      logo_alignment="left"
      width={String(width)}
      useOneTap={false}
      use_fedcm_for_button
      cancel_on_tap_outside
    />
  )
);

GoogleButtonCore.displayName =
  "GoogleButtonCore";

/* =====================================
   RESPONSE HELPERS
===================================== */

const getGoogleLoginError = (
  error
) => {
  const status =
    error?.response?.status;

  const serverMessage =
    error?.response?.data
      ?.message;

  if (
    typeof navigator !==
    "undefined" &&
    !navigator.onLine
  ) {
    return "You appear to be offline. Check your internet connection.";
  }

  if (
    error?.code ===
    "ECONNABORTED"
  ) {
    return "Google sign-in took too long. Please try again.";
  }

  if (status === 401) {
    return (
      serverMessage ||
      "Google authentication failed. Please try again."
    );
  }

  if (status === 403) {
    return (
      serverMessage ||
      "Google sign-in is not available for this account."
    );
  }

  if (status === 429) {
    return (
      serverMessage ||
      "Too many sign-in attempts. Please wait and try again."
    );
  }

  if (
    status &&
    status >= 500
  ) {
    return "The server is temporarily unavailable. Please try again.";
  }

  return (
    serverMessage ||
    error?.message ||
    "Unable to continue with Google."
  );
};

/* =====================================
   MAIN COMPONENT
===================================== */

const GoogleLoginButton = ({
  disabled = false,
  className = "",
  onAuthenticated,
}) => {
  const navigate =
    useNavigate();

  const {
    setUser,
  } = useAuth();

  const containerRef =
    useRef(null);

  const requestInFlightRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  const disabledRef =
    useRef(disabled);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    buttonWidth,
    setButtonWidth,
  ] = useState(
    DEFAULT_BUTTON_WIDTH
  );

  disabledRef.current =
    disabled;

  const isDisabled =
    disabled || loading;

  /* =====================================
     MOUNT STATUS
  ===================================== */

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;
    };
  }, []);

  /* =====================================
     RESPONSIVE BUTTON WIDTH
  ===================================== */

  useEffect(() => {
    const element =
      containerRef.current;

    if (!element) {
      return undefined;
    }

    const updateWidth =
      () => {
        const availableWidth =
          Math.floor(
            element.getBoundingClientRect()
              .width
          );

        const nextWidth =
          Math.max(
            MIN_BUTTON_WIDTH,
            Math.min(
              DEFAULT_BUTTON_WIDTH,
              availableWidth
            )
          );

        setButtonWidth(
          nextWidth
        );
      };

    updateWidth();

    if (
      typeof ResizeObserver ===
      "undefined"
    ) {
      window.addEventListener(
        "resize",
        updateWidth
      );

      return () => {
        window.removeEventListener(
          "resize",
          updateWidth
        );
      };
    }

    const observer =
      new ResizeObserver(
        updateWidth
      );

    observer.observe(
      element
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  /* =====================================
     LOGIN SUCCESS
  ===================================== */

  const handleSuccess =
    useCallback(
      async (
        credentialResponse
      ) => {
        if (
          disabledRef.current ||
          requestInFlightRef.current
        ) {
          return;
        }

        const credential =
          credentialResponse
            ?.credential;

        if (!credential) {
          setErrorMessage(
            "Google did not return a valid sign-in credential."
          );

          return;
        }

        requestInFlightRef.current =
          true;

        setLoading(true);
        setErrorMessage("");

        try {
          const response =
            await googleLogin(
              credential
            );

          const token =
            response?.token;

          const authenticatedUser =
            response?.user;

          if (
            !token ||
            !authenticatedUser
          ) {
            throw new Error(
              "Invalid Google login response."
            );
          }

          try {
            localStorage.setItem(
              "token",
              token
            );

            localStorage.setItem(
              "user",
              JSON.stringify(
                authenticatedUser
              )
            );
          } catch (
          storageError
          ) {
            console.error(
              "GOOGLE LOGIN STORAGE ERROR:",
              storageError
            );

            throw new Error(
              "Unable to save your login session."
            );
          }

          setUser(
            authenticatedUser
          );

          onAuthenticated?.(
            authenticatedUser,
            response
          );

          navigate(
            "/home",
            {
              replace: true,
            }
          );
        } catch (
        loginError
        ) {
          console.error(
            "GOOGLE LOGIN ERROR:",
            loginError
              ?.response?.data ||
            loginError?.message ||
            loginError
          );

          if (
            mountedRef.current
          ) {
            setErrorMessage(
              getGoogleLoginError(
                loginError
              )
            );
          }
        } finally {
          requestInFlightRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setLoading(false);
          }
        }
      },
      [
        navigate,
        onAuthenticated,
        setUser,
      ]
    );

  /* =====================================
     GOOGLE SDK ERROR
  ===================================== */

  const handleError =
    useCallback(() => {
      if (
        disabledRef.current ||
        requestInFlightRef.current
      ) {
        return;
      }

      setErrorMessage(
        "Google sign-in was cancelled or could not be completed."
      );
    }, []);

  const dismissError =
    () => {
      setErrorMessage("");
    };

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className}`}
    >
      <div
        className={`${styles.buttonWrapper} ${isDisabled
            ? styles.disabled
            : ""
          }`}
        style={{
          width:
            `${buttonWidth}px`,
        }}
        aria-disabled={
          isDisabled
        }
        aria-busy={loading}
      >
        <GoogleButtonCore
          onSuccess={
            handleSuccess
          }
          onError={
            handleError
          }
          width={
            buttonWidth
          }
        />

        {isDisabled && (
          <span
            className={
              styles.interactionBlocker
            }
            aria-hidden="true"
          />
        )}

        {loading && (
          <div
            className={
              styles.loadingOverlay
            }
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              size={17}
              className={
                styles.spinner
              }
              aria-hidden="true"
            />

            <span
              className={
                styles.loadingText
              }
            >
              Signing you in...
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div
          className={
            styles.errorBox
          }
          role="alert"
          aria-live="assertive"
        >
          <span
            className={
              styles.errorIcon
            }
            aria-hidden="true"
          >
            <AlertCircle
              size={17}
            />
          </span>

          <p
            className={
              styles.errorMessage
            }
          >
            {errorMessage}
          </p>

          <button
            type="button"
            className={
              styles.dismissButton
            }
            onClick={
              dismissError
            }
            aria-label="Dismiss Google sign-in error"
          >
            <X
              size={16}
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleLoginButton;
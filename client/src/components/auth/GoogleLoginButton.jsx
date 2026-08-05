import {
  memo,
  useCallback,
  useMemo,
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
  useAuth,
} from "../../context/AuthContext";

import api from "../../services/api";

import styles from "./GoogleLoginButton.module.css";

/* =========================
   RESPONSIVE WIDTH
========================= */

const getGoogleButtonWidth = () => {
  if (typeof window === "undefined") {
    return 320;
  }

  const viewportWidth =
    window.innerWidth;

  if (viewportWidth <= 340) {
    return Math.max(
      250,
      viewportWidth - 48
    );
  }

  if (viewportWidth <= 480) {
    return Math.min(
      400,
      viewportWidth - 64
    );
  }

  return 400;
};

/* =========================
   MEMOIZED GOOGLE BUTTON
========================= */

const GoogleButtonCore = memo(
  ({
    onSuccess,
    onError,
    width,
  }) => {
    return (
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
        cancel_on_tap_outside
      />
    );
  }
);

GoogleButtonCore.displayName =
  "GoogleButtonCore";

/* =========================
   MAIN COMPONENT
========================= */

const GoogleLoginButton = ({
  disabled = false,
}) => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const requestInFlightRef =
    useRef(false);

  const disabledRef =
    useRef(disabled);

  disabledRef.current = disabled;

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const buttonWidth = useMemo(
    () => getGoogleButtonWidth(),
    []
  );

  const isDisabled =
    disabled || loading;

  /* =========================
     LOGIN SUCCESS
  ========================= */

  const handleSuccess = useCallback(
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
        const apiResponse =
          await api.post(
            "/auth/google",
            {
              credential:
                String(
                  credential
                ).trim(),
            },
            {
              timeout: 90000,
            }
          );

        const response =
          apiResponse?.data;

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

        setUser(
          authenticatedUser
        );

        navigate(
          "/home",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "GOOGLE LOGIN ERROR:",
          error?.response?.data ||
          error?.message ||
          error
        );

        if (!navigator.onLine) {
          setErrorMessage(
            "You are offline. Check your internet connection."
          );
        } else if (
          error?.code ===
          "ECONNABORTED"
        ) {
          setErrorMessage(
            "Google sign-in took too long. Please try again."
          );
        } else {
          setErrorMessage(
            error?.response?.data
              ?.message ||
            error?.message ||
            "Unable to continue with Google."
          );
        }
      } finally {
        requestInFlightRef.current =
          false;

        setLoading(false);
      }
    },
    [
      navigate,
      setUser,
    ]
  );

  /* =========================
     LOGIN ERROR
  ========================= */

  const handleError =
    useCallback(() => {
      if (
        disabledRef.current ||
        requestInFlightRef.current
      ) {
        return;
      }

      setErrorMessage(
        "Google sign-in was cancelled or unsuccessful."
      );
    }, []);

  return (
    <div
      className={styles.container}
    >
      <div
        className={`${styles.buttonWrapper} ${isDisabled
          ? styles.disabled
          : ""
          }`}
        style={{
          width: `${buttonWidth}px`,
          maxWidth: "100%",
        }}
        aria-disabled={isDisabled}
        aria-busy={loading}
      >
        <GoogleButtonCore
          onSuccess={handleSuccess}
          onError={handleError}
          width={buttonWidth}
        />

        {loading && (
          <div
            className={
              styles.loadingOverlay
            }
            role="status"
            aria-live="polite"
          >
            <span
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
            !
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
            onClick={() =>
              setErrorMessage("")
            }
            aria-label="Dismiss Google sign-in error"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleLoginButton;
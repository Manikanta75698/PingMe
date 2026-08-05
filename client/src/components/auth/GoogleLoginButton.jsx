import {
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
  useAuth,
} from "../../context/AuthContext";

import {
  googleLogin,
} from "../../services/authService";

import styles from "./GoogleLoginButton.module.css";

const GOOGLE_MAX_WIDTH = 400;
const GOOGLE_DEFAULT_WIDTH = 300;

const GoogleLoginButton = ({
  disabled = false,
}) => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const wrapperRef = useRef(null);
  const requestInFlightRef =
    useRef(false);

  const [loading, setLoading] =
    useState(false);

  const [
    buttonWidth,
    setButtonWidth,
  ] = useState(
    GOOGLE_DEFAULT_WIDTH
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const isDisabled =
    disabled || loading;

  /* =========================
     RESPONSIVE WIDTH
  ========================= */

  useEffect(() => {
    const wrapper =
      wrapperRef.current;

    if (!wrapper) {
      return undefined;
    }

    const updateButtonWidth = () => {
      const availableWidth =
        Math.floor(
          wrapper.getBoundingClientRect()
            .width
        );

      if (availableWidth <= 0) {
        return;
      }

      setButtonWidth(
        Math.min(
          availableWidth,
          GOOGLE_MAX_WIDTH
        )
      );
    };

    updateButtonWidth();

    const resizeObserver =
      new ResizeObserver(
        updateButtonWidth
      );

    resizeObserver.observe(
      wrapper
    );

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  /* =========================
     GOOGLE LOGIN SUCCESS
  ========================= */

  const handleSuccess = async (
    credentialResponse
  ) => {
    if (
      disabled ||
      loading ||
      requestInFlightRef.current
    ) {
      return;
    }

    const credential =
      credentialResponse?.credential;

    if (!credential) {
      setErrorMessage(
        "Google did not return a valid sign-in credential. Please try again."
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
          "Invalid response received from Google sign-in."
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
          "You are offline. Check your internet connection and try again."
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
          "Unable to continue with Google right now."
        );
      }
    } finally {
      requestInFlightRef.current =
        false;

      setLoading(false);
    }
  };

  /* =========================
     GOOGLE LOGIN ERROR
  ========================= */

  const handleError = () => {
    if (isDisabled) {
      return;
    }

    setErrorMessage(
      "Google sign-in was cancelled or could not be completed."
    );
  };

  return (
    <div
      className={styles.container}
    >
      <div
        ref={wrapperRef}
        className={`${styles.buttonWrapper} ${isDisabled
            ? styles.disabled
            : ""
          }`}
        aria-disabled={isDisabled}
        aria-busy={loading}
      >
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          theme="outline"
          shape="pill"
          size="large"
          text="continue_with"
          logo_alignment="left"
          width={String(
            buttonWidth
          )}
          useOneTap={false}
          cancel_on_tap_outside
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
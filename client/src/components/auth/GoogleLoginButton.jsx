import {
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

const GoogleLoginButton = ({
  disabled = false,
}) => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const requestInFlightRef =
    useRef(false);

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const isDisabled =
    disabled || loading;

  const handleSuccess = async (
    credentialResponse
  ) => {
    if (
      isDisabled ||
      requestInFlightRef.current
    ) {
      return;
    }

    const credential =
      credentialResponse?.credential;

    if (!credential) {
      setErrorMessage(
        "Google authentication did not return a valid credential."
      );

      return;
    }

    requestInFlightRef.current = true;
    setLoading(true);
    setErrorMessage("");

    try {
      const response =
        await googleLogin(
          credential
        );

      if (
        !response?.token ||
        !response?.user
      ) {
        throw new Error(
          "Invalid Google login response"
        );
      }

      localStorage.setItem(
        "token",
        response.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          response.user
        )
      );

      setUser(response.user);

      navigate("/home", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "GOOGLE LOGIN ERROR:",
        error.response?.data ||
        error.message
      );

      if (!navigator.onLine) {
        setErrorMessage(
          "You appear to be offline. Check your internet connection."
        );
      } else if (
        error.code ===
        "ECONNABORTED"
      ) {
        setErrorMessage(
          "Google sign-in took too long. Please try again."
        );
      } else {
        setErrorMessage(
          error.response?.data
            ?.message ||
          error.message ||
          "Unable to continue with Google."
        );
      }
    } finally {
      requestInFlightRef.current =
        false;

      setLoading(false);
    }
  };

  const handleError = () => {
    if (isDisabled) return;

    setErrorMessage(
      "Google sign-in was cancelled or unsuccessful."
    );
  };

  return (
    <div
      className={
        styles.container
      }
    >
      <div
        className={`${styles.buttonWrapper} ${isDisabled
            ? styles.disabled
            : ""
          }`}
        aria-disabled={
          isDisabled
        }
        aria-busy={loading}
      >
        <GoogleLogin
          onSuccess={
            handleSuccess
          }
          onError={
            handleError
          }
          theme="outline"
          shape="pill"
          size="large"
          text="continue_with"
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

            <span>
              Signing in…
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <p
          className={
            styles.errorMessage
          }
          role="alert"
          aria-live="assertive"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default GoogleLoginButton;
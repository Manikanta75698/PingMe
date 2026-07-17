import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";
import GoogleLoginButton from "../../../components/auth/GoogleLoginButton";

import api from "../../../services/api";

import {
  loginUser,
} from "../../../services/authService";

import styles from "./Login.module.css";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [formData, setFormData] =
    useState({
      email: "",
      password: "",
    });

  const [loading, setLoading] =
    useState(false);

  const [
    serverStatus,
    setServerStatus,
  ] = useState("checking");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const checkBackend = useCallback(
    async () => {
      setServerStatus("checking");
      setErrorMessage("");

      try {
        await api.get("/health", {
          timeout: 90000,

          headers: {
            "Cache-Control":
              "no-cache",
          },
        });

        setServerStatus("ready");
      } catch (error) {
        console.error(
          "BACKEND HEALTH ERROR:",
          error.response?.data ||
          error.message
        );

        setServerStatus("error");

        setErrorMessage(
          "Server is taking longer than expected. Please retry."
        );
      }
    },
    []
  );

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setErrorMessage("");

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      loading ||
      serverStatus === "checking"
    ) {
      return;
    }

    if (serverStatus !== "ready") {
      setErrorMessage(
        "Server is not ready. Please retry the connection."
      );

      return;
    }

    const email =
      formData.email
        .trim()
        .toLowerCase();

    const password =
      formData.password;

    if (!email || !password) {
      setErrorMessage(
        "Please enter your email and password."
      );

      return;
    }

    if (
      !EMAIL_PATTERN.test(email)
    ) {
      setErrorMessage(
        "Please enter a valid email address."
      );

      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response =
        await loginUser({
          email,
          password,
        });

      if (
        !response?.token ||
        !response?.user
      ) {
        throw new Error(
          "Invalid login response"
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
        "LOGIN ERROR:",
        error.response?.data ||
        error.message
      );

      const status =
        error.response?.status;

      if (!navigator.onLine) {
        setErrorMessage(
          "You appear to be offline. Check your internet connection."
        );
      } else if (status === 401) {
        setErrorMessage(
          "Invalid email or password."
        );
      } else if (status === 403) {
        setErrorMessage(
          error.response?.data
            ?.message ||
          "Please verify your email before signing in."
        );
      } else if (
        error.code === "ECONNABORTED"
      ) {
        setErrorMessage(
          "The server took too long to respond. Please try again."
        );
      } else {
        setErrorMessage(
          error.response?.data
            ?.message ||
          error.message ||
          "Unable to sign in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const serverStarting =
    serverStatus === "checking";

  const authenticationDisabled =
    loading ||
    serverStarting ||
    serverStatus === "error";

  return (
    <AuthLayout>
      <div
        className={
          styles.container
        }
      >
        <Logo size="xl" />

        <div
          className={
            styles.heading
          }
        >
          <h1>
            Welcome Back 👋
          </h1>

          <p>
            Sign in to continue to
            PingMe
          </p>
        </div>

        {serverStarting && (
          <div
            className={
              styles.serverStatus
            }
            role="status"
            aria-live="polite"
          >
            <span
              className={
                styles.statusSpinner
              }
              aria-hidden="true"
            />

            <span>
              Starting secure
              server…
            </span>
          </div>
        )}

        {serverStatus ===
          "ready" && (
            <div
              className={
                styles.serverReady
              }
              role="status"
            >
              Server ready
            </div>
          )}

        {errorMessage && (
          <div
            className={
              styles.errorMessage
            }
            role="alert"
            aria-live="assertive"
          >
            {errorMessage}
          </div>
        )}

        {serverStatus ===
          "error" && (
            <button
              type="button"
              className={
                styles.retryButton
              }
              onClick={
                checkBackend
              }
            >
              Retry connection
            </button>
          )}

        <form
          className={styles.form}
          onSubmit={handleSubmit}
          noValidate
        >
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={
              formData.email
            }
            onChange={
              handleChange
            }
            placeholder="Enter your email"
            autoComplete="email"
            inputMode="email"
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={
              formData.password
            }
            onChange={
              handleChange
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
          />

          <div
            className={
              styles.forgot
            }
          >
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          <Button
            fullWidth
            type="submit"
            disabled={
              authenticationDisabled
            }
          >
            {loading
              ? "Signing In..."
              : serverStarting
                ? "Starting Server..."
                : "Login"}
          </Button>
        </form>

        <div
          className={
            styles.divider
          }
        >
          <span>OR</span>
        </div>

        <div
          className={`${styles.googleLogin
            } ${authenticationDisabled
              ? styles.googleDisabled
              : ""
            }`}
          aria-disabled={
            authenticationDisabled
          }
        >
          <GoogleLoginButton
            disabled={
              authenticationDisabled
            }
          />
        </div>

        <p
          className={
            styles.footer
          }
        >
          Don&apos;t have an
          account?{" "}

          <Link to="/register">
            Create Account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
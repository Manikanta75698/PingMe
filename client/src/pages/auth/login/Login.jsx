import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  AlertCircle,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";

import {
  useAuth,
} from "../../../context/AuthContext";

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
  const navigate =
    useNavigate();

  const {
    setUser,
  } = useAuth();

  const [
    formData,
    setFormData,
  ] = useState({
    email: "",
    password: "",
  });

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const cleanEmail =
    useMemo(
      () =>
        formData.email
          .trim()
          .toLowerCase(),
      [formData.email]
    );

  const formReady =
    Boolean(
      cleanEmail &&
      formData.password
    );

  /* =====================================
     SILENT BACKEND WARM-UP
  ===================================== */

  useEffect(() => {
    const controller =
      new AbortController();

    const warmUpBackend =
      async () => {
        try {
          await api.get(
            "/health",
            {
              timeout: 90000,

              signal:
                controller.signal,

              headers: {
                "Cache-Control":
                  "no-cache",
              },
            }
          );
        } catch (error) {
          if (
            error?.name ===
            "CanceledError"
          ) {
            return;
          }

          /*
           * Backend warm-up failure should
           * never block the login screen.
           */
        }
      };

    void warmUpBackend();

    return () => {
      controller.abort();
    };
  }, []);

  /* =====================================
     INPUT CHANGE
  ===================================== */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setErrorMessage("");

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  /* =====================================
     LOGIN SUBMIT
  ===================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      const password =
        formData.password;

      if (
        !cleanEmail ||
        !password
      ) {
        setErrorMessage(
          "Enter your email and password to continue."
        );

        return;
      }

      if (
        !EMAIL_PATTERN.test(
          cleanEmail
        )
      ) {
        setErrorMessage(
          "Enter a valid email address."
        );

        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response =
          await loginUser({
            email:
              cleanEmail,

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

        try {
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
        } catch (
        storageError
        ) {
          console.error(
            "LOGIN STORAGE ERROR:",
            storageError
          );

          throw new Error(
            "Unable to save your session"
          );
        }

        setUser(
          response.user
        );

        navigate(
          "/home",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "LOGIN ERROR:",
          error
            ?.response?.data ||
          error?.message
        );

        const status =
          error?.response?.status;

        if (
          !navigator.onLine
        ) {
          setErrorMessage(
            "You appear to be offline. Check your internet connection."
          );
        } else if (
          status === 401
        ) {
          setErrorMessage(
            "The email or password you entered is incorrect."
          );
        } else if (
          status === 403
        ) {
          setErrorMessage(
            error
              ?.response?.data
              ?.message ||
            "Verify your email before signing in."
          );
        } else if (
          status === 429
        ) {
          setErrorMessage(
            "Too many sign-in attempts. Please wait and try again."
          );
        } else if (
          error?.code ===
          "ECONNABORTED"
        ) {
          setErrorMessage(
            "The server took too long to respond. Please try again."
          );
        } else {
          setErrorMessage(
            error
              ?.response?.data
              ?.message ||
            error?.message ||
            "Unable to sign in right now."
          );
        }
      } finally {
        setLoading(false);
      }
    };

  return (
    <AuthLayout>
      <main
        className={
          styles.container
        }
        aria-labelledby="login-title"
      >
        <div
          className={
            styles.topBar
          }
        >
          <Logo size="lg" />

          <span
            className={
              styles.secureBadge
            }
          >
            <LockKeyhole
              size={14}
              aria-hidden="true"
            />

            Secure sign in
          </span>
        </div>

        <header
          className={
            styles.heading
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            Welcome back
          </span>

          <h1
            id="login-title"
          >
            Sign in to PingMe
          </h1>

          <p>
            Continue conversations,
            discover people and stay
            connected.
          </p>
        </header>

        {errorMessage && (
          <div
            className={
              styles.errorMessage
            }
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle
              size={18}
              aria-hidden="true"
            />

            <span>
              {errorMessage}
            </span>
          </div>
        )}

        <form
          className={
            styles.form
          }
          onSubmit={
            handleSubmit
          }
          noValidate
        >
          <div
            className={
              styles.fieldGroup
            }
          >
            <span
              className={
                styles.fieldIcon
              }
              aria-hidden="true"
            >
              <Mail size={17} />
            </span>

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
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={loading}
            />
          </div>

          <div
            className={
              styles.fieldGroup
            }
          >
            <span
              className={
                styles.fieldIcon
              }
              aria-hidden="true"
            >
              <LockKeyhole
                size={17}
              />
            </span>

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
          </div>

          <div
            className={
              styles.formMeta
            }
          >
            <span>
              Use the account linked
              to your PingMe profile.
            </span>

            <Link
              to="/forgot-password"
              className={
                styles.forgotLink
              }
            >
              Forgot password?
            </Link>
          </div>

          <Button
            fullWidth
            type="submit"
            disabled={
              loading ||
              !formReady
            }
          >
            <span
              className={
                styles.buttonContent
              }
            >
              {loading && (
                <LoaderCircle
                  size={18}
                  className={
                    styles.spinner
                  }
                  aria-hidden="true"
                />
              )}

              {loading
                ? "Signing in..."
                : "Sign In"}
            </span>
          </Button>
        </form>

        <div
          className={
            styles.divider
          }
          aria-hidden="true"
        >
          <span>
            or continue with
          </span>
        </div>

        <div
          className={`${styles.googleLogin} ${loading
              ? styles.googleDisabled
              : ""
            }`}
          aria-disabled={
            loading
          }
        >
          <GoogleLoginButton
            disabled={loading}
          />
        </div>

        <p
          className={
            styles.footer
          }
        >
          New to PingMe?

          <Link to="/register">
            Create an account
          </Link>
        </p>

        <p
          className={
            styles.legal
          }
        >
          By continuing, you agree to
          PingMe&apos;s terms and privacy
          policy.
        </p>
      </main>
    </AuthLayout>
  );
};

export default Login;
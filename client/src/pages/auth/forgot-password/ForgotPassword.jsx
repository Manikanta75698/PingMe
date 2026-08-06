import {
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";

import {
  forgotPassword,
} from "../../../services/authService";

import styles from "./ForgotPassword.module.css";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const navigate =
    useNavigate();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const cleanEmail =
    useMemo(
      () =>
        email
          .trim()
          .toLowerCase(),
      [email]
    );

  const emailValid =
    EMAIL_PATTERN.test(
      cleanEmail
    );

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      if (!cleanEmail) {
        setError(
          "Enter your email address to continue."
        );

        return;
      }

      if (!emailValid) {
        setError(
          "Enter a valid email address."
        );

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await forgotPassword({
            email: cleanEmail,
          });

        if (!response?.success) {
          throw new Error(
            response?.message ||
            "Unable to process your request"
          );
        }

        navigate(
          "/reset-otp",
          {
            replace: true,

            state: {
              email:
                cleanEmail,

              cooldown:
                Number(
                  response?.cooldown
                ) || 60,
            },
          }
        );
      } catch (
      requestError
      ) {
        console.error(
          "FORGOT PASSWORD ERROR:",
          requestError
            ?.response?.data ||
          requestError?.message
        );

        const status =
          requestError
            ?.response?.status;

        if (
          !navigator.onLine
        ) {
          setError(
            "You appear to be offline. Check your internet connection."
          );
        } else if (
          status === 404
        ) {
          setError(
            requestError
              ?.response?.data
              ?.message ||
            "No account was found with this email address."
          );
        } else if (
          status === 429
        ) {
          setError(
            requestError
              ?.response?.data
              ?.message ||
            "Too many reset requests. Please wait and try again."
          );
        } else if (
          requestError?.code ===
          "ECONNABORTED"
        ) {
          setError(
            "The server took too long to respond. Please try again."
          );
        } else {
          setError(
            requestError
              ?.response?.data
              ?.message ||
            requestError?.message ||
            "Unable to send the reset code."
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
        aria-labelledby="forgot-password-title"
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
            <ShieldCheck
              size={14}
              aria-hidden="true"
            />

            Secure recovery
          </span>
        </div>

        <div
          className={
            styles.iconWrapper
          }
          aria-hidden="true"
        >
          <KeyRound size={27} />
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
            Account recovery
          </span>

          <h1
            id="forgot-password-title"
          >
            Reset your password
          </h1>

          <p>
            Enter the email connected
            to your account. We&apos;ll
            send you a secure
            verification code.
          </p>
        </header>

        {error && (
          <div
            className={
              styles.error
            }
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle
              size={18}
              aria-hidden="true"
            />

            <span>
              {error}
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
              value={email}
              onChange={(
                event
              ) => {
                setEmail(
                  event.target.value
                );

                setError("");
              }}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={loading}
            />
          </div>

          <p
            className={
              styles.helperText
            }
          >
            For your security, the
            reset code will expire
            after a limited time.
          </p>

          <Button
            fullWidth
            type="submit"
            disabled={
              loading ||
              !cleanEmail
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
                ? "Sending code..."
                : "Send Reset Code"}
            </span>
          </Button>
        </form>

        <footer
          className={
            styles.footer
          }
        >
          <Link to="/">
            <ArrowLeft
              size={15}
              aria-hidden="true"
            />

            Back to sign in
          </Link>
        </footer>
      </main>
    </AuthLayout>
  );
};

export default ForgotPassword;
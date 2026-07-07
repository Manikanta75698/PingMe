import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Button from "../../../components/ui/button";

import styles from "./Otp.module.css";

import {
  verifyOtp,
  resendOtp,
} from "../../../services/authService";

const Otp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const inputRefs = useRef([]);

  const email = location.state?.email || "";

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [countdown, setCountdown] = useState(60);

  // =========================
  // COUNTDOWN TIMER
  // =========================
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // =========================
  // REDIRECT IF EMAIL MISSING
  // =========================
  useEffect(() => {
    if (!email) {
      setError(
        "Verification session missing. Please register again."
      );
    }
  }, [email]);

  // =========================
  // OTP INPUT CHANGE
  // =========================
  const handleChange = (index, value) => {
    const digit = value
      .replace(/\D/g, "")
      .slice(-1);

    const nextOtp = [...otp];

    nextOtp[index] = digit;

    setOtp(nextOtp);
    setError("");
    setMessage("");

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // =========================
  // KEYBOARD NAVIGATION
  // =========================
  const handleKeyDown = (index, e) => {
    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }

    if (
      e.key === "ArrowLeft" &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }

    if (
      e.key === "ArrowRight" &&
      index < 5
    ) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // =========================
  // OTP PASTE SUPPORT
  // =========================
  const handlePaste = (e) => {
    e.preventDefault();

    const pastedValue = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedValue) return;

    const nextOtp = [
      "",
      "",
      "",
      "",
      "",
      "",
    ];

    pastedValue.split("").forEach(
      (digit, index) => {
        nextOtp[index] = digit;
      }
    );

    setOtp(nextOtp);
    setError("");
    setMessage("");

    const focusIndex = Math.min(
      pastedValue.length,
      5
    );

    inputRefs.current[focusIndex]?.focus();
  };

  // =========================
  // VERIFY OTP
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!email) {
      setError(
        "Verification session missing. Please register again."
      );
      return;
    }

    const otpCode = otp.join("");

    if (!/^\d{6}$/.test(otpCode)) {
      setError(
        "Please enter the complete 6-digit OTP."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await verifyOtp({
        email,
        otp: otpCode,
      });

      if (!response?.token || !response?.user) {
        throw new Error(
          "Invalid verification response"
        );
      }

      localStorage.setItem(
        "token",
        response.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.user)
      );

      setUser(response.user);

      navigate("/home", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "VERIFY OTP ERROR:",
        error.response?.data || error.message
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          "OTP verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // RESEND OTP
  // =========================
  const handleResend = async () => {
    if (
      !email ||
      countdown > 0 ||
      resending
    ) {
      return;
    }

    try {
      setResending(true);
      setError("");
      setMessage("");

      const response = await resendOtp({
        email,
      });

      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      setCountdown(
        response?.cooldown || 60
      );

      setMessage(
        response?.message ||
          "A new verification code has been sent."
      );

      inputRefs.current[0]?.focus();
    } catch (error) {
      console.error(
        "RESEND OTP ERROR:",
        error.response?.data || error.message
      );

      const retryAfter =
        error.response?.data?.retryAfter;

      if (retryAfter) {
        setCountdown(retryAfter);
      }

      setError(
        error.response?.data?.message ||
          "Unable to resend OTP"
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout>
      <div className={styles.container}>
        <Logo size="xl" />

        <div className={styles.heading}>
          <h1>Verify OTP</h1>

          <p>
            Enter the 6-digit code sent to
            your email.
          </p>

          {email && (
            <span className={styles.email}>
              {email}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className={styles.otpBoxes}
            onPaste={handlePaste}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] =
                    element;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={
                  index === 0
                    ? "one-time-code"
                    : "off"
                }
                maxLength={1}
                value={digit}
                disabled={
                  loading || resending
                }
                aria-label={`OTP digit ${
                  index + 1
                }`}
                onChange={(e) =>
                  handleChange(
                    index,
                    e.target.value
                  )
                }
                onKeyDown={(e) =>
                  handleKeyDown(index, e)
                }
              />
            ))}
          </div>

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          {message && (
            <p className={styles.success}>
              {message}
            </p>
          )}

          <Button
            fullWidth
            type="submit"
            disabled={
              loading ||
              resending ||
              !email
            }
          >
            {loading
              ? "Verifying..."
              : "Verify OTP"}
          </Button>
        </form>

        <p className={styles.resend}>
          Didn't receive the code?{" "}

          <button
            type="button"
            onClick={handleResend}
            disabled={
              countdown > 0 ||
              resending ||
              !email
            }
          >
            {resending
              ? "Sending..."
              : countdown > 0
                ? `Resend in ${countdown}s`
                : "Resend"}
          </button>
        </p>

        <p className={styles.footer}>
          <Link to="/">
            Back to Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Otp;
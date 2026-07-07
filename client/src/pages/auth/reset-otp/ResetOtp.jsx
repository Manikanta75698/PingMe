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

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Button from "../../../components/ui/button";

import {
  verifyPasswordResetOtp,
  forgotPassword,
} from "../../../services/authService";

import styles from "./ResetOtp.module.css";

const ResetOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const inputRefs = useRef([]);

  const email = location.state?.email || "";

  const initialCooldown =
    location.state?.cooldown ?? 60;

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

  const [countdown, setCountdown] = useState(
    initialCooldown
  );

  // =========================
  // COUNTDOWN
  // =========================
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((prev) =>
        Math.max(0, prev - 1)
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // =========================
  // MISSING SESSION
  // =========================
  useEffect(() => {
    if (!email) {
      setError(
        "Reset session missing. Please start again."
      );
    }
  }, [email]);

  // =========================
  // INPUT CHANGE
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
  // KEYBOARD
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
  // PASTE OTP
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
  // VERIFY RESET OTP
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!email) {
      setError(
        "Reset session missing. Please start again."
      );
      return;
    }

    const otpCode = otp.join("");

    if (!/^\d{6}$/.test(otpCode)) {
      setError(
        "Please enter the complete 6-digit code."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response =
        await verifyPasswordResetOtp({
          email,
          otp: otpCode,
        });

      if (!response?.resetToken) {
        throw new Error(
          "Invalid reset verification response"
        );
      }

      // Do not store reset token in localStorage.
      // Pass it only to next route state.
      navigate("/reset-password", {
        replace: true,
        state: {
          email,
          resetToken: response.resetToken,
        },
      });
    } catch (error) {
      console.error(
        "VERIFY RESET OTP ERROR:",
        error.response?.data ||
          error.message
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to verify reset code"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // RESEND RESET OTP
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

      const response = await forgotPassword({
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
        response?.cooldown ?? 60
      );

      setMessage(
        response?.message ||
          "A new reset code has been sent."
      );

      inputRefs.current[0]?.focus();
    } catch (error) {
      console.error(
        "RESEND RESET OTP ERROR:",
        error.response?.data ||
          error.message
      );

      const retryAfter =
        error.response?.data?.retryAfter;

      if (retryAfter) {
        setCountdown(retryAfter);
      }

      setError(
        error.response?.data?.message ||
          "Unable to resend reset code"
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
          <h1>Verify Reset Code</h1>

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
                aria-label={`Reset code digit ${
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
              : "Verify Code"}
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
          <Link to="/forgot-password">
            Start Again
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default ResetOtp;
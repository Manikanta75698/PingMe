import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import {
  useAuth,
} from "../../../context/AuthContext";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Button from "../../../components/ui/button";

import {
  resendOtp,
  verifyOtp,
} from "../../../services/authService";

import styles from "./Otp.module.css";

const OTP_LENGTH = 6;
const DEFAULT_COUNTDOWN = 60;

const createEmptyOtp = () =>
  Array.from(
    {
      length: OTP_LENGTH,
    },
    () => ""
  );

const maskEmail = (
  email
) => {
  if (
    !email ||
    !email.includes("@")
  ) {
    return email;
  }

  const [
    localPart,
    domain,
  ] = email.split("@");

  if (
    localPart.length <= 2
  ) {
    return `${localPart[0] || "*"}***@${domain}`;
  }

  return `${localPart.slice(
    0,
    2
  )}${"*".repeat(
    Math.min(
      Math.max(
        localPart.length - 2,
        3
      ),
      7
    )
  )}@${domain}`;
};

const getSafeCountdown = (
  value
) => {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    ) ||
    numericValue <= 0
  ) {
    return DEFAULT_COUNTDOWN;
  }

  return Math.ceil(
    numericValue
  );
};

const Otp = () => {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    setUser,
  } = useAuth();

  const inputRefs =
    useRef([]);

  const submitTriggeredRef =
    useRef(false);

  const email =
    String(
      location.state?.email ||
      ""
    )
      .trim()
      .toLowerCase();

  const [
    otp,
    setOtp,
  ] = useState(
    createEmptyOtp
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    resending,
    setResending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    countdown,
    setCountdown,
  ] = useState(
    DEFAULT_COUNTDOWN
  );

  const otpCode =
    useMemo(
      () => otp.join(""),
      [otp]
    );

  const otpComplete =
    /^\d{6}$/.test(
      otpCode
    );

  const maskedEmail =
    useMemo(
      () => maskEmail(email),
      [email]
    );

  const busy =
    loading || resending;

  /* =====================================
     COUNTDOWN TIMER
  ===================================== */

  useEffect(() => {
    if (
      countdown <= 0
    ) {
      return undefined;
    }

    const timer =
      window.setInterval(
        () => {
          setCountdown(
            (previous) =>
              previous > 0
                ? previous - 1
                : 0
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [countdown]);

  /* =====================================
     INITIAL VALIDATION + FOCUS
  ===================================== */

  useEffect(() => {
    if (!email) {
      setError(
        "Your verification session is missing. Please register again."
      );

      return undefined;
    }

    const focusTimer =
      window.setTimeout(
        () => {
          inputRefs.current[0]
            ?.focus();
        },
        120
      );

    return () => {
      window.clearTimeout(
        focusTimer
      );
    };
  }, [email]);

  /* =====================================
     OTP INPUT CHANGE
  ===================================== */

  const handleChange = (
    index,
    value
  ) => {
    const digits =
      String(value)
        .replace(/\D/g, "");

    if (!digits) {
      setOtp(
        (previous) => {
          const nextOtp = [
            ...previous,
          ];

          nextOtp[index] = "";

          return nextOtp;
        }
      );

      setError("");
      setMessage("");

      return;
    }

    if (
      digits.length > 1
    ) {
      const availableDigits =
        digits.slice(
          0,
          OTP_LENGTH - index
        );

      setOtp(
        (previous) => {
          const nextOtp = [
            ...previous,
          ];

          availableDigits
            .split("")
            .forEach(
              (
                digit,
                offset
              ) => {
                nextOtp[
                  index + offset
                ] = digit;
              }
            );

          return nextOtp;
        }
      );

      const nextFocusIndex =
        Math.min(
          index +
          availableDigits.length,
          OTP_LENGTH - 1
        );

      inputRefs.current[
        nextFocusIndex
      ]?.focus();

      setError("");
      setMessage("");

      return;
    }

    setOtp(
      (previous) => {
        const nextOtp = [
          ...previous,
        ];

        nextOtp[index] =
          digits.slice(-1);

        return nextOtp;
      }
    );

    setError("");
    setMessage("");

    if (
      index <
      OTP_LENGTH - 1
    ) {
      inputRefs.current[
        index + 1
      ]?.focus();
    }
  };

  /* =====================================
     KEYBOARD NAVIGATION
  ===================================== */

  const handleKeyDown = (
    index,
    event
  ) => {
    if (
      event.key ===
      "Backspace"
    ) {
      if (otp[index]) {
        setOtp(
          (previous) => {
            const nextOtp = [
              ...previous,
            ];

            nextOtp[index] = "";

            return nextOtp;
          }
        );

        return;
      }

      if (index > 0) {
        event.preventDefault();

        inputRefs.current[
          index - 1
        ]?.focus();

        setOtp(
          (previous) => {
            const nextOtp = [
              ...previous,
            ];

            nextOtp[
              index - 1
            ] = "";

            return nextOtp;
          }
        );
      }

      return;
    }

    if (
      event.key ===
      "ArrowLeft" &&
      index > 0
    ) {
      event.preventDefault();

      inputRefs.current[
        index - 1
      ]?.focus();

      return;
    }

    if (
      event.key ===
      "ArrowRight" &&
      index <
      OTP_LENGTH - 1
    ) {
      event.preventDefault();

      inputRefs.current[
        index + 1
      ]?.focus();

      return;
    }

    if (
      event.key ===
      "Home"
    ) {
      event.preventDefault();

      inputRefs.current[0]
        ?.focus();

      return;
    }

    if (
      event.key ===
      "End"
    ) {
      event.preventDefault();

      inputRefs.current[
        OTP_LENGTH - 1
      ]?.focus();
    }
  };

  /* =====================================
     OTP PASTE SUPPORT
  ===================================== */

  const handlePaste = (
    event
  ) => {
    event.preventDefault();

    const pastedValue =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(
          0,
          OTP_LENGTH
        );

    if (!pastedValue) {
      return;
    }

    const nextOtp =
      createEmptyOtp();

    pastedValue
      .split("")
      .forEach(
        (
          digit,
          index
        ) => {
          nextOtp[index] =
            digit;
        }
      );

    setOtp(nextOtp);
    setError("");
    setMessage("");

    const nextFocusIndex =
      Math.min(
        pastedValue.length,
        OTP_LENGTH - 1
      );

    inputRefs.current[
      nextFocusIndex
    ]?.focus();
  };

  /* =====================================
     VERIFY OTP
  ===================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        loading ||
        submitTriggeredRef.current
      ) {
        return;
      }

      if (!email) {
        setError(
          "Your verification session is missing. Please register again."
        );

        return;
      }

      if (!otpComplete) {
        setError(
          "Enter the complete 6-digit verification code."
        );

        const firstEmptyIndex =
          otp.findIndex(
            (digit) => !digit
          );

        inputRefs.current[
          firstEmptyIndex >= 0
            ? firstEmptyIndex
            : 0
        ]?.focus();

        return;
      }

      try {
        submitTriggeredRef.current =
          true;

        setLoading(true);
        setError("");
        setMessage("");

        const response =
          await verifyOtp({
            email,
            otp: otpCode,
          });

        if (
          !response?.token ||
          !response?.user
        ) {
          throw new Error(
            "Invalid verification response"
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
            "OTP STORAGE ERROR:",
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
      } catch (
      verifyError
      ) {
        console.error(
          "VERIFY OTP ERROR:",
          verifyError
            ?.response?.data ||
          verifyError?.message
        );

        const status =
          verifyError
            ?.response?.status;

        if (
          !navigator.onLine
        ) {
          setError(
            "You appear to be offline. Check your internet connection."
          );
        } else if (
          status === 400 ||
          status === 401
        ) {
          setError(
            verifyError
              ?.response?.data
              ?.message ||
            "The verification code is invalid or has expired."
          );
        } else if (
          status === 429
        ) {
          setError(
            "Too many verification attempts. Please wait and try again."
          );
        } else {
          setError(
            verifyError
              ?.response?.data
              ?.message ||
            verifyError?.message ||
            "Unable to verify the code."
          );
        }

        setOtp(
          createEmptyOtp()
        );

        window.setTimeout(
          () => {
            inputRefs.current[0]
              ?.focus();
          },
          50
        );
      } finally {
        setLoading(false);

        submitTriggeredRef.current =
          false;
      }
    };

  /* =====================================
     RESEND OTP
  ===================================== */

  const handleResend =
    async () => {
      if (
        !email ||
        countdown > 0 ||
        resending ||
        loading
      ) {
        return;
      }

      try {
        setResending(true);
        setError("");
        setMessage("");

        const response =
          await resendOtp({
            email,
          });

        setOtp(
          createEmptyOtp()
        );

        setCountdown(
          getSafeCountdown(
            response?.cooldown
          )
        );

        setMessage(
          response?.message ||
          "A new verification code has been sent."
        );

        window.setTimeout(
          () => {
            inputRefs.current[0]
              ?.focus();
          },
          50
        );
      } catch (
      resendError
      ) {
        console.error(
          "RESEND OTP ERROR:",
          resendError
            ?.response?.data ||
          resendError?.message
        );

        const retryAfter =
          resendError
            ?.response?.data
            ?.retryAfter;

        if (retryAfter) {
          setCountdown(
            getSafeCountdown(
              retryAfter
            )
          );
        }

        if (
          !navigator.onLine
        ) {
          setError(
            "You appear to be offline. Check your internet connection."
          );
        } else {
          setError(
            resendError
              ?.response?.data
              ?.message ||
            "Unable to resend the verification code."
          );
        }
      } finally {
        setResending(false);
      }
    };

  return (
    <AuthLayout>
      <main
        className={
          styles.container
        }
        aria-labelledby="otp-title"
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

            Secure verification
          </span>
        </div>

        <div
          className={
            styles.iconWrapper
          }
          aria-hidden="true"
        >
          <MailCheck
            size={27}
          />
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
            One last step
          </span>

          <h1 id="otp-title">
            Check your email
          </h1>

          <p>
            Enter the 6-digit
            verification code sent to
            your email address.
          </p>

          {email && (
            <span
              className={
                styles.email
              }
              title={email}
            >
              {maskedEmail}
            </span>
          )}
        </header>

        <form
          className={
            styles.form
          }
          onSubmit={
            handleSubmit
          }
          noValidate
        >
          <fieldset
            className={
              styles.otpFieldset
            }
            disabled={busy}
          >
            <legend
              className={
                styles.visuallyHidden
              }
            >
              Verification code
            </legend>

            <div
              className={
                styles.otpBoxes
              }
              onPaste={
                handlePaste
              }
            >
              {otp.map(
                (
                  digit,
                  index
                ) => (
                  <input
                    key={index}
                    ref={(
                      element
                    ) => {
                      inputRefs.current[
                        index
                      ] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={
                      index === 0
                        ? "one-time-code"
                        : "off"
                    }
                    enterKeyHint={
                      index ===
                        OTP_LENGTH - 1
                        ? "done"
                        : "next"
                    }
                    maxLength={1}
                    value={digit}
                    aria-label={`Verification code digit ${index + 1
                      } of ${OTP_LENGTH}`}
                    aria-invalid={
                      Boolean(error)
                    }
                    onChange={(
                      event
                    ) =>
                      handleChange(
                        index,
                        event.target
                          .value
                      )
                    }
                    onKeyDown={(
                      event
                    ) =>
                      handleKeyDown(
                        index,
                        event
                      )
                    }
                    onFocus={(
                      event
                    ) => {
                      event.currentTarget
                        .select();
                    }}
                  />
                )
              )}
            </div>
          </fieldset>

          <div
            className={
              styles.feedbackArea
            }
            aria-live="polite"
          >
            {error && (
              <div
                className={
                  styles.error
                }
                role="alert"
              >
                <TriangleAlert
                  size={17}
                  aria-hidden="true"
                />

                <span>
                  {error}
                </span>
              </div>
            )}

            {message && (
              <div
                className={
                  styles.success
                }
                role="status"
              >
                <CheckCircle2
                  size={17}
                  aria-hidden="true"
                />

                <span>
                  {message}
                </span>
              </div>
            )}
          </div>

          <Button
            fullWidth
            type="submit"
            disabled={
              busy ||
              !email ||
              !otpComplete
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
                ? "Verifying..."
                : "Verify Account"}
            </span>
          </Button>
        </form>

        <div
          className={
            styles.resendSection
          }
        >
          <p>
            Didn&apos;t receive the
            code?
          </p>

          <button
            type="button"
            className={
              styles.resendButton
            }
            onClick={
              handleResend
            }
            disabled={
              countdown > 0 ||
              busy ||
              !email
            }
          >
            {resending && (
              <LoaderCircle
                size={15}
                className={
                  styles.spinner
                }
                aria-hidden="true"
              />
            )}

            {resending
              ? "Sending..."
              : countdown > 0
                ? `Resend available in ${countdown}s`
                : "Resend verification code"}
          </button>

          {countdown > 0 && (
            <div
              className={
                styles.timerTrack
              }
              aria-hidden="true"
            >
              <span
                style={{
                  transform: `scaleX(${countdown /
                    DEFAULT_COUNTDOWN
                    })`,
                }}
              />
            </div>
          )}
        </div>

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

export default Otp;
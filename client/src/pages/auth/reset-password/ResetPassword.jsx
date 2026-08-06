import {
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
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";

import {
  resetPassword,
} from "../../../services/authService";

import styles from "./ResetPassword.module.css";

const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (password) =>
      password.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) =>
      /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (password) =>
      /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) =>
      /\d/.test(password),
  },
];

const maskEmail = (email) => {
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

  if (localPart.length <= 2) {
    return `${localPart[0] || "*"
      }***@${domain}`;
  }

  const hiddenLength =
    Math.min(
      Math.max(
        localPart.length - 2,
        3
      ),
      7
    );

  return `${localPart.slice(
    0,
    2
  )}${"*".repeat(
    hiddenLength
  )}@${domain}`;
};

const ResetPassword = () => {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const submitLockRef =
    useRef(false);

  const email =
    String(
      location.state?.email ||
      ""
    )
      .trim()
      .toLowerCase();

  const resetToken =
    String(
      location.state?.resetToken ||
      ""
    );

  const [
    formData,
    setFormData,
  ] = useState({
    password: "",
    confirmPassword: "",
  });

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const hasResetSession =
    Boolean(
      email &&
      resetToken
    );

  const maskedEmail =
    useMemo(
      () => maskEmail(email),
      [email]
    );

  const passwordRuleResults =
    useMemo(
      () =>
        PASSWORD_RULES.map(
          (rule) => ({
            ...rule,
            passed:
              rule.test(
                formData.password
              ),
          })
        ),
      [formData.password]
    );

  const passedRuleCount =
    passwordRuleResults.filter(
      (rule) => rule.passed
    ).length;

  const passwordStrength =
    passedRuleCount === 4
      ? "strong"
      : passedRuleCount >= 2
        ? "medium"
        : "weak";

  const passwordsMatch =
    Boolean(
      formData.confirmPassword
    ) &&
    formData.password ===
    formData.confirmPassword;

  const formReady =
    hasResetSession &&
    passedRuleCount === 4 &&
    passwordsMatch;

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setError("");
  };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        loading ||
        submitLockRef.current
      ) {
        return;
      }

      const {
        password,
        confirmPassword,
      } = formData;

      if (!hasResetSession) {
        setError(
          "Your password reset session is missing or expired. Please start again."
        );

        return;
      }

      if (
        !password ||
        !confirmPassword
      ) {
        setError(
          "Enter and confirm your new password."
        );

        return;
      }

      const failedRule =
        passwordRuleResults.find(
          (rule) =>
            !rule.passed
        );

      if (failedRule) {
        setError(
          failedRule.label
        );

        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setError(
          "Passwords do not match."
        );

        return;
      }

      try {
        submitLockRef.current =
          true;

        setLoading(true);
        setError("");

        const response =
          await resetPassword({
            email,
            resetToken,
            password,
          });

        if (!response?.success) {
          throw new Error(
            response?.message ||
            "Unable to reset password"
          );
        }

        navigate(
          "/",
          {
            replace: true,

            state: {
              passwordResetSuccess:
                true,

              message:
                response?.message ||
                "Password reset successfully. Please sign in.",
            },
          }
        );
      } catch (
      resetError
      ) {
        console.error(
          "RESET PASSWORD ERROR:",
          resetError
            ?.response?.data ||
          resetError?.message
        );

        const status =
          resetError
            ?.response?.status;

        if (
          !navigator.onLine
        ) {
          setError(
            "You appear to be offline. Check your internet connection."
          );
        } else if (
          status === 400 ||
          status === 401 ||
          status === 403
        ) {
          setError(
            resetError
              ?.response?.data
              ?.message ||
            "Your reset session is invalid or has expired. Please start again."
          );
        } else if (
          status === 429
        ) {
          setError(
            "Too many reset attempts. Please wait and try again."
          );
        } else if (
          resetError?.code ===
          "ECONNABORTED"
        ) {
          setError(
            "The server took too long to respond. Please try again."
          );
        } else {
          setError(
            resetError
              ?.response?.data
              ?.message ||
            resetError?.message ||
            "Unable to reset your password."
          );
        }
      } finally {
        setLoading(false);

        submitLockRef.current =
          false;
      }
    };

  return (
    <AuthLayout>
      <main
        className={
          styles.container
        }
        aria-labelledby="reset-password-title"
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

            Secure password reset
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
            Final recovery step
          </span>

          <h1
            id="reset-password-title"
          >
            Create a new password
          </h1>

          <p>
            Choose a strong password
            that you have not used
            before for your PingMe
            account.
          </p>

          {email && (
            <span
              className={
                styles.email
              }
              title={email}
            >
              <Mail
                size={14}
                aria-hidden="true"
              />

              {maskedEmail}
            </span>
          )}
        </header>

        {!hasResetSession && (
          <div
            className={
              styles.sessionError
            }
            role="alert"
          >
            <AlertCircle
              size={18}
              aria-hidden="true"
            />

            <div>
              <strong>
                Reset session expired
              </strong>

              <span>
                Start the password
                recovery process again
                to receive a new reset
                code.
              </span>
            </div>
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
              styles.passwordField
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
              label="New Password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              name="password"
              value={
                formData.password
              }
              onChange={
                handleChange
              }
              placeholder="Create a strong password"
              autoComplete="new-password"
              disabled={
                loading ||
                !hasResetSession
              }
            />

            <button
              type="button"
              className={
                styles.visibilityButton
              }
              onClick={() =>
                setShowPassword(
                  (previous) =>
                    !previous
                )
              }
              disabled={
                loading ||
                !hasResetSession
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff
                  size={18}
                  aria-hidden="true"
                />
              ) : (
                <Eye
                  size={18}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {formData.password && (
            <section
              className={
                styles.passwordPanel
              }
              aria-label="Password strength"
            >
              <div
                className={
                  styles.strengthHeader
                }
              >
                <span>
                  Password strength
                </span>

                <strong
                  data-strength={
                    passwordStrength
                  }
                >
                  {passwordStrength}
                </strong>
              </div>

              <div
                className={
                  styles.strengthBars
                }
                data-strength={
                  passwordStrength
                }
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
              </div>

              <div
                className={
                  styles.requirements
                }
              >
                {passwordRuleResults.map(
                  (rule) => (
                    <span
                      key={rule.id}
                      className={
                        rule.passed
                          ? styles.rulePassed
                          : ""
                      }
                    >
                      <Check
                        size={14}
                        aria-hidden="true"
                      />

                      {rule.label}
                    </span>
                  )
                )}
              </div>
            </section>
          )}

          <div
            className={
              styles.passwordField
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
              label="Confirm New Password"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              name="confirmPassword"
              value={
                formData.confirmPassword
              }
              onChange={
                handleChange
              }
              placeholder="Enter your new password again"
              autoComplete="new-password"
              disabled={
                loading ||
                !hasResetSession
              }
            />

            <button
              type="button"
              className={
                styles.visibilityButton
              }
              onClick={() =>
                setShowConfirmPassword(
                  (previous) =>
                    !previous
                )
              }
              disabled={
                loading ||
                !hasResetSession
              }
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff
                  size={18}
                  aria-hidden="true"
                />
              ) : (
                <Eye
                  size={18}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {formData
            .confirmPassword && (
              <p
                className={
                  passwordsMatch
                    ? styles.passwordMatch
                    : styles.passwordMismatch
                }
                role={
                  passwordsMatch
                    ? "status"
                    : "alert"
                }
              >
                {passwordsMatch
                  ? "Passwords match"
                  : "Passwords do not match"}
              </p>
            )}

          {error &&
            hasResetSession && (
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
                ? "Resetting password..."
                : "Reset Password"}
            </span>
          </Button>
        </form>

        <footer
          className={
            styles.footer
          }
        >
          <Link to="/forgot-password">
            <ArrowLeft
              size={15}
              aria-hidden="true"
            />

            Start recovery again
          </Link>
        </footer>
      </main>
    </AuthLayout>
  );
};

export default ResetPassword;
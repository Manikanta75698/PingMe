import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  AtSign,
  Check,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";
import GoogleLoginButton from "../../../components/auth/GoogleLoginButton";

import {
  useToastContext,
} from "../../../components/ui/toast/ToastProvider";

import {
  checkUsernameAvailability,
  registerUser,
} from "../../../services/authService";

import styles from "./Register.module.css";

const NAME_MAX_LENGTH = 50;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_DEBOUNCE_MS = 650;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const getUsernameAvailability = (
  response
) =>
  response?.available ??
  response?.data?.available ??
  response?.data?.data
    ?.available ??
  false;

const getUsernameMessage = (
  response,
  available
) =>
  response?.message ||
  response?.data?.message ||
  response?.data?.data
    ?.message ||
  (
    available
      ? "Username is available"
      : "Username is already taken"
  );

const Register = () => {
  const navigate =
    useNavigate();

  const toast =
    useToastContext();

  const usernameRequestRef =
    useRef(0);

  const lastCheckedUsernameRef =
    useRef("");

  const [
    formData,
    setFormData,
  ] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    usernameStatus,
    setUsernameStatus,
  ] = useState({
    checking: false,
    available: null,
    message: "",
  });

  const cleanName =
    formData.name.trim();

  const cleanUsername =
    formData.username
      .trim()
      .toLowerCase();

  const cleanEmail =
    formData.email
      .trim()
      .toLowerCase();

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

  const passedPasswordRules =
    passwordRuleResults.filter(
      (rule) => rule.passed
    ).length;

  const passwordStrength =
    passedPasswordRules === 4
      ? "strong"
      : passedPasswordRules >= 2
        ? "medium"
        : "weak";

  const passwordsMatch =
    Boolean(
      formData.confirmPassword
    ) &&
    formData.password ===
    formData.confirmPassword;

  const allFieldsCompleted =
    Boolean(
      cleanName &&
      cleanUsername &&
      cleanEmail &&
      formData.password &&
      formData.confirmPassword
    );

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

    if (
      name === "username"
    ) {
      const cleanValue =
        value
          .toLowerCase()
          .replace(
            /[^a-z0-9._]/g,
            ""
          )
          .slice(
            0,
            USERNAME_MAX_LENGTH
          );

      usernameRequestRef.current += 1;

      setFormData(
        (previous) => ({
          ...previous,
          username: cleanValue,
        })
      );

      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });

      return;
    }

    if (name === "name") {
      setFormData(
        (previous) => ({
          ...previous,
          name:
            value.slice(
              0,
              NAME_MAX_LENGTH
            ),
        })
      );

      return;
    }

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  /* =====================================
     USERNAME AVAILABILITY CHECK
  ===================================== */

  useEffect(() => {
    const username =
      cleanUsername;

    usernameRequestRef.current += 1;

    const currentRequestId =
      usernameRequestRef.current;

    if (!username) {
      lastCheckedUsernameRef
        .current = "";

      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });

      return undefined;
    }

    if (
      username.length <
      USERNAME_MIN_LENGTH
    ) {
      lastCheckedUsernameRef
        .current = "";

      setUsernameStatus({
        checking: false,
        available: null,
        message:
          `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
      });

      return undefined;
    }

    if (
      !/^[a-z0-9._]+$/.test(
        username
      )
    ) {
      lastCheckedUsernameRef
        .current = "";

      setUsernameStatus({
        checking: false,
        available: false,
        message:
          "Use only letters, numbers, dots and underscores",
      });

      return undefined;
    }

    if (
      lastCheckedUsernameRef
        .current === username &&
      usernameStatus.available !==
      null
    ) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        async () => {
          setUsernameStatus(
            (previous) => ({
              ...previous,
              checking: true,
            })
          );

          try {
            const response =
              await checkUsernameAvailability(
                username
              );

            if (
              currentRequestId !==
              usernameRequestRef.current
            ) {
              return;
            }

            const available =
              Boolean(
                getUsernameAvailability(
                  response
                )
              );

            lastCheckedUsernameRef
              .current = username;

            setUsernameStatus({
              checking: false,
              available,
              message:
                getUsernameMessage(
                  response,
                  available
                ),
            });
          } catch (
          checkError
          ) {
            if (
              currentRequestId !==
              usernameRequestRef.current
            ) {
              return;
            }

            console.error(
              "USERNAME CHECK ERROR:",
              checkError
                ?.response?.data ||
              checkError?.message
            );

            lastCheckedUsernameRef
              .current = "";

            setUsernameStatus({
              checking: false,
              available: null,
              message:
                "Unable to check username right now",
            });
          }
        },
        USERNAME_DEBOUNCE_MS
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    cleanUsername,
  ]);

  /* =====================================
     REGISTER SUBMIT
  ===================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      if (!allFieldsCompleted) {
        toast.warning(
          "Please complete all fields"
        );

        return;
      }

      if (
        cleanName.length >
        NAME_MAX_LENGTH
      ) {
        toast.warning(
          `Name cannot exceed ${NAME_MAX_LENGTH} characters`
        );

        return;
      }

      if (
        cleanUsername.length <
        USERNAME_MIN_LENGTH
      ) {
        toast.warning(
          `Username must be at least ${USERNAME_MIN_LENGTH} characters`
        );

        return;
      }

      if (
        !/^[a-z0-9._]+$/.test(
          cleanUsername
        )
      ) {
        toast.warning(
          "Use only letters, numbers, dots and underscores"
        );

        return;
      }

      if (
        usernameStatus.checking
      ) {
        toast.info(
          "Please wait while we check the username"
        );

        return;
      }

      if (
        usernameStatus.available !==
        true
      ) {
        toast.warning(
          usernameStatus.message ||
          "Choose an available username"
        );

        return;
      }

      if (
        !EMAIL_PATTERN.test(
          cleanEmail
        )
      ) {
        toast.warning(
          "Enter a valid email address"
        );

        return;
      }

      const failedRule =
        passwordRuleResults.find(
          (rule) =>
            !rule.passed
        );

      if (failedRule) {
        toast.warning(
          failedRule.label
        );

        return;
      }

      if (!passwordsMatch) {
        toast.warning(
          "Passwords do not match"
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await registerUser({
            name: cleanName,
            username:
              cleanUsername,
            email: cleanEmail,
            password:
              formData.password,
          });

        if (
          response
            ?.requiresVerification
        ) {
          toast.success(
            response?.message ||
            "Verification code sent to your email"
          );

          navigate(
            "/otp",
            {
              replace: true,

              state: {
                email:
                  cleanEmail,
              },
            }
          );

          return;
        }

        toast.success(
          response?.message ||
          "Account created successfully"
        );

        navigate(
          "/",
          {
            replace: true,
          }
        );
      } catch (
      registerError
      ) {
        console.error(
          "REGISTER ERROR:",
          registerError
            ?.response?.data ||
          registerError?.message
        );

        const errorData =
          registerError
            ?.response?.data;

        const status =
          registerError
            ?.response?.status;

        if (
          errorData?.field ===
          "username"
        ) {
          lastCheckedUsernameRef
            .current =
            cleanUsername;

          setUsernameStatus({
            checking: false,
            available: false,
            message:
              errorData.message ||
              "Username is already taken",
          });
        }

        if (
          !navigator.onLine
        ) {
          toast.error(
            "You appear to be offline"
          );
        } else if (
          status === 429
        ) {
          toast.error(
            "Too many attempts. Please wait and try again."
          );
        } else {
          toast.error(
            errorData?.message ||
            registerError?.message ||
            "Unable to create account"
          );
        }
      } finally {
        setLoading(false);
      }
    };

  const usernameMessageClass =
    usernameStatus.checking
      ? styles.usernameChecking
      : usernameStatus.available ===
        true
        ? styles.usernameAvailable
        : usernameStatus.available ===
          false
          ? styles.usernameTaken
          : styles.usernameNeutral;

  const submitDisabled =
    loading ||
    !allFieldsCompleted ||
    usernameStatus.checking ||
    usernameStatus.available !==
    true ||
    !passwordsMatch ||
    passedPasswordRules !== 4;

  return (
    <AuthLayout>
      <main
        className={
          styles.container
        }
        aria-labelledby="register-title"
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

            Secure registration
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
            Join PingMe
          </span>

          <h1
            id="register-title"
          >
            Create your account
          </h1>

          <p>
            Build your profile,
            discover people and start
            meaningful conversations.
          </p>
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
              <UserRound
                size={17}
              />
            </span>

            <Input
              label="Full Name"
              name="name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              placeholder="Enter your full name"
              autoComplete="name"
              maxLength={
                NAME_MAX_LENGTH
              }
              disabled={loading}
            />
          </div>

          <div
            className={
              styles.usernameField
            }
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
                <AtSign
                  size={17}
                />
              </span>

              <Input
                label="Username"
                name="username"
                value={
                  formData.username
                }
                onChange={
                  handleChange
                }
                placeholder="Choose a username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={
                  USERNAME_MAX_LENGTH
                }
                disabled={loading}
              />

              <span
                className={
                  styles.usernameStatusIcon
                }
                aria-hidden="true"
              >
                {usernameStatus
                  .checking && (
                    <LoaderCircle
                      size={17}
                      className={
                        styles.spinner
                      }
                    />
                  )}

                {!usernameStatus
                  .checking &&
                  usernameStatus
                    .available ===
                  true && (
                    <Check
                      size={18}
                    />
                  )}

                {!usernameStatus
                  .checking &&
                  usernameStatus
                    .available ===
                  false && (
                    <CircleAlert
                      size={17}
                    />
                  )}
              </span>
            </div>

            <p
              className={`${styles.usernameMessage} ${usernameMessageClass}`}
              role={
                usernameStatus
                  .available ===
                  false
                  ? "alert"
                  : "status"
              }
              aria-live="polite"
            >
              {usernameStatus
                .checking
                ? "Checking username..."
                : usernameStatus
                  .message ||
                "\u00A0"}
            </p>
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
              <Mail size={17} />
            </span>

            <Input
              label="Email Address"
              name="email"
              type="email"
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
              name="password"
              type="password"
              value={
                formData.password
              }
              onChange={
                handleChange
              }
              placeholder="Create a strong password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {formData.password && (
            <div
              className={
                styles.passwordPanel
              }
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
                  styles.passwordRules
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
                        size={13}
                        aria-hidden="true"
                      />

                      {rule.label}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

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
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={
                formData.confirmPassword
              }
              onChange={
                handleChange
              }
              placeholder="Enter your password again"
              autoComplete="new-password"
              disabled={loading}
            />
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

          <p
            className={
              styles.terms
            }
          >
            By creating an account,
            you agree to PingMe&apos;s
            terms and privacy policy.
          </p>

          <Button
            fullWidth
            type="submit"
            disabled={
              submitDisabled
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
                ? "Creating account..."
                : usernameStatus
                  .checking
                  ? "Checking username..."
                  : "Create Account"}
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
          Already have an account?

          <Link to="/">
            Sign in
          </Link>
        </p>
      </main>
    </AuthLayout>
  );
};

export default Register;
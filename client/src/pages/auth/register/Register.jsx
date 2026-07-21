import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  Link,
} from "react-router-dom";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";

import GoogleLoginButton from "../../../components/auth/GoogleLoginButton";

import {
  useToastContext,
} from "../../../components/ui/toast/ToastProvider";

import {
  registerUser,
  checkUsernameAvailability,
} from "../../../services/authService";

import styles from "./Register.module.css";

const Register = () => {
  const navigate =
    useNavigate();

  const toast =
    useToastContext();

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

  // =========================
  // HANDLE INPUT CHANGE
  // =========================

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

    if (
      name === "username"
    ) {
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });
    }
  };

  // =========================
  // LIVE USERNAME CHECK
  // 500ms DEBOUNCE
  // =========================

  useEffect(() => {
    const username =
      formData.username
        .trim()
        .toLowerCase();

    if (!username) {
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });

      return undefined;
    }

    setUsernameStatus({
      checking: true,
      available: null,
      message:
        "Checking username...",
    });

    let cancelled = false;

    const timer =
      window.setTimeout(
        async () => {
          try {
            const response =
              await checkUsernameAvailability(
                username
              );

            if (cancelled) {
              return;
            }

            setUsernameStatus({
              checking: false,

              available:
                response?.available ===
                true,

              message:
                response?.message ||
                "Unable to check username",
            });
          } catch (error) {
            if (cancelled) {
              return;
            }

            console.error(
              "USERNAME CHECK ERROR:",
              error.response?.data ||
              error.message
            );

            setUsernameStatus({
              checking: false,
              available: null,
              message:
                "Unable to check username right now",
            });
          }
        },
        500
      );

    return () => {
      cancelled = true;

      window.clearTimeout(
        timer
      );
    };
  }, [formData.username]);

  // =========================
  // REGISTER
  // =========================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

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

      if (
        !cleanName ||
        !cleanUsername ||
        !cleanEmail ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        toast.warning(
          "Please fill in all fields"
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
          "Please choose an available username"
        );

        return;
      }

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        toast.warning(
          "Passwords do not match"
        );

        return;
      }

      if (
        formData.password.length <
        8
      ) {
        toast.warning(
          "Password must be at least 8 characters"
        );

        return;
      }

      if (
        !/[A-Z]/.test(
          formData.password
        )
      ) {
        toast.warning(
          "Password must contain at least one uppercase letter"
        );

        return;
      }

      if (
        !/[a-z]/.test(
          formData.password
        )
      ) {
        toast.warning(
          "Password must contain at least one lowercase letter"
        );

        return;
      }

      if (
        !/\d/.test(
          formData.password
        )
      ) {
        toast.warning(
          "Password must contain at least one number"
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
      } catch (error) {
        console.error(
          "REGISTER ERROR:",
          error.response?.data ||
          error.message
        );

        const errorData =
          error.response?.data;

        if (
          errorData?.field ===
          "username"
        ) {
          setUsernameStatus({
            checking: false,
            available: false,

            message:
              errorData.message ||
              "Username is already taken",
          });
        }

        toast.error(
          errorData?.message ||
          "Unable to create account"
        );
      } finally {
        setLoading(false);
      }
    };

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
            Create Account
          </h1>

          <p>
            Join Nexora and connect
            with friends
          </p>
        </div>

        <form
          className={
            styles.form
          }
          onSubmit={
            handleSubmit
          }
          noValidate
        >
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
            disabled={loading}
          />

          <div
            className={
              styles.usernameField
            }
          >
            <Input
              label="Username"
              name="username"
              value={
                formData.username
              }
              onChange={
                handleChange
              }
              placeholder="Choose username"
              autoComplete="username"
              disabled={loading}
            />

            {usernameStatus.message && (
              <p
                className={
                  usernameStatus.checking
                    ? styles.usernameChecking
                    : usernameStatus.available ===
                      true
                      ? styles.usernameAvailable
                      : usernameStatus.available ===
                        false
                        ? styles.usernameTaken
                        : styles.usernameNeutral
                }
                role={
                  usernameStatus.available ===
                    false
                    ? "alert"
                    : "status"
                }
              >
                {usernameStatus.checking
                  ? "Checking..."
                  : usernameStatus.available ===
                    true
                    ? `✓ ${usernameStatus.message}`
                    : usernameStatus.available ===
                      false
                      ? `✕ ${usernameStatus.message}`
                      : usernameStatus.message}
              </p>
            )}
          </div>

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
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
          />

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
            placeholder="Create password"
            autoComplete="new-password"
            disabled={loading}
          />

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
            placeholder="Confirm password"
            autoComplete="new-password"
            disabled={loading}
          />

          <Button
            fullWidth
            type="submit"
            disabled={
              loading ||
              usernameStatus.checking ||
              usernameStatus.available ===
              false
            }
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
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
          className={
            styles.googleLogin
          }
        >
          <GoogleLoginButton />
        </div>

        <p
          className={
            styles.footer
          }
        >
          Already have an
          account?{" "}

          <Link to="/">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;
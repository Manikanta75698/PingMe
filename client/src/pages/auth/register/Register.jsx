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

import styles from "./Register.module.css";

import {
  registerUser,
  checkUsernameAvailability,
} from "../../../services/authService";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

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
  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "username") {
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
      formData.username.trim();

    if (!username) {
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });

      return;
    }

    setUsernameStatus({
      checking: true,
      available: null,
      message: "Checking username...",
    });

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const response =
          await checkUsernameAvailability(
            username
          );

        if (cancelled) return;

        setUsernameStatus({
          checking: false,
          available:
            response?.available === true,
          message:
            response?.message ||
            "Unable to check username",
        });
      } catch (error) {
        if (cancelled) return;

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
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.username]);

  // =========================
  // REGISTER
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

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
      return alert(
        "Please fill in all fields"
      );
    }

    if (usernameStatus.checking) {
      return alert(
        "Please wait while we check the username"
      );
    }

    if (
      usernameStatus.available !== true
    ) {
      return alert(
        usernameStatus.message ||
          "Please choose an available username"
      );
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      return alert(
        "Passwords do not match"
      );
    }

    if (formData.password.length < 8) {
      return alert(
        "Password must be at least 8 characters"
      );
    }

    if (
      !/[A-Z]/.test(formData.password)
    ) {
      return alert(
        "Password must contain at least one uppercase letter"
      );
    }

    if (
      !/[a-z]/.test(formData.password)
    ) {
      return alert(
        "Password must contain at least one lowercase letter"
      );
    }

    if (!/\d/.test(formData.password)) {
      return alert(
        "Password must contain at least one number"
      );
    }

    try {
      setLoading(true);

      const response = await registerUser({
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password: formData.password,
      });

      if (
        response?.requiresVerification
      ) {
        navigate("/otp", {
          replace: true,
          state: {
            email: cleanEmail,
          },
        });

        return;
      }

      alert(
        response?.message ||
          "Account created successfully"
      );

      navigate("/");
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error.response?.data ||
          error.message
      );

      const errorData =
        error.response?.data;

      if (
        errorData?.field === "username"
      ) {
        setUsernameStatus({
          checking: false,
          available: false,
          message:
            errorData.message ||
            "Username is already taken",
        });
      }

      alert(
        errorData?.message ||
          "Register Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className={styles.container}>
        <Logo size="xl" />

        <div className={styles.heading}>
          <h1>Create Account</h1>

          <p>
            Join PingMe and connect with friends
          </p>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
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
              value={formData.username}
              onChange={handleChange}
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
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create password"
            autoComplete="new-password"
            disabled={loading}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
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

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <button
          type="button"
          className={styles.googleBtn}
        >
          Continue with Google
        </button>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link to="/">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;
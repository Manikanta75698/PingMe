import { useState } from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";

import { resetPassword } from "../../../services/authService";

import styles from "./ResetPassword.module.css";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const resetToken =
    location.state?.resetToken || "";

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const {
      password,
      confirmPassword,
    } = formData;

    if (!email || !resetToken) {
      setError(
        "Reset session missing or expired. Please start again."
      );
      return;
    }

    if (!password || !confirmPassword) {
      setError(
        "Please enter and confirm your new password."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/\d/.test(password)) {
      setError(
        "Password must contain at least one number."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await resetPassword({
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

      navigate("/", {
        replace: true,
        state: {
          passwordResetSuccess: true,
          message:
            response?.message ||
            "Password reset successfully. Please login.",
        },
      });
    } catch (error) {
      console.error(
        "RESET PASSWORD ERROR:",
        error.response?.data ||
        error.message
      );

      setError(
        error.response?.data?.message ||
        error.message ||
        "Unable to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  const hasResetSession =
    Boolean(email && resetToken);

  return (
    <AuthLayout>
      <div className={styles.container}>
        <Logo size="xl" />

        <div className={styles.heading}>
          <h1>Create New Password</h1>

          <p>
            Choose a strong password for your
            PingMe account.
          </p>

          {email && (
            <span className={styles.email}>
              {email}
            </span>
          )}
        </div>

        {!hasResetSession && (
          <p className={styles.error}>
            Reset session missing or expired.
            Please start the password reset
            process again.
          </p>
        )}

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <Input
            label="New Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter new password"
            autoComplete="new-password"
            disabled={
              loading || !hasResetSession
            }
          />

          <Input
            label="Confirm New Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm new password"
            autoComplete="new-password"
            disabled={
              loading || !hasResetSession
            }
          />

          <div className={styles.requirements}>
            <p>Password must contain:</p>

            <span>
              {formData.password.length >= 8
                ? "✓"
                : "•"}{" "}
              At least 8 characters
            </span>

            <span>
              {/[A-Z]/.test(formData.password)
                ? "✓"
                : "•"}{" "}
              One uppercase letter
            </span>

            <span>
              {/[a-z]/.test(formData.password)
                ? "✓"
                : "•"}{" "}
              One lowercase letter
            </span>
            <span>
              {/\d/.test(formData.password)
                ? "✓"
                : "•"}{" "}
              One number
            </span>
          </div>

          {error && hasResetSession && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          <Button
            fullWidth
            type="submit"
            disabled={
              loading || !hasResetSession
            }
          >
            {loading
              ? "Resetting..."
              : "Reset Password"}
          </Button>
        </form>

        <p className={styles.footer}>
          <Link to="/forgot-password">
            Start Again
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;
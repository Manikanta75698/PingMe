import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";

import styles from "./ForgotPassword.module.css";

import { forgotPassword } from "../../../services/authService";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await forgotPassword({
        email: cleanEmail,
      });

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to process request"
        );
      }

      navigate("/reset-otp", {
        replace: true,
        state: {
          email: cleanEmail,
          cooldown: response?.cooldown || 60,
        },
      });
    } catch (error) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        error.response?.data || error.message
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to send reset code"
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
          <h1>Forgot Password?</h1>

          <p>
            Enter your email to receive a secure
            password reset code.
          </p>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
          />

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          <Button
            fullWidth
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Sending..."
              : "Send Reset Code"}
          </Button>
        </form>

        <p className={styles.footer}>
          <Link to="/">
            Back to Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
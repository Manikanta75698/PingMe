import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";

import AuthLayout from "../../../layouts/auth-layout";
import Logo from "../../../components/ui/logo";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";
import GoogleLoginButton from "../../../components/auth/GoogleLoginButton";

import styles from "./Login.module.css";

import { loginUser } from "../../../services/authService";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent repeated submit
    if (loading) return;

    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!email || !password) {
      return alert("Please enter email and password");
    }

    try {
      setLoading(true);

      const response = await loginUser({
        email,
        password,
      });

      if (!response?.token || !response?.user) {
        throw new Error("Invalid login response");
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
        "LOGIN ERROR:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          error.message ||
          "Login Failed"
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
          <h1>Welcome Back 👋</h1>
          <p>Sign in to continue to PingMe</p>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
          />

          <div className={styles.forgot}>
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          <Button
            fullWidth
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Login"}
          </Button>
        </form>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <div className={styles.googleLogin}>
          <GoogleLoginButton />
        </div>

        <p className={styles.footer}>
          Don't have an account?{" "}
          <Link to="/register">
            Create Account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
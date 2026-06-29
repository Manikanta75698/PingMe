import "./Login.css";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { GoogleLogin } from "@react-oauth/google";

import {
  FaEye,
  FaEyeSlash,
  FaEnvelope,
  FaLock,
  FaComments
} from "react-icons/fa";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {

    const token = localStorage.getItem("token");

    if (token) {
      navigate("/home");
    }

  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const res = await axios.post(
        "https://pingme-api-new.onrender.com/api/auth/login",
        {
          email,
          password,
        }
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      toast.success(res.data.message);

      navigate("/home");

    } catch (error) {
      console.log("LOGIN ERROR:", error);
      console.log("RESPONSE:", error.response);
      console.log("DATA:", error.response?.data);
      console.log("MESSAGE:", error.response?.data?.message);

      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Login failed"
      );
    }
    finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {

      const res = await axios.post(
        "https://pingme-api-new.onrender.com/api/auth/google",
        {
          credential: credentialResponse.credential,
        }
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      toast.success("Welcome to PingMe 🚀");

      navigate("/home");

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
        "Google Login Failed"
      );

    }
  };

  return (
    <div className="login-page">

      <div className="bg-circle circle1"></div>
      <div className="bg-circle circle2"></div>
      <div className="bg-circle circle3"></div>

      <div className="login-wrapper">

        <div className="login-left">

          <div className="brand-icon">
            <FaComments />
          </div>

          <h1>PingMe</h1>

          <p>
            Connect.
            Chat.
            Share.
            Build memories with your friends
            on PingMe.
          </p>

        </div>

        <div className="login-card">

          <h2>Welcome Back 👋</h2>

          <p className="login-subtitle">
            Sign in to continue
          </p>

          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() =>
              toast.error("Google Login Failed")
            }
            theme="outline"
            shape="pill"
            size="large"
            width="100%"
            text="continue_with"
          />

          <div className="divider">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          <form onSubmit={handleLogin}>

            <div className="input-group">

              <label>Email</label>

              <div className="input-box">

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

              </div>

            </div>

            <div className="input-group">

              <label>Password</label>

              <div className="input-box">

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <span
                  className="eye-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>

              </div>

            </div>

            <Link
              className="forgot-link"
              to="/forgot-password"
            >
              Forgot Password?
            </Link>

            <button
              className="signin-btn"
              disabled={loading}
            >
              {
                loading
                  ? "Signing In..."
                  : "Sign In"
              }
            </button>

          </form>

          <p className="signup-text">

            Don't have an account?

            <Link to="/register">
              Sign Up
            </Link>

          </p>

        </div>

      </div>

    </div>
  );
}
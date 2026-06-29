import "./Register.css";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import toast from "react-hot-toast";
import { GoogleLogin } from "@react-oauth/google";

export default function Register() {
  const navigate = useNavigate();
  useEffect(() => {

    const token = localStorage.getItem("token");

    if (token) {
      navigate("/home");
    }

  }, [navigate]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const res = await axios.post(
        "https://pingme-api-new.onrender.com/api/auth/register",
        {
          name,
          email,
          password,
        }
      );

      toast.success(res.data.message);

      navigate("/verify-otp", {
        state: {
          email,
        },
      });

      setName("");
      setEmail("");
      setPassword("");

    } catch (error) {
      console.log("FULL ERROR:", error);
      console.log("RESPONSE:", error.response);

      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async (
    credentialResponse
  ) => {
    try {

      const res = await axios.post(
        "https://pingme-api-new.onrender.com/api/auth/google",
        {
          credential:
            credentialResponse.credential,
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

      toast.success(
        `Welcome ${res.data.user.name} 👋`
      );

      navigate("/home");

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
        "Google Register Failed"
      );

    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-logo">
          💬
        </div>
        <h1 className="register-title">
          Create your account
        </h1>

        <p className="register-subtitle">
          Join PingMe and start connecting
          with friends around the world.
        </p>

        <div className="google-login">

          <GoogleLogin
            onSuccess={handleGoogleRegister}
            onError={() =>
              toast.error("Google Register Failed")
            }
            theme="outline"
            size="large"
            width="100%"
            text="continue_with"
            shape="pill"
          />

        </div>

        <div className="divider">
          <span></span>
          <p>OR CONTINUE WITH EMAIL</p>
          <span></span>
        </div>

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Full Name</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>

          <div className="input-group">

            <label>Password</label>

            <div className="password-container">

              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <span
                className="eye-icon"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>

            </div>

            <div className="password-strength">
              {
                password.length === 0
                  ? ""
                  : password.length < 8
                    ? "🔴 Weak Password"
                    : password.length < 12
                      ? "🟡 Medium Password"
                      : "🟢 Strong Password"
              }
            </div>

          </div>

          <button
            type="submit"
            className="signup-btn"
            disabled={loading}
          >
            {
              loading
                ? "Creating your account..."
                : "Create Account"
            }
          </button>

        </form>

        <p className="security-text">
          🔒 Protected by PingMe Secure Authentication
        </p>

        <p className="login-text">
          Already have an account?
          <Link to="/"> Sign In</Link>
        </p>
      </div>
    </div>
  );
}
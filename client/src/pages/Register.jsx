import "./Register.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import toast from "react-hot-toast";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="register-page">
      <div className="register-card">
        <h1 className="register-title">
          Create Account
        </h1>

        <p className="register-subtitle">
          Join PingMe and start chatting
        </p>

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="password-container">

              <input
                type={showPassword ? "text" : "password"}
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
          </div>

          <button
            type="submit"
            className="signup-btn"
            disabled={loading}
          >
            {
              loading
                ? "Creating Account..."
                : "Create Account"
            }
          </button>
        </form>

        <p className="login-text">
          Already have an account?
          <Link to="/"> Sign In</Link>
        </p>
      </div>
    </div>
  );
}
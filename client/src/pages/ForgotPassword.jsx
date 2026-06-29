import "./ForgotPassword.css";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const res = await axios.post(
        "https://pingme-api-new.onrender.com/api/auth/forgot-password",
        { email }
      );

      toast.success(res.data.message);

      navigate("/reset-password", {
        state: {
          email,
        },
      });

      // Next step lo OTP page ki navigate chestham
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <div className="forgot-logo">
          🔒
        </div>
        <h1>Forgot Password</h1>

        <p>
          Enter your registered email address.
          We'll send you an OTP to reset your password.
        </p>

        <form onSubmit={handleSendOTP}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Sending OTP..."
              : "Send OTP"}
          </button>
        </form>

        <p className="security-text">
          🔒 Protected by PingMe Secure Authentication
        </p>

        <Link to="/">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}
import "./ResetPassword.css";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState(
    Array(6).fill("")
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  const handleOtpChange = (value, index) => {

    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];

    newOtp[index] = value;

    setOtp(newOtp);

    if (value && index < 5) {
      document
        .getElementById(`otp-${index + 1}`)
        ?.focus();
    }

  };

  const handleKeyDown = (e, index) => {

    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      document
        .getElementById(`otp-${index - 1}`)
        ?.focus();
    }

  };

  const handlePaste = (e) => {

    e.preventDefault();

    const paste = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    const newOtp = [...otp];

    paste.split("").forEach((num, i) => {
      newOtp[i] = num;
    });

    setOtp(newOtp);

  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (password !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);

    try {
      const res = await axios.post(
        "https://pingme-api-new.onrender.com/api/auth/reset-password",
        {
          email,
          otp,
          password,
        }
      );

      toast.success(res.data.message);

      navigate("/");

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
        "Reset failed"
      );

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="reset-page">

      <div className="reset-card">

        <div className="reset-logo">
          🔐
        </div>

        <h1>Reset Password </h1>

        <p>
          Enter the 6-digit verification code sent to your email
          and create a strong new password.
        </p>

        <form onSubmit={handleResetPassword}>
          <div
            className="otp-container"
            onPaste={handlePaste}
          >

            {otp.map((digit, index) => (

              <input
                key={index}
                id={`otp-${index}`}
                className="otp-box"
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) =>
                  handleOtpChange(
                    e.target.value,
                    index
                  )
                }
                onKeyDown={(e) =>
                  handleKeyDown(
                    e,
                    index
                  )
                }
              />

            ))}

          </div>

          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(
                e.target.value
              )
            }
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {
              loading
                ? "Updating..."
                : "Update Password"
            }
          </button>

        </form>

        <p className="security-text">
          🔒 Protected by PingMe Secure Authentication
        </p>

        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/")}
        >
          ← Back to Login
        </button>
      </div>

    </div>
  );
}
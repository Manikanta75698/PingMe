import "./VerifyOTP.css";
import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!otp) {
      toast.error("Please enter OTP");
      return;
    }

    try {
      const response = await axios.post(
        "https://pingme-api-new.onrender.com/api/auth/verify-otp",
        {
          email,
          otp,
        }
      );

      toast.success(response.data.message);
      navigate("/");

    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Verification failed"
      );
    }
  };

  return (
    <div className="verify-page">
      <div className="verify-card">

        <div className="verify-icon">
          🔐
        </div>

        <h2 className="verify-title">
          Verify Your Email
        </h2>

        <p className="verify-text">
          Enter the 6-digit OTP sent to your email
        </p>

        <form onSubmit={handleVerify}>

          <input
            className="otp-input"
            type="text"
            placeholder="------"
            value={otp}
            maxLength="6"
            autoComplete="one-time-code"
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, ""))
            }
            required
          />

          <button
            className="verify-btn"
            type="submit"
          >
            Verify OTP
          </button>

        </form>

      </div>
    </div>
  );
};

export default VerifyOTP;
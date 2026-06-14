import "./VerifyOTP.css";
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  useEffect(() => {

    if (!email) {

      toast.error("Please register first");

      navigate("/register");

    }

  }, [email, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!otp) {
      toast.error("Please enter OTP");
      return;
    }

    setLoading(true);

    try {

      const response = await axios.post(
        "YOUR_API",
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

    } finally {

      setLoading(false);

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
          Enter the 6-digit OTP sent to
          <br />
          <strong>{email}</strong>
        </p>

        <form onSubmit={handleVerify}>

          <input
            className="otp-input"
            type="text"
            autoFocus
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
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

        </form>

      </div>
    </div>
  );
};

export default VerifyOTP;
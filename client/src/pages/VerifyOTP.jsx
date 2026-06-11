import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!otp) {
      alert("Please enter OTP");
      return;
    }

    try {
      const response = await axios.post(
        "https://pingme-api-u477.onrender.com/api/auth/verify-otp",
        {
          email,
          otp,
        }
      );

      alert(response.data.message);

      navigate("/login");

    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Verification failed"
      );
    }
  };

  return (
    <div>
      <h2>Verify Email 🔐</h2>

      <form onSubmit={handleVerify}>
        <input
          type="text"
          placeholder="Enter 6 digit OTP"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value)
          }
        />

        <button type="submit">
          Verify OTP
        </button>
      </form>
    </div>
  );
};

export default VerifyOTP;
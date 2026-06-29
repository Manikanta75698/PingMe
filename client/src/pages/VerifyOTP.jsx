import "./VerifyOTP.css";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { FaComments } from "react-icons/fa";

export default function VerifyOTP() {

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const inputRefs = useRef([]);

  const [otp, setOtp] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);

  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {

    if (!email) {

      toast.error("Please register first");

      navigate("/register");

    }

  }, [email, navigate]);

  useEffect(() => {

    if (timer <= 0) {

      setCanResend(true);

      return;

    }

    const interval = setInterval(() => {

      setTimer((prev) => prev - 1);

    }, 1000);

    return () => clearInterval(interval);

  }, [timer]);

  const handleOtpChange = (
    value,
    index
  ) => {

    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];

    newOtp[index] = value;

    setOtp(newOtp);

    if (value && index < 5) {

      inputRefs.current[index + 1]?.focus();

    }

  };

  const handleKeyDown = (
    e,
    index
  ) => {

    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {

      inputRefs.current[index - 1]?.focus();

    }

    if (
      e.key === "ArrowLeft" &&
      index > 0
    ) {

      inputRefs.current[index - 1]?.focus();

    }

    if (
      e.key === "ArrowRight" &&
      index < 5
    ) {

      inputRefs.current[index + 1]?.focus();

    }

  };

  const handlePaste = (e) => {

    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    const newOtp = [...otp];

    pasted.split("").forEach(
      (digit, index) => {

        newOtp[index] = digit;

      }
    );

    setOtp(newOtp);

    inputRefs.current[5]?.focus();

  };

  const handleVerify = async (e) => {

    e.preventDefault();

    if (loading) return;

    const finalOtp = otp.join("");

    if (finalOtp.length !== 6) {

      toast.error("Please enter all 6 digits");

      return;

    }

    setLoading(true);

    try {

      const response = await axios.post(
        "https://pingme-api-new.onrender.com/api/auth/verify-otp",
        {
          email,
          otp: finalOtp,
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

  const handleResendOTP = async () => {

    if (!canResend) return;

    try {

      const response = await axios.post(
        "https://pingme-api-new.onrender.com/api/auth/resend-otp",
        {
          email,
        }
      );

      toast.success(response.data.message);

      setTimer(60);

      setCanResend(false);

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
        "Failed to resend OTP"
      );

    }

  };

  return (

    <div className="verify-page">

      <div className="verify-left">

        <div className="brand-logo">
          <FaComments />
        </div>

        <h1 className="brand-title">
          Ping<span>Me</span>
        </h1>

        <p className="brand-caption">
          Connect.
          Chat.
          Share.
          <br />
          Build memories with your friends.
        </p>

      </div>

      <div className="verify-right">

        <Card className="verify-card">

          <div className="verify-icon">
            🔐
          </div>

          <h2>
            Verify Your Email
          </h2>

          <p className="verify-text">

            Enter the verification code sent to

            <br />

            <span className="verify-email">
              {email}
            </span>

          </p>

          <form onSubmit={handleVerify}>

            <div
              className="otp-container"
              onPaste={handlePaste}
            >

              {otp.map((digit, index) => (

                <input

                  key={index}

                  ref={(el) =>
                    inputRefs.current[index] = el
                  }

                  className="otp-box"

                  type="text"

                  maxLength={1}

                  inputMode="numeric"

                  value={digit}

                  autoFocus={index === 0}

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

            <Button
              type="submit"
              fullWidth
              loading={loading}
            >
              {loading
                ? "Verifying..."
                : "Verify OTP"}
            </Button>

          </form>

          <div className="divider">

            <span></span>

            <p>

              Didn't receive OTP?

            </p>

            <span></span>

          </div>

          <Button
            variant="ghost"
            fullWidth
            type="button"
            onClick={handleResendOTP}
            disabled={!canResend}
          >

            {
              canResend
                ? "🔄 Resend OTP"
                : `Resend in 00:${String(timer).padStart(2, "0")}`
            }

          </Button>

          <p className="security-text">

            🔒 Protected by PingMe Secure Authentication

          </p>

        </Card>

      </div>

    </div>

  );
}
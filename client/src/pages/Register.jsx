import "./Register.css";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { GoogleLogin } from "@react-oauth/google";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";



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

      toast.error(
        error.response?.data?.message ||
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

      {/* LEFT SIDE */}

      <div className="register-left">

        <div className="brand-logo">
          💬
        </div>

        <h1 className="brand-title">
          Ping<span>Me</span>
        </h1>

        <p className="brand-caption">
          Connect. Chat. Share.
          <br />
          Build memories with your friends
          <br />
          on PingMe.
        </p>

      </div>

      {/* RIGHT SIDE */}

      <div className="register-right">

        <Card className="register-card">
          <div className="register-icon">
            👤
          </div>
          <h2 className="register-title">
            Create Account
          </h2>

          <p className="register-subtitle">
            Create your account and start chatting
            with your friends instantly.
          </p>

          <div className="google-login">

            <GoogleLogin
              onSuccess={handleGoogleRegister}
              onError={() =>
                toast.error("Google Register Failed")
              }
              theme="outline"
              size="large"
              width="360"
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

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="password-strength">
              {password.length === 0
                ? ""
                : password.length < 8
                  ? "🔴 Weak Password"
                  : password.length < 12
                    ? "🟡 Medium Password"
                    : "🟢 Strong Password"}
            </div>

            <Button
              type="submit"
              fullWidth
              loading={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

          </form>

          <p className="security-text">
            🔒 Protected by PingMe Secure Authentication
          </p>

          <p className="login-text">
            Already have an account?
            <Link to="/"> Sign In</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
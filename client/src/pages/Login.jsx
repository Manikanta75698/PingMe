import "./Login.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

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

      navigate("/chat");

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
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <h1 className="login-title">
          Welcome back
        </h1>

        <p className="login-subtitle">
          Sign in to PingMe
        </p>

        <form onSubmit={handleLogin}>

          <div className="input-group">
            <label>Email address</label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />
          </div>

          <button
            type="submit"
            className="signin-btn"
          >
            Sign In
          </button>

        </form>

        <p className="signup-text">
          Don't have an account?

          <Link to="/register">
            {" "}Sign up
          </Link>
        </p>

      </div>
    </div>
  );
}
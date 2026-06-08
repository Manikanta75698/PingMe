import "./Login.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email,
          password,
        }
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      alert(res.data.message);

      navigate("/chat");

    } catch (error) {
      alert(
        error.response?.data?.message ||
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
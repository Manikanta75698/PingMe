import "./Register.css";
import { Link } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "https://pingme-api-u477.onrender.com/api/auth/register",
        {
          name,
          email,
          password,
        }
      );

      toast.success(res.data.message);

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
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="signup-btn"
          >
            Create Account
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
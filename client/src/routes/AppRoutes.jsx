import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "../pages/auth/login";
import Register from "../pages/auth/register";
import ForgotPassword from "../pages/auth/forgot-password";
import Otp from "../pages/auth/otp";
import ResetOtp from "../pages/auth/reset-otp/ResetOtp";
import ResetPassword from "../pages/auth/reset-password";

import Home from "../pages/home/Home";
import Chat from "../pages/chat/Chat";

import Profile from "../pages/profile/Profile";
import UserProfile from "../pages/profile/UserProfile";

const AppRoutes = () => {
  return (
    <Routes>
      {/* =====================
          DEFAULT
      ====================== */}
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* =====================
          AUTH ROUTES
      ====================== */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/otp"
        element={<Otp />}
      />

      <Route
        path="/reset-otp"
        element={<ResetOtp />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* =====================
          MAIN ROUTES
      ====================== */}
      <Route
        path="/home"
        element={<Home />}
      />

      {/* =====================
          CHAT ROUTES
      ====================== */}
      <Route
        path="/chat"
        element={<Chat />}
      />

      <Route
        path="/chat/:userId"
        element={<Chat />}
      />

      {/* =====================
          OWN PROFILE
      ====================== */}
      <Route
        path="/profile"
        element={<Profile />}
      />

      {/* =====================
          OTHER USER PROFILE
      ====================== */}
      <Route
        path="/user/:username"
        element={<UserProfile />}
      />

      {/* =====================
          FALLBACK
          ALWAYS LAST
      ====================== */}
      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
};

export default AppRoutes;
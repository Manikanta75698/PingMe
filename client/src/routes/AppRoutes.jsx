import {
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { ChatProvider } from "../context/ChatContext";

import Login from "../pages/auth/login";
import Register from "../pages/auth/register";
import ForgotPassword from "../pages/auth/forgot-password";
import Otp from "../pages/auth/otp";
import ResetOtp from "../pages/auth/reset-otp/ResetOtp";
import ResetPassword from "../pages/auth/reset-password";

import Home from "../pages/home/Home";
import Settings from "../pages/settings/Settings";
import Chat from "../pages/chat/Chat";
import Search from "../components/search/Search";
import Activity from "../pages/activity/Activity";
import Profile from "../pages/profile/Profile";
import UserProfile from "../pages/profile/UserProfile";
import CreatePost from "../components/home/CreatePost";

/* =========================
   AUTH HELPERS
========================= */

const hasValidSession = (user) => {
  const token =
    localStorage.getItem("token");

  return Boolean(user && token);
};

/* =========================
   PUBLIC-ONLY ROUTES
========================= */

const PublicOnlyLayout = () => {
  const { user } = useAuth();

  if (hasValidSession(user)) {
    return (
      <Navigate
        to="/home"
        replace
      />
    );
  }

  return <Outlet />;
};

/* =========================
   PROTECTED APP ROUTES
========================= */

const ProtectedAppLayout = () => {
  const { user } = useAuth();

  if (!hasValidSession(user)) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <ChatProvider>
      <Outlet />
    </ChatProvider>
  );
};

/* =========================
   APP ROUTES
========================= */

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* DEFAULT */}
      <Route
        path="/"
        element={
          <Navigate
            to={
              hasValidSession(user)
                ? "/home"
                : "/login"
            }
            replace
          />
        }
      />

      {/* PUBLIC AUTH ROUTES */}
      <Route
        element={
          <PublicOnlyLayout />
        }
      >
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
          element={
            <ForgotPassword />
          }
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
          element={
            <ResetPassword />
          }
        />
      </Route>

      {/* AUTHENTICATED ROUTES */}
      <Route
        element={
          <ProtectedAppLayout />
        }
      >
        <Route
          path="/home"
          element={<Home />}
        />

        <Route
          path="/search"
          element={<Search />}
        />

        <Route
          path="/chat"
          element={<Chat />}
        />

        <Route
          path="/chat/:userId"
          element={<Chat />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/create"
          element={<CreatePost />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="/activity"
          element={<Activity />}
        />

        <Route
          path="/user/:username"
          element={<UserProfile />}
        />
      </Route>

      {/* FALLBACK */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              hasValidSession(user)
                ? "/home"
                : "/login"
            }
            replace
          />
        }
      />
    </Routes>
  );
};

export default AppRoutes;
import {
  lazy,
  Suspense,
} from "react";

import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { ChatProvider } from "../context/ChatContext";
import Header from "../components/home/Header";
import Loader from "../components/ui/loader/Loader";

const Login = lazy(() => import("../pages/auth/login"));
const Register = lazy(() => import("../pages/auth/register"));
const ForgotPassword = lazy(() => import("../pages/auth/forgot-password"));
const Otp = lazy(() => import("../pages/auth/otp"));
const ResetOtp = lazy(() => import("../pages/auth/reset-otp/ResetOtp"));
const ResetPassword = lazy(() => import("../pages/auth/reset-password"));

const Home = lazy(() => import("../pages/home/Home"));
const Settings = lazy(() => import("../pages/settings/Settings"));
const Chat = lazy(() => import("../pages/chat/Chat"));
const Activity = lazy(() => import("../pages/activity/Activity"));
const Profile = lazy(() => import("../pages/profile/Profile"));
const UserProfile = lazy(() => import("../pages/profile/UserProfile"));
const CreatePost = lazy(() => import("../components/home/CreatePost"));
const PostDetails = lazy(() => import("../pages/post/PostDetails"));
const Explore = lazy(() => import("../pages/explore/Explore"));

const HelpFeed = lazy(() => import("../pages/help/HelpFeed"));
const CreateHelpRequest = lazy(() => import("../pages/help/CreateHelpRequest"));
const HelpRequestDetails = lazy(() => import("../pages/help/HelpRequestDetails"));
const MyHelpHistory = lazy(() => import("../pages/help/MyHelpHistory"));
const CommunityImpact = lazy(() => import("../pages/help/CommunityImpact"));

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

  return (
    <Suspense
      fallback={
        <Loader
          fullScreen
          label="Loading page"
        />
      }
    >
      <Outlet />
    </Suspense>
  );
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
      <Header />
      <Suspense
        fallback={
          <Loader label="Loading page" />
        }
      >
        <Outlet />
      </Suspense>
    </ChatProvider>
  );
};

const UserProfileRoute = () => {
  const { username } = useParams();
  return <UserProfile key={username} />;
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
          path="/explore"
          element={<Explore />}
        />

        <Route
          path="/help"
          element={<HelpFeed />}
        />

        <Route
          path="/help/create"
          element={
            <CreateHelpRequest />
          }
        />

        <Route
          path="/help/history"
          element={<MyHelpHistory />}
        />

        <Route
          path="/help/community-impact"
          element={<CommunityImpact />}
        />

        <Route
          path="/help/:requestId"
          element={
            <HelpRequestDetails />
          }
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
          path="/post/:postId"
          element={<PostDetails />}
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
          element={<UserProfileRoute />}
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

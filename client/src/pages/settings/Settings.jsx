import { useState } from "react";

import {
  Lock,
  Bell,
  Shield,
  Palette,
  Info,
  ChevronRight,
  ArrowLeft,
  LogOut,
} from "lucide-react";


import { useNavigate } from "react-router-dom";

import SetPasswordModal from "../../components/profile/SetPasswordModal";

import ChangePasswordModal from "../../components/profile/ChangePasswordModal";

import styles from "./Settings.module.css";

const Settings = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user"))
  );

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [showChangePasswordModal, setShowChangePasswordModal] =
    useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const showSetPassword =
    user?.provider === "google" &&
    !user?.hasPassword;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </button>

          <h1>Settings</h1>
        </div>

        <div className={styles.section}>
          <h2>Account</h2>

          {!user?.hasPassword ? (
            <button
              className={styles.item}
              onClick={() => setShowPasswordModal(true)}
            >
              <div className={styles.left}>
                <Lock size={18} />
                <span>Create Password</span>
              </div>

              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className={styles.item}
              onClick={() =>
                setShowChangePasswordModal(true)
              }
            >
              <div className={styles.left}>
                <Lock size={18} />
                <span>Change Password</span>
              </div>

              <ChevronRight size={18} />
            </button>
          )}


        </div>
        <div className={styles.section}>
          <h2>Privacy</h2>

          <div className={styles.itemDisabled}>
            <div className={styles.left}>
              <Shield size={18} />
              <span>Privacy</span>
            </div>

            <small>Coming Soon</small>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Notifications</h2>

          <div className={styles.itemDisabled}>
            <div className={styles.left}>
              <Bell size={18} />
              <span>Notifications</span>
            </div>

            <small>Coming Soon</small>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Appearance</h2>

          <div className={styles.itemDisabled}>
            <div className={styles.left}>
              <Palette size={18} />
              <span>Appearance</span>
            </div>

            <small>Coming Soon</small>
          </div>
        </div>

        <div className={styles.section}>
          <h2>About</h2>

          <div className={styles.itemDisabled}>
            <div className={styles.left}>
              <Info size={18} />
              <span>About PingMe</span>
            </div>

            <small>v1.0.0</small>
          </div>
        </div>

        <div className={styles.logoutSection}>
          <button
            className={styles.logoutBtn}
            onClick={() => setShowLogoutModal(true)}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <SetPasswordModal
          onClose={() =>
            setShowPasswordModal(false)
          }
          onSuccess={() => {
            const updatedUser = {
              ...user,
              hasPassword: true,
            };

            setUser(updatedUser);

            localStorage.setItem(
              "user",
              JSON.stringify(updatedUser)
            );

            setShowPasswordModal(false);
          }}
        />
      )}

      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() =>
            setShowChangePasswordModal(false)
          }
          onSuccess={() =>
            setShowChangePasswordModal(false)
          }
        />
      )}

      {showLogoutModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.logoutModal}>

            <h2>Logout?</h2>

            <p>
              Are you sure you want to logout from
              your account?
            </p>

            <div className={styles.modalButtons}>
              <button
                className={styles.cancelBtn}
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Cancel
              </button>

              <button
                className={styles.confirmLogoutBtn}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
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
  Monitor,
  Sun,
  Moon,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import SetPasswordModal from "../../components/profile/SetPasswordModal";
import ChangePasswordModal from "../../components/profile/ChangePasswordModal";

import {
  applyTheme,
  getSavedTheme,
} from "../../utils/theme";

import styles from "./Settings.module.css";

const Settings = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user")
      ) || null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(() =>
    getSavedTheme()
  );

  const [showAppearance, setShowAppearance] =
    useState(false);

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [
    showChangePasswordModal,
    setShowChangePasswordModal,
  ] = useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  const getThemeLabel = () => {
    if (theme === "light") return "Light";
    if (theme === "dark") return "Dark";

    return "System";
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <h1>Settings</h1>
        </div>

        <div className={styles.section}>
          <h2>Account</h2>

          {user?.hasPassword ? (
            <button
              type="button"
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
          ) : (
            <button
              type="button"
              className={styles.item}
              onClick={() =>
                setShowPasswordModal(true)
              }
            >
              <div className={styles.left}>
                <Lock size={18} />
                <span>Create Password</span>
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

          <button
            type="button"
            className={styles.item}
            onClick={() =>
              setShowAppearance((previous) => !previous)
            }
            aria-expanded={showAppearance}
          >
            <div className={styles.left}>
              <Palette size={18} />
              <span>Theme</span>
            </div>

            <div className={styles.itemRight}>
              <small>{getThemeLabel()}</small>

              <ChevronRight
                size={18}
                className={
                  showAppearance
                    ? styles.chevronOpen
                    : ""
                }
              />
            </div>
          </button>

          {showAppearance && (
            <div className={styles.appearancePanel}>
              <button
                type="button"
                className={`${styles.themeOption} ${theme === "system"
                  ? styles.themeOptionActive
                  : ""
                  }`}
                onClick={() =>
                  handleThemeChange("system")
                }
              >
                <Monitor size={18} />

                <div className={styles.themeText}>
                  <strong>System</strong>
                  <span>
                    Follow your device appearance
                  </span>
                </div>

                <span
                  className={`${styles.radio} ${theme === "system"
                    ? styles.radioSelected
                    : ""
                    }`}
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                className={`${styles.themeOption} ${theme === "light"
                  ? styles.themeOptionActive
                  : ""
                  }`}
                onClick={() =>
                  handleThemeChange("light")
                }
              >
                <Sun size={18} />

                <div className={styles.themeText}>
                  <strong>Light</strong>
                  <span>Always use light mode</span>
                </div>

                <span
                  className={`${styles.radio} ${theme === "light"
                    ? styles.radioSelected
                    : ""
                    }`}
                  aria-hidden="true"
                />
              </button>

              <button
                type="button"
                className={`${styles.themeOption} ${theme === "dark"
                  ? styles.themeOptionActive
                  : ""
                  }`}
                onClick={() =>
                  handleThemeChange("dark")
                }
              >
                <Moon size={18} />

                <div className={styles.themeText}>
                  <strong>Dark</strong>
                  <span>Always use dark mode</span>
                </div>

                <span
                  className={`${styles.radio} ${theme === "dark"
                    ? styles.radioSelected
                    : ""
                    }`}
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
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
            type="button"
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
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={() =>
            setShowLogoutModal(false)
          }
        >
          <div
            className={styles.logoutModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <h2 id="logout-title">Logout?</h2>

            <p>
              Are you sure you want to logout from
              your account?
            </p>

            <div className={styles.modalButtons}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
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
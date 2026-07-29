import {
  useEffect,
  useState,
} from "react";

import {
  Lock,
  Bell,
  Shield,
  Palette,
  Info,
  ChevronRight,
  ChevronDown,
  Check,
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

import {
  getPrivacySettings,
  updatePrivacySettings,
} from "../../services/authService";

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

  const [showPrivacy, setShowPrivacy] =
    useState(false);

  const [privacySettings, setPrivacySettings] =
    useState({
      privateAccount: false,
      showOnlineStatus: true,
      showLastSeen: true,
      readReceipts: true,
      messagePermission: "everyone",
    });

  const [privacyLoading, setPrivacyLoading] =
    useState(true);

  const [privacyUpdating, setPrivacyUpdating] =
    useState("");

  const [
    showMessagePermissionMenu,
    setShowMessagePermissionMenu,
  ] = useState(false);

  const [privacyError, setPrivacyError] =
    useState("");

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [
    showChangePasswordModal,
    setShowChangePasswordModal,
  ] = useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPrivacySettings = async () => {
      try {
        setPrivacyLoading(true);
        setPrivacyError("");

        const data =
          await getPrivacySettings();

        if (!isMounted) return;

        setPrivacySettings(
          data?.privacySettings || {
            privateAccount: false,
            showOnlineStatus: true,
            showLastSeen: true,
            readReceipts: true,
            messagePermission: "everyone",
          }
        );
      } catch (error) {
        if (!isMounted) return;

        setPrivacyError(
          error?.response?.data?.message ||
          "Unable to load privacy settings"
        );
      } finally {
        if (isMounted) {
          setPrivacyLoading(false);
        }
      }
    };

    loadPrivacySettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const handlePrivacyToggle = async (
    field
  ) => {
    if (privacyUpdating) return;

    const previousSettings = {
      ...privacySettings,
    };

    const nextValue =
      !privacySettings[field];

    setPrivacySettings((previous) => ({
      ...previous,
      [field]: nextValue,
    }));

    setPrivacyUpdating(field);
    setPrivacyError("");

    try {
      const data =
        await updatePrivacySettings({
          [field]: nextValue,
        });

      if (data?.privacySettings) {
        setPrivacySettings(
          data.privacySettings
        );
      }
    } catch (error) {
      setPrivacySettings(
        previousSettings
      );

      setPrivacyError(
        error?.response?.data?.message ||
        "Unable to update privacy settings"
      );
    } finally {
      setPrivacyUpdating("");
    }
  };

  const messagePermissionOptions = [
    {
      value: "everyone",
      label: "Everyone",
    },
    {
      value: "followers",
      label: "Followers",
    },
    {
      value: "following",
      label: "People I follow",
    },
    {
      value: "no-one",
      label: "No one",
    },
  ];

  const getMessagePermissionLabel = () =>
    messagePermissionOptions.find(
      (option) =>
        option.value ===
        privacySettings.messagePermission
    )?.label || "Everyone";

  const handleMessagePermissionChange =
    async (
      nextPermission
    ) => {
      if (privacyUpdating) return;

      setShowMessagePermissionMenu(
        false
      );

      if (
        nextPermission ===
        privacySettings.messagePermission
      ) {
        return;
      }

      const previousSettings = {
        ...privacySettings,
      };

      setPrivacySettings(
        (previous) => ({
          ...previous,
          messagePermission:
            nextPermission,
        })
      );

      setPrivacyUpdating(
        "messagePermission"
      );

      setPrivacyError("");

      try {
        const data =
          await updatePrivacySettings({
            messagePermission:
              nextPermission,
          });

        if (data?.privacySettings) {
          setPrivacySettings(
            data.privacySettings
          );
        }
      } catch (error) {
        setPrivacySettings(
          previousSettings
        );

        setPrivacyError(
          error?.response?.data
            ?.message ||
          "Unable to update privacy settings"
        );
      } finally {
        setPrivacyUpdating("");
      }
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

          <button
            type="button"
            className={styles.item}
            onClick={() =>
              setShowPrivacy(
                (previous) => !previous
              )
            }
            aria-expanded={showPrivacy}
          >
            <div className={styles.left}>
              <Shield size={18} />
              <span>Privacy Controls</span>
            </div>

            <div className={styles.itemRight}>
              <small>
                {privacyLoading
                  ? "Loading"
                  : "Manage"}
              </small>

              <ChevronRight
                size={18}
                className={
                  showPrivacy
                    ? styles.chevronOpen
                    : ""
                }
              />
            </div>
          </button>

          {showPrivacy && (
            <div
              className={styles.privacyPanel}
            >
              {privacyLoading ? (
                <p
                  className={
                    styles.privacyStatus
                  }
                >
                  Loading privacy settings...
                </p>
              ) : (
                <>
                  <div
                    className={
                      styles.privacyOption
                    }
                  >
                    <div
                      className={
                        styles.privacyText
                      }
                    >
                      <strong>
                        Private account
                      </strong>

                      <span>
                        Only approved people can
                        follow you
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={
                        privacySettings.privateAccount
                      }
                      aria-label="Private account"
                      className={`${styles.switch} ${privacySettings.privateAccount
                        ? styles.switchActive
                        : ""
                        }`}
                      onClick={() =>
                        handlePrivacyToggle(
                          "privateAccount"
                        )
                      }
                      disabled={
                        Boolean(
                          privacyUpdating
                        )
                      }
                    >
                      <span
                        className={
                          styles.switchThumb
                        }
                      />
                    </button>
                  </div>

                  <div
                    className={
                      styles.privacyOption
                    }
                  >
                    <div
                      className={
                        styles.privacyText
                      }
                    >
                      <strong>
                        Online status
                      </strong>

                      <span>
                        Allow others to see when
                        you are online
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={
                        privacySettings.showOnlineStatus
                      }
                      aria-label="Show online status"
                      className={`${styles.switch} ${privacySettings.showOnlineStatus
                        ? styles.switchActive
                        : ""
                        }`}
                      onClick={() =>
                        handlePrivacyToggle(
                          "showOnlineStatus"
                        )
                      }
                      disabled={
                        Boolean(
                          privacyUpdating
                        )
                      }
                    >
                      <span
                        className={
                          styles.switchThumb
                        }
                      />
                    </button>
                  </div>

                  <div
                    className={
                      styles.privacyOption
                    }
                  >
                    <div
                      className={
                        styles.privacyText
                      }
                    >
                      <strong>
                        Last seen
                      </strong>

                      <span>
                        Allow others to see your
                        last active time
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={
                        privacySettings.showLastSeen
                      }
                      aria-label="Show last seen"
                      className={`${styles.switch} ${privacySettings.showLastSeen
                        ? styles.switchActive
                        : ""
                        }`}
                      onClick={() =>
                        handlePrivacyToggle(
                          "showLastSeen"
                        )
                      }
                      disabled={
                        Boolean(
                          privacyUpdating
                        )
                      }
                    >
                      <span
                        className={
                          styles.switchThumb
                        }
                      />
                    </button>
                  </div>

                  <div
                    className={
                      styles.privacyOption
                    }
                  >
                    <div
                      className={
                        styles.privacyText
                      }
                    >
                      <strong>
                        Read receipts
                      </strong>

                      <span>
                        Send seen status for
                        messages you read
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={
                        privacySettings.readReceipts
                      }
                      aria-label="Read receipts"
                      className={`${styles.switch} ${privacySettings.readReceipts
                        ? styles.switchActive
                        : ""
                        }`}
                      onClick={() =>
                        handlePrivacyToggle(
                          "readReceipts"
                        )
                      }
                      disabled={
                        Boolean(
                          privacyUpdating
                        )
                      }
                    >
                      <span
                        className={
                          styles.switchThumb
                        }
                      />
                    </button>
                  </div>

                  <label
                    className={
                      styles.permissionOption
                    }
                  >
                    <div
                      className={
                        styles.privacyText
                      }
                    >
                      <strong>
                        Who can message me
                      </strong>

                      <span>
                        Control who can start a
                        conversation
                      </span>
                    </div>
                    <div
                      className={
                        styles.permissionDropdown
                      }
                    >
                      <button
                        type="button"
                        className={
                          styles.permissionTrigger
                        }
                        onClick={() =>
                          setShowMessagePermissionMenu(
                            (previous) => !previous
                          )
                        }
                        disabled={
                          Boolean(privacyUpdating)
                        }
                        aria-haspopup="listbox"
                        aria-expanded={
                          showMessagePermissionMenu
                        }
                      >
                        <span>
                          {getMessagePermissionLabel()}
                        </span>

                        <ChevronDown
                          size={18}
                          className={
                            showMessagePermissionMenu
                              ? styles.permissionChevronOpen
                              : styles.permissionChevron
                          }
                        />
                      </button>

                      {showMessagePermissionMenu && (
                        <div
                          className={
                            styles.permissionMenu
                          }
                          role="listbox"
                          aria-label="Who can message me"
                        >
                          {messagePermissionOptions.map(
                            (option) => {
                              const isSelected =
                                privacySettings
                                  .messagePermission ===
                                option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  role="option"
                                  aria-selected={
                                    isSelected
                                  }
                                  className={`${styles.permissionMenuItem} ${isSelected
                                      ? styles.permissionMenuItemActive
                                      : ""
                                    }`}
                                  onClick={() =>
                                    handleMessagePermissionChange(
                                      option.value
                                    )
                                  }
                                >
                                  <span>
                                    {option.label}
                                  </span>

                                  {isSelected && (
                                    <Check
                                      size={17}
                                      aria-hidden="true"
                                    />
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                </>
              )}

              {privacyError && (
                <p
                  className={
                    styles.privacyError
                  }
                  role="alert"
                >
                  {privacyError}
                </p>
              )}
            </div>
          )}
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
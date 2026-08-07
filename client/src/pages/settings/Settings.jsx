import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
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

const DEFAULT_PRIVACY_SETTINGS = {
  privateAccount: false,
  showOnlineStatus: true,
  showLastSeen: true,
  readReceipts: true,
  messagePermission: "everyone",
};

const MESSAGE_PERMISSION_OPTIONS = [
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

const Settings = () => {
  const navigate = useNavigate();

  const permissionDropdownRef =
    useRef(null);

  const [user, setUser] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem("user")
        ) || null
      );
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

  const [
    showMessagePermissionMenu,
    setShowMessagePermissionMenu,
  ] = useState(false);

  const [privacySettings, setPrivacySettings] =
    useState(DEFAULT_PRIVACY_SETTINGS);

  const [privacyLoading, setPrivacyLoading] =
    useState(true);

  const [privacyUpdating, setPrivacyUpdating] =
    useState("");

  const [privacyError, setPrivacyError] =
    useState("");

  const [
    showPasswordModal,
    setShowPasswordModal,
  ] = useState(false);

  const [
    showChangePasswordModal,
    setShowChangePasswordModal,
  ] = useState(false);

  const [
    showLogoutModal,
    setShowLogoutModal,
  ] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPrivacySettings = async () => {
      try {
        setPrivacyLoading(true);
        setPrivacyError("");

        const data =
          await getPrivacySettings();

        if (!isMounted) return;

        setPrivacySettings({
          ...DEFAULT_PRIVACY_SETTINGS,
          ...(data?.privacySettings || {}),
        });
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


  /* =========================
   DROPDOWN UX
========================= */

  useEffect(() => {
    if (!showMessagePermissionMenu) {
      return undefined;
    }

    const handlePointerDown = (
      event
    ) => {
      if (
        permissionDropdownRef
          .current &&
        !permissionDropdownRef
          .current.contains(
            event.target
          )
      ) {
        setShowMessagePermissionMenu(
          false
        );
      }
    };

    const handleKeyDown = (
      event
    ) => {
      if (event.key === "Escape") {
        setShowMessagePermissionMenu(
          false
        );
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    showMessagePermissionMenu,
  ]);

  /* =========================
   LOGOUT MODAL UX
========================= */

  useEffect(() => {
    if (!showLogoutModal) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event
    ) => {
      if (event.key === "Escape") {
        setShowLogoutModal(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    showLogoutModal,
  ]);

  const handleThemeChange = (
    nextTheme
  ) => {
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
        setPrivacySettings({
          ...DEFAULT_PRIVACY_SETTINGS,
          ...data.privacySettings,
        });
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

  const handleMessagePermissionChange =
    async (nextPermission) => {
      if (privacyUpdating) return;

      setShowMessagePermissionMenu(false);

      if (
        nextPermission ===
        privacySettings.messagePermission
      ) {
        return;
      }

      const previousSettings = {
        ...privacySettings,
      };

      setPrivacySettings((previous) => ({
        ...previous,
        messagePermission:
          nextPermission,
      }));

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
          setPrivacySettings({
            ...DEFAULT_PRIVACY_SETTINGS,
            ...data.privacySettings,
          });
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

  const getMessagePermissionLabel = () =>
    MESSAGE_PERMISSION_OPTIONS.find(
      (option) =>
        option.value ===
        privacySettings.messagePermission
    )?.label || "Everyone";

  const getThemeLabel = () => {
    if (theme === "light") {
      return "Light";
    }

    if (theme === "dark") {
      return "Dark";
    }

    return "System";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  const renderPrivacySwitch = ({
    field,
    title,
    description,
    ariaLabel,
  }) => {
    const isActive =
      Boolean(privacySettings[field]);

    return (
      <div
        className={styles.privacyOption}
      >
        <div
          className={styles.privacyText}
        >
          <strong>{title}</strong>

          <span>{description}</span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={ariaLabel}
          className={`${styles.switch} ${isActive
            ? styles.switchActive
            : ""
            }`}
          onClick={() =>
            handlePrivacyToggle(field)
          }
          disabled={Boolean(
            privacyUpdating
          )}
        >
          <span
            className={styles.switchThumb}
          />
        </button>
      </div>
    );
  };

  const renderThemeOption = ({
    value,
    title,
    description,
    Icon,
  }) => {
    const isSelected =
      theme === value;

    return (
      <button
        type="button"
        className={`${styles.themeOption} ${isSelected
          ? styles.themeOptionActive
          : ""
          }`}
        onClick={() =>
          handleThemeChange(value)
        }
      >
        <Icon size={18} />

        <div
          className={styles.themeText}
        >
          <strong>{title}</strong>
          <span>{description}</span>
        </div>

        <span
          className={`${styles.radio} ${isSelected
            ? styles.radioSelected
            : ""
            }`}
          aria-hidden="true"
        />
      </button>
    );
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

        {/* ACCOUNT SUMMARY */}

        <div
          className={
            styles.accountSummary
          }
        >
          <div
            className={
              styles.accountAvatar
            }
          >
            {user?.profilePic ? (
              <img
                src={user.profilePic}
                alt=""
              />
            ) : (
              <span aria-hidden="true">
                {String(
                  user?.name ||
                  user?.username ||
                  "U"
                )
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div
            className={
              styles.accountIdentity
            }
          >
            <strong>
              {user?.name ||
                "Your account"}
            </strong>

            <span>
              {user?.username
                ? `@${user.username}`
                : "PingMe account"}
            </span>
          </div>

          <button
            type="button"
            className={
              styles.profileShortcut
            }
            onClick={() =>
              navigate("/profile")
            }
          >
            View profile
          </button>
        </div>

        {/* ACCOUNT */}
        <div className={styles.section}>
          <h2>Account</h2>

          {user?.hasPassword ? (
            <button
              type="button"
              className={styles.item}
              onClick={() =>
                setShowChangePasswordModal(
                  true
                )
              }
            >
              <div
                className={styles.left}
              >
                <Lock size={18} />
                <span>
                  Change Password
                </span>
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
              <div
                className={styles.left}
              >
                <Lock size={18} />
                <span>
                  Create Password
                </span>
              </div>

              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* PRIVACY */}
        <div
          className={`${styles.section} ${styles.privacySection}`}
        >
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
            <div
              className={styles.left}
            >
              <Shield size={18} />
              <span>
                Privacy Controls
              </span>
            </div>

            <div
              className={styles.itemRight}
            >
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
              className={
                styles.privacyPanel
              }
            >
              {privacyLoading ? (
                <p
                  className={
                    styles.privacyStatus
                  }
                >
                  Loading privacy
                  settings...
                </p>
              ) : (
                <>
                  {renderPrivacySwitch({
                    field:
                      "privateAccount",
                    title:
                      "Private account",
                    description:
                      "Only approved people can follow you",
                    ariaLabel:
                      "Private account",
                  })}

                  {renderPrivacySwitch({
                    field:
                      "showOnlineStatus",
                    title:
                      "Online status",
                    description:
                      "Allow others to see when you are online",
                    ariaLabel:
                      "Show online status",
                  })}

                  {renderPrivacySwitch({
                    field:
                      "showLastSeen",
                    title: "Last seen",
                    description:
                      "Allow others to see your last active time",
                    ariaLabel:
                      "Show last seen",
                  })}

                  {renderPrivacySwitch({
                    field:
                      "readReceipts",
                    title:
                      "Read receipts",
                    description:
                      "Send seen status for messages you read",
                    ariaLabel:
                      "Read receipts",
                  })}

                  <div
                    ref={permissionDropdownRef}
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
                            (previous) =>
                              !previous
                          )
                        }
                        disabled={Boolean(
                          privacyUpdating
                        )}
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
                          {MESSAGE_PERMISSION_OPTIONS.map(
                            (option) => {
                              const isSelected =
                                privacySettings.messagePermission ===
                                option.value;

                              return (
                                <button
                                  key={
                                    option.value
                                  }
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
                                    {
                                      option.label
                                    }
                                  </span>

                                  {isSelected && (
                                    <Check
                                      size={
                                        17
                                      }
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
                  </div>
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

        {/* NOTIFICATIONS */}
        <div className={styles.section}>
          <h2>Notifications</h2>

          <div
            className={
              styles.itemDisabled
            }
          >
            <div
              className={styles.left}
            >
              <Bell size={18} />
              <span>Notifications</span>
            </div>

            <small>Coming Soon</small>
          </div>
        </div>

        {/* APPEARANCE */}
        <div className={styles.section}>
          <h2>Appearance</h2>

          <button
            type="button"
            className={styles.item}
            onClick={() =>
              setShowAppearance(
                (previous) => !previous
              )
            }
            aria-expanded={
              showAppearance
            }
          >
            <div
              className={styles.left}
            >
              <Palette size={18} />
              <span>Theme</span>
            </div>

            <div
              className={styles.itemRight}
            >
              <small>
                {getThemeLabel()}
              </small>

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
            <div
              className={
                styles.appearancePanel
              }
            >
              {renderThemeOption({
                value: "system",
                title: "System",
                description:
                  "Follow your device appearance",
                Icon: Monitor,
              })}

              {renderThemeOption({
                value: "light",
                title: "Light",
                description:
                  "Always use light mode",
                Icon: Sun,
              })}

              {renderThemeOption({
                value: "dark",
                title: "Dark",
                description:
                  "Always use dark mode",
                Icon: Moon,
              })}
            </div>
          )}
        </div>

        {/* ABOUT */}
        <div className={styles.section}>
          <h2>About</h2>

          <div
            className={
              styles.itemDisabled
            }
          >
            <div
              className={styles.left}
            >
              <Info size={18} />
              <span>About PingMe</span>
            </div>

            <small>v1.0.0</small>
          </div>
        </div>

        {/* LOGOUT */}
        <div
          className={
            styles.logoutSection
          }
        >
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={() =>
              setShowLogoutModal(true)
            }
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* CREATE PASSWORD MODAL */}
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

      {/* CHANGE PASSWORD MODAL */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() =>
            setShowChangePasswordModal(
              false
            )
          }
          onSuccess={() =>
            setShowChangePasswordModal(
              false
            )
          }
        />
      )}

      {/* LOGOUT CONFIRMATION */}
      {showLogoutModal &&
        typeof document !==
        "undefined" &&
        createPortal(
          <div
            className={
              styles.modalOverlay
            }
            role="presentation"
            onMouseDown={() =>
              setShowLogoutModal(false)
            }
          >
            <div
              className={
                styles.logoutModal
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-title"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <h2 id="logout-title">
                Logout?
              </h2>

              <p>
                Are you sure you want to
                logout from your account?
              </p>

              <div
                className={
                  styles.modalButtons
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelBtn
                  }
                  onClick={() =>
                    setShowLogoutModal(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={
                    styles.confirmLogoutBtn
                  }
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Settings;
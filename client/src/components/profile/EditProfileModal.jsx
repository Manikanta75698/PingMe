import {
  useEffect,
  useState,
} from "react";

import styles from "./EditProfileModal.module.css";

import {
  updateProfile,
  checkUsernameAvailability,
} from "../../services/authService";

import {
  useToastContext,
} from "../ui/toast/ToastProvider";

const EditProfileModal = ({
  user,
  onClose,
  onUpdated,
}) => {
  const toast =
    useToastContext();

  const originalUsername =
    user?.username?.trim().toLowerCase() || "";

  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    bio: user?.bio || "",
  });

  const [loading, setLoading] =
    useState(false);

  const [
    usernameStatus,
    setUsernameStatus,
  ] = useState({
    checking: false,
    available: null,
    message: "",
  });

  // =========================
  // INPUT CHANGE
  // =========================
  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "username") {
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });
    }
  };

  // =========================
  // LIVE USERNAME CHECK
  // 500ms DEBOUNCE
  // =========================
  useEffect(() => {
    const username =
      formData.username
        .trim()
        .toLowerCase();

    // Empty username
    if (!username) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Username is required",
      });

      return;
    }

    // Own current username
    if (username === originalUsername) {
      setUsernameStatus({
        checking: false,
        available: true,
        message: "Current username",
      });

      return;
    }

    setUsernameStatus({
      checking: true,
      available: null,
      message: "Checking username...",
    });

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const response =
          await checkUsernameAvailability(
            username
          );

        if (cancelled) return;

        setUsernameStatus({
          checking: false,
          available:
            response?.available === true,
          message:
            response?.message ||
            "Unable to check username",
        });
      } catch (error) {
        if (cancelled) return;

        console.error(
          "USERNAME CHECK ERROR:",
          error.response?.data ||
          error.message
        );

        setUsernameStatus({
          checking: false,
          available: null,
          message:
            "Unable to check username right now",
        });
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    formData.username,
    originalUsername,
  ]);

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const cleanName =
      formData.name.trim();

    const cleanUsername =
      formData.username
        .trim()
        .toLowerCase();

    if (!cleanName) {
      toast.warning(
        "Name cannot be empty"
      );

      return;
    }

    if (!cleanUsername) {
      toast.warning(
        "Username is required"
      );

      return;
    }

    if (usernameStatus.checking) {
      toast.info(
        "Please wait while we check the username"
      );

      return;
    }

    if (
      cleanUsername !== originalUsername &&
      usernameStatus.available !== true
    ) {
      toast.warning(
        usernameStatus.message ||
        "Please choose an available username"
      );

      return;
    }

    try {
      setLoading(true);

      const response = await updateProfile({
        name: cleanName,
        username: cleanUsername,
        bio: formData.bio.trim(),
      });

      localStorage.setItem(
        "user",
        JSON.stringify(response.user)
      );

      // Parent can update UI instantly
      if (onUpdated) {
        onUpdated(response.user);
      }

      toast.success(
        response?.message ||
        "Profile updated successfully"
      );

      onClose();
    } catch (error) {
      const errorData =
        error.response?.data;

      console.error(
        "PROFILE UPDATE ERROR:",
        errorData || error.message
      );

      if (
        errorData?.field === "username"
      ) {
        setUsernameStatus({
          checking: false,
          available: false,
          message:
            errorData.message ||
            "Username is already taken",
        });
      }

      toast.error(
        errorData?.message ||
        "Profile update failed"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        <div className={styles.header}>
          <h2 id="edit-profile-title">
            Edit Profile
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close edit profile"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="edit-name">
              Name
            </label>

            <input
              id="edit-name"
              type="text"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              maxLength={50}
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="edit-username">
              Username
            </label>

            <input
              id="edit-username"
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              maxLength={30}
              disabled={loading}
              autoComplete="username"
            />

            {usernameStatus.message && (
              <p
                className={
                  usernameStatus.checking
                    ? styles.usernameChecking
                    : usernameStatus.available ===
                      true
                      ? styles.usernameAvailable
                      : usernameStatus.available ===
                        false
                        ? styles.usernameTaken
                        : styles.usernameNeutral
                }
              >
                {usernameStatus.checking
                  ? "Checking..."
                  : usernameStatus.available ===
                    true
                    ? `✓ ${usernameStatus.message}`
                    : usernameStatus.available ===
                      false
                      ? `✕ ${usernameStatus.message}`
                      : usernameStatus.message}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="edit-bio">
              Bio
            </label>

            <textarea
              id="edit-bio"
              rows="4"
              name="bio"
              placeholder="Tell people about yourself"
              value={formData.bio}
              onChange={handleChange}
              maxLength={160}
              disabled={loading}
            />

            <span className={styles.counter}>
              {formData.bio.length}/160
            </span>
          </div>

          <div className={styles.buttons}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancel}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={styles.save}
              disabled={
                loading ||
                usernameStatus.checking ||
                usernameStatus.available ===
                false
              }
            >
              {loading
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

import { setPassword } from "../../services/authService";

import styles from "./SetPasswordModal.module.css";

const SetPasswordModal = ({
  onClose,
  onSuccess,
}) => {
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      return alert("Fill all fields");
    }

    if (password !== confirmPassword) {
      return alert("Passwords do not match");
    }

    try {
      setLoading(true);

      const response = await setPassword({
        password,
      });

      alert(response.message);

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }

    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Unable to set password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <button
          className={styles.closeBtn}
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className={styles.title}>
          Set Password
        </h2>

        <p className={styles.subtitle}>
          Create a password so you can log in using
          your email and password in addition to
          Google.
        </p>

        <div className={styles.inputGroup}>
          <label>New Password</label>

          <div className={styles.passwordWrapper}>
            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter new password"
              value={password}
              onChange={(e) =>
                setPasswordValue(e.target.value)
              }
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label>Confirm Password</label>

          <div className={styles.passwordWrapper}>
            <input
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className={styles.saveBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : "Save Password"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SetPasswordModal;
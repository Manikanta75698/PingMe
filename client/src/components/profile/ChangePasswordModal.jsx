import { useState } from "react";

import { changePassword } from "../../services/authService";

import styles from "./ChangePasswordModal.module.css";

const ChangePasswordModal = ({ onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return alert("Fill all fields");
    }

    if (newPassword !== confirmPassword) {
      return alert("Passwords do not match");
    }

    try {
      setLoading(true);

      const response = await changePassword({
        currentPassword,
        newPassword,
      });

      alert(response.message);

      onSuccess?.();

      onClose();

    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Unable to change password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <h2 className={styles.title}>
          Change Password
        </h2>

        <input
          className={styles.input}
          type="password"
          placeholder="Current Password"
          value={currentPassword}
          onChange={(e) =>
            setCurrentPassword(e.target.value)
          }
        />

        <input
          className={styles.input}
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) =>
            setNewPassword(e.target.value)
          }
        />

        <input
          className={styles.input}
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value)
          }
        />

        <div className={styles.actions}>
          <button
            className={styles.primaryBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Updating..."
              : "Update Password"}
          </button>

          <button
            className={styles.secondaryBtn}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChangePasswordModal;
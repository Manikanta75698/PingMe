import { useState } from "react";

import {
  changePassword,
} from "../../services/authService";

import {
  useToastContext,
} from "../ui/toast/ToastProvider";

import styles from "./ChangePasswordModal.module.css";

const ChangePasswordModal = ({
  onClose,
  onSuccess,
}) => {
  const toast =
    useToastContext();

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const handleSubmit = async () => {
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      toast.warning(
        "Please fill in all fields"
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      toast.warning(
        "Passwords do not match"
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await changePassword({
          currentPassword,
          newPassword,
        });

      toast.success(
        response?.message ||
        "Password changed successfully"
      );

      onSuccess?.();

      onClose();
    } catch (error) {
      toast.error(
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
          onChange={(event) =>
            setCurrentPassword(
              event.target.value
            )
          }
        />

        <input
          className={styles.input}
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(event) =>
            setNewPassword(
              event.target.value
            )
          }
        />

        <input
          className={styles.input}
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
        />

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Updating..."
              : "Update Password"}
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
import {
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  X,
} from "lucide-react";

import {
  setPassword,
} from "../../services/authService";

import {
  useToastContext,
} from "../ui/toast/ToastProvider";

import styles from "./SetPasswordModal.module.css";

const SetPasswordModal = ({
  onClose,
  onSuccess,
}) => {
  const toast =
    useToastContext();

  const [
    password,
    setPasswordValue,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const handleSubmit = async () => {
    if (
      !password ||
      !confirmPassword
    ) {
      toast.warning(
        "Please fill in all fields"
      );

      return;
    }

    if (
      password !==
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
        await setPassword({
          password,
        });

      toast.success(
        response?.message ||
        "Password set successfully"
      );

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Unable to set password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-password-title"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          disabled={loading}
          aria-label="Close set password"
        >
          <X
            size={20}
            aria-hidden="true"
          />
        </button>

        <h2
          id="set-password-title"
          className={styles.title}
        >
          Set Password
        </h2>

        <p className={styles.subtitle}>
          Create a password so you can log in using
          your email and password in addition to
          Google.
        </p>

        <div className={styles.inputGroup}>
          <label htmlFor="set-password">
            New Password
          </label>

          <div className={styles.passwordWrapper}>
            <input
              id="set-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter new password"
              value={password}
              onChange={(event) =>
                setPasswordValue(
                  event.target.value
                )
              }
              disabled={loading}
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (previous) =>
                    !previous
                )
              }
              disabled={loading}
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff
                  size={18}
                  aria-hidden="true"
                />
              ) : (
                <Eye
                  size={18}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="confirm-set-password">
            Confirm Password
          </label>

          <div className={styles.passwordWrapper}>
            <input
              id="confirm-set-password"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              disabled={loading}
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (previous) =>
                    !previous
                )
              }
              disabled={loading}
              aria-label={
                showConfirmPassword
                  ? "Hide confirmation password"
                  : "Show confirmation password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff
                  size={18}
                  aria-hidden="true"
                />
              ) : (
                <Eye
                  size={18}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
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
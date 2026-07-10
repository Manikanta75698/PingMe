import { useState } from "react";
import { setPassword } from "../../services/authService";

const SetPasswordModal = ({
  onClose,
  onSuccess,
}) => {
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div>
      <h2>Set Password</h2>

      <input
        type="password"
        placeholder="New Password"
        value={password}
        onChange={(e) => setPasswordValue(e.target.value)}
      />

      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Password"}
      </button>

      <button onClick={onClose}>
        Cancel
      </button>
    </div>
  );
};

export default SetPasswordModal;
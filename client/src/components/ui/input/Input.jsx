import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import styles from "./Input.module.css";

const Input = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  name,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType =
    type === "password"
      ? showPassword
        ? "text"
        : "password"
      : type;

  return (
    <div className={styles.inputGroup}>
      {label && <label className={styles.label}>{label}</label>}

      <div className={styles.inputWrapper}>
        <input
          className={styles.input}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          name={name}
        />

        {type === "password" && (
          <button
            type="button"
            className={styles.eyeButton}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
      </div>
    </div>
  );
};

export default Input;
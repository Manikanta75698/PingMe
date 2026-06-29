import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./Input.css";

export default function Input({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  name,
  required = false,
  leftIcon,
  error,
  helperText,
  disabled = false,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="input-group">

      {label && (
        <label className="input-label">
          {label}
        </label>
      )}

      <div className="input-wrapper">

        {leftIcon && (
          <span className="input-left-icon">
            {leftIcon}
          </span>
        )}

        <input
          className={`
            input
            ${leftIcon ? "has-left-icon" : ""}
            ${error ? "input-error" : ""}
          `}
          type={
            type === "password"
              ? (showPassword ? "text" : "password")
              : type
          }
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          name={name}
          required={required}
          disabled={disabled}
        />

        {type === "password" && (
          <span
            className="input-eye"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        )}

      </div>

      {error && (
        <small className="input-error-text">
          {error}
        </small>
      )}

      {helperText && !error && (
        <small className="input-helper">
          {helperText}
        </small>
      )}

    </div>
  );
}
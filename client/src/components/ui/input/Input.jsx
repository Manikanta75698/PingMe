import {
  useId,
  useState,
} from "react";

import {
  Eye,
  EyeOff,
} from "lucide-react";

import styles from "./Input.module.css";

const Input = ({
  id,
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,

  error = "",
  helperText = "",

  showPasswordToggle = true,

  className = "",
  inputClassName = "",

  disabled = false,
  required = false,

  ...inputProps
}) => {
  const generatedId =
    useId();

  const inputId =
    id ||
    `${name || "input"}-${generatedId}`;

  const errorId =
    `${inputId}-error`;

  const helperId =
    `${inputId}-helper`;

  const [
    passwordVisible,
    setPasswordVisible,
  ] = useState(false);

  const isPassword =
    type === "password";

  const hasPasswordToggle =
    isPassword &&
    showPasswordToggle;

  const resolvedType =
    isPassword &&
      passwordVisible
      ? "text"
      : type;

  const describedBy =
    [
      error
        ? errorId
        : null,

      helperText
        ? helperId
        : null,

      inputProps[
      "aria-describedby"
      ],
    ]
      .filter(Boolean)
      .join(" ") ||
    undefined;

  const handleVisibilityToggle =
    () => {
      if (disabled) {
        return;
      }

      setPasswordVisible(
        (previous) =>
          !previous
      );
    };

  return (
    <div
      className={`${styles.inputGroup} ${className}`}
    >
      {label && (
        <label
          className={
            styles.label
          }
          htmlFor={inputId}
        >
          {label}

          {required && (
            <span
              className={
                styles.requiredMark
              }
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <div
        className={`${styles.inputWrapper} ${error
            ? styles.wrapperError
            : ""
          } ${disabled
            ? styles.wrapperDisabled
            : ""
          }`}
      >
        <input
          {...inputProps}
          id={inputId}
          className={`${styles.input} ${hasPasswordToggle
              ? styles.inputWithToggle
              : ""
            } ${error
              ? styles.errorInput
              : ""
            } ${inputClassName}`}
          type={resolvedType}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={
            error
              ? "true"
              : inputProps[
              "aria-invalid"
              ]
          }
          aria-describedby={
            describedBy
          }
        />

        {hasPasswordToggle && (
          <button
            type="button"
            className={
              styles.eyeButton
            }
            onClick={
              handleVisibilityToggle
            }
            disabled={disabled}
            aria-label={
              passwordVisible
                ? "Hide password"
                : "Show password"
            }
            aria-controls={
              inputId
            }
            aria-pressed={
              passwordVisible
            }
          >
            {passwordVisible ? (
              <EyeOff
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            ) : (
              <Eye
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
          </button>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          className={
            styles.error
          }
          role="alert"
        >
          {error}
        </p>
      )}

      {!error &&
        helperText && (
          <p
            id={helperId}
            className={
              styles.helperText
            }
          >
            {helperText}
          </p>
        )}
    </div>
  );
};

export default Input;
import styles from "./Button.module.css";

const Button = ({
  children,
  type = "button",
  variant = "primary",
  size = "medium",
  fullWidth = false,
  disabled = false,
  loading = false,
  loadingText = "Loading...",
  onClick,
  className = "",
  ...rest
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    loading ? styles.loading : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={buttonClasses}
      aria-busy={loading}
      {...rest}
    >
      <span className={styles.content}>
        {loading && (
          <span
            className={styles.spinner}
            aria-hidden="true"
          />
        )}

        <span className={styles.label}>
          {loading ? loadingText : children}
        </span>
      </span>
    </button>
  );
};

export default Button;
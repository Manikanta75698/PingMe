import styles from "./Button.module.css";

const Button = ({
  children,
  type = "button",
  variant = "primary",
  size = "medium",
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${styles.button}
        ${styles[variant]}
        ${styles[size]}
        ${fullWidth ? styles.fullWidth : ""}
      `}
    >
      {loading ? "Loading..." : children}
    </button>
  );
};

export default Button;
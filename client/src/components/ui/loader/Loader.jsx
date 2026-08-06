import styles from "./Loader.module.css";

const VALID_SIZES = new Set([
  "small",
  "medium",
  "large",
]);

const Loader = ({
  size = "medium",
  fullScreen = false,
  label = "Loading...",
  showLabel = false,
  className = "",
}) => {
  const safeSize = VALID_SIZES.has(size)
    ? size
    : "medium";

  const wrapperClassName = [
    fullScreen
      ? styles.fullScreen
      : styles.container,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapperClassName}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={styles.content}>
        <span
          className={`${styles.loader} ${styles[safeSize]}`}
          aria-hidden="true"
        />

        {showLabel && (
          <span className={styles.label}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

export default Loader;
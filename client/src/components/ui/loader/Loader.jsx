import styles from "./Loader.module.css";

const Loader = ({
  size = "medium",
  fullScreen = false,
}) => {
  return (
    <div
      className={
        fullScreen
          ? styles.fullScreen
          : styles.container
      }
    >
      <div
        className={`${styles.loader} ${styles[size]}`}
      ></div>
    </div>
  );
};

export default Loader;
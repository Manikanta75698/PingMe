import styles from "./Logo.module.css";

const Logo = ({ size = "md" }) => {
  return (
    <div className={`${styles.logo} ${styles[size]}`}>
      <span className={styles.ping}>Ping</span>
      <span className={styles.me}>Me</span>
    </div>
  );
};

export default Logo;
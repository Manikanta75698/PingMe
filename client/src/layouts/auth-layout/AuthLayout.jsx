import styles from "./AuthLayout.module.css";

const AuthLayout = ({ children }) => {
  return (
    <main className={styles.authLayout}>
      {children}
    </main>
  );
};

export default AuthLayout;
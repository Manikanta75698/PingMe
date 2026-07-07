import styles from "./MainLayout.module.css";

const MainLayout = ({ children }) => {
  return (
    <main className={styles.mainLayout}>
      {children}
    </main>
  );
};

export default MainLayout;
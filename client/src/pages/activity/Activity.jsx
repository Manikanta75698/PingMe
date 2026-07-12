import ActivityTabs from "./ActivityTabs";

import styles from "./Activity.module.css";

const Activity = () => {
  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.header}>
          <h1>Activity</h1>

          <p>
            Manage chat requests and view your recent activity.
          </p>
        </header>

        <ActivityTabs />
      </section>
    </main>
  );
};

export default Activity;
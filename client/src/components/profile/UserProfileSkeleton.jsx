import styles from "./UserProfileSkeleton.module.css";

const UserProfileSkeleton = () => {
  return (
    <div className={styles.container}>

      <div className={styles.profileCard}>

        <div className={`${styles.avatar} ${styles.skeleton}`} />

        <div className={`${styles.name} ${styles.skeleton}`} />

        <div className={`${styles.username} ${styles.skeleton}`} />

        <div className={`${styles.bio} ${styles.skeleton}`} />

        <div className={styles.stats}>

          {[1,2,3].map((item)=>(
            <div
              key={item}
              className={styles.stat}
            >
              <div className={`${styles.number} ${styles.skeleton}`} />

              <div className={`${styles.label} ${styles.skeleton}`} />
            </div>
          ))}

        </div>

        <div className={styles.actions}>
          <div className={`${styles.button} ${styles.skeleton}`} />
          <div className={`${styles.button} ${styles.skeleton}`} />
        </div>

      </div>

      <div className={styles.grid}>

        {[1,2,3,4,5,6].map((item)=>(
          <div
            key={item}
            className={`${styles.post} ${styles.skeleton}`}
          />
        ))}

      </div>

    </div>
  );
};

export default UserProfileSkeleton;
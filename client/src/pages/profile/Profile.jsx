import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileTabs from "../../components/profile/ProfileTabs";

import styles from "./Profile.module.css";

const Profile = () => {
  return (
    <div
      className={styles.profilePage}
    >
      <div
        className={
          styles.backgroundGlow
        }
        aria-hidden="true"
      />

      <main
        className={styles.main}
      >
        <section
          className={styles.container}
          aria-label="Your profile"
        >
          <ProfileHeader />
          <ProfileTabs />
        </section>
      </main>
    </div>
  );
};

export default Profile;
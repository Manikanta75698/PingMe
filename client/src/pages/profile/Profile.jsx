import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileTabs from "../../components/profile/ProfileTabs";

import styles from "./Profile.module.css";

const Profile = () => {
  return (
    <main className={styles.profilePage}>
      <div
        className={styles.backgroundGlow}
        aria-hidden="true"
      />

      <section
        className={styles.container}
        aria-label="Your profile"
      >
        <ProfileHeader />
        <ProfileTabs />
      </section>
    </main>
  );
};

export default Profile;
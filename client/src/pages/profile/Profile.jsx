import styles from "./Profile.module.css";

import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileTabs from "../../components/profile/ProfileTabs";

const Profile = () => {
  return (
    <div className={styles.profilePage}>
      <div className={styles.container}>
        <ProfileHeader />
        <ProfileTabs />
      </div>
    </div>
  );
};

export default Profile;
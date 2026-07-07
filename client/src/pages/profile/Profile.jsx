import styles from "./Profile.module.css";

import Header from "../../components/home/Header";

import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileTabs from "../../components/profile/ProfileTabs";

const Profile = () => {
  return (
    <div className={styles.profilePage}>
      <Header />

      <div className={styles.container}>
        <ProfileHeader />

        <ProfileTabs />
      </div>
    </div>
  );
};

export default Profile;
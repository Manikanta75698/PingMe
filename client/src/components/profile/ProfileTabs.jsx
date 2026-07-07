import { useState } from "react";
import { Grid3X3, Bookmark } from "lucide-react";

import PostGrid from "./PostGrid";

import styles from "./ProfileTabs.module.css";

const ProfileTabs = () => {
  const [activeTab, setActiveTab] = useState("posts");

  return (
    <>
      <div className={styles.tabs}>
        <button
          className={
            activeTab === "posts"
              ? styles.active
              : ""
          }
          onClick={() => setActiveTab("posts")}
        >
          <Grid3X3 size={18} />
          Posts
        </button>

        <button
          className={
            activeTab === "saved"
              ? styles.active
              : ""
          }
          onClick={() => setActiveTab("saved")}
        >
          <Bookmark size={18} />
          Saved
        </button>
      </div>

      <PostGrid type={activeTab} />
    </>
  );
};

export default ProfileTabs;
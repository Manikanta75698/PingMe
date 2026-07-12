import { useState } from "react";

import {
  MessageCircle,
  Heart,
  Bell,
} from "lucide-react";

import ChatRequests from "./ChatRequests";

import styles from "./ActivityTabs.module.css";

const ActivityTabs = () => {
  const [activeTab, setActiveTab] =
    useState("requests");

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === "requests"
              ? styles.active
              : ""
            }`}
          onClick={() =>
            setActiveTab("requests")
          }
        >
          <MessageCircle size={18} />
          <span>Chat Requests</span>
        </button>

        <button
          type="button"
          className={`${styles.tab} ${activeTab === "likes"
              ? styles.active
              : ""
            }`}
          onClick={() =>
            setActiveTab("likes")
          }
        >
          <Heart size={18} />
          <span>Likes</span>
        </button>

        <button
          type="button"
          className={`${styles.tab} ${activeTab === "notifications"
              ? styles.active
              : ""
            }`}
          onClick={() =>
            setActiveTab("notifications")
          }
        >
          <Bell size={18} />
          <span>Notifications</span>
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "requests" && (
          <ChatRequests />
        )}

        {activeTab === "likes" && (
          <div className={styles.empty}>
            <Heart size={30} />
            <h3>No likes yet</h3>
            <p>
              Likes on your posts will appear here.
            </p>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className={styles.empty}>
            <Bell size={30} />
            <h3>No notifications yet</h3>
            <p>
              Your notifications will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTabs;
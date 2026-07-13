import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Home,
  Search,
  Heart,
  MessageCircle,
  SquarePlus,
  X,
} from "lucide-react";

import styles from "./Sidebar.module.css";

import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";

import Avatar from "../ui/avatar/Avatar";
import CreatePost from "./CreatePost";

const Sidebar = () => {
  const { user } = useAuth();

  const {
    receivedRequests,
    chatSummaries,
    loadChatSummaries,
  } = useChat();

  const navigate = useNavigate();

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  useEffect(() => {
    loadChatSummaries();
  }, [loadChatSummaries]);

  const totalUnreadMessages =
    Array.isArray(chatSummaries)
      ? chatSummaries.reduce(
        (total, chat) =>
          total +
          (Number(chat?.unreadCount) || 0),
        0
      )
      : 0;

  const pendingRequestsCount =
    Array.isArray(receivedRequests)
      ? receivedRequests.filter(
        (request) =>
          request?.status === "pending"
      ).length
      : 0;

  return (
    <>
      <nav className={styles.sidebar}>
        <button
          type="button"
          className={styles.logo}
          onClick={() => navigate("/home")}
        >
          PingMe
        </button>

        <div className={styles.navLinks}>
          <button
            type="button"
            className={styles.navItem}
            onClick={() => navigate("/home")}
          >
            <Home className={styles.icon} />

            <span className={styles.text}>
              Home
            </span>
          </button>

          <button
            type="button"
            className={styles.navItem}
            onClick={() => navigate("/search")}
          >
            <Search className={styles.icon} />

            <span className={styles.text}>
              Search
            </span>
          </button>

          <button
            type="button"
            className={styles.navItem}
            onClick={() => navigate("/chat")}
          >
            <div className={styles.iconWrapper}>
              <MessageCircle
                className={styles.icon}
              />

              {totalUnreadMessages > 0 && (
                <span className={styles.navBadge}>
                  {totalUnreadMessages > 99
                    ? "99+"
                    : totalUnreadMessages}
                </span>
              )}
            </div>

            <span className={styles.text}>
              Messages
            </span>
          </button>

          <button
            type="button"
            className={styles.navItem}
            onClick={() =>
              navigate("/activity")
            }
          >
            <div className={styles.iconWrapper}>
              <Heart className={styles.icon} />

              {pendingRequestsCount > 0 && (
                <span className={styles.navBadge}>
                  {pendingRequestsCount > 99
                    ? "99+"
                    : pendingRequestsCount}
                </span>
              )}
            </div>

            <span className={styles.text}>
              Notifications
            </span>
          </button>

          <button
            type="button"
            className={styles.navItem}
            onClick={() =>
              setIsCreateOpen(true)
            }
          >
            <SquarePlus
              className={styles.icon}
            />

            <span className={styles.text}>
              Create
            </span>
          </button>

          <button
            type="button"
            className={styles.navItem}
            onClick={() =>
              navigate("/profile")
            }
          >
            <Avatar
              src={
                user?.profilePic ||
                "https://ui-avatars.com/api/?name=User"
              }
              alt="Profile"
              className={styles.profileIcon}
            />

            <span className={styles.text}>
              Profile
            </span>
          </button>
        </div>
      </nav>

      {isCreateOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={() =>
                setIsCreateOpen(false)
              }
              aria-label="Close create post"
            >
              <X size={28} />
            </button>

            <CreatePost
              onPostCreated={() => {
                setIsCreateOpen(false);

                window.dispatchEvent(
                  new Event("postCreated")
                );
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Home,
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
    chatSummaries,
    loadChatSummaries,
    notificationUnreadCount,
  } = useChat();

  const navigate = useNavigate();
  const location = useLocation();
  const navClass = (active) => `${styles.navItem} ${active ? styles.navItemActive : ""}`;

  const [isCreateOpen, setIsCreateOpen] =
    useState(false);

  useEffect(() => {
    loadChatSummaries();
  }, [loadChatSummaries]);

  useEffect(() => {
    if (!isCreateOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsCreateOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreateOpen]);

  const totalUnreadMessages =
    Array.isArray(chatSummaries)
      ? chatSummaries.reduce(
        (total, chat) =>
          total +
          (Number(chat?.unreadCount) || 0),
        0
      )
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
            className={navClass(location.pathname === "/home")}
            aria-label="Home"
            aria-current={location.pathname === "/home" ? "page" : undefined}
            onClick={() => navigate("/home")}
          >
            <Home className={styles.icon} />

            <span className={styles.text}>
              Home
            </span>
          </button>

          <button
            type="button"
            className={navClass(location.pathname.startsWith("/chat"))}
            aria-label="Messages"
            aria-current={location.pathname.startsWith("/chat") ? "page" : undefined}
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
            className={navClass(location.pathname === "/activity")}
            aria-label="Notifications"
            aria-current={location.pathname === "/activity" ? "page" : undefined}
            onClick={() =>
              navigate("/activity")
            }
          >
            <div className={styles.iconWrapper}>
              <Heart className={styles.icon} />

              {notificationUnreadCount > 0 && (
                <span className={styles.navBadge}>
                  {notificationUnreadCount > 99
                    ? "99+"
                    : notificationUnreadCount}
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
            aria-label="Create post"
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
            className={navClass(location.pathname === "/profile" || location.pathname.startsWith("/user/"))}
            aria-label="Profile"
            aria-current={location.pathname === "/profile" || location.pathname.startsWith("/user/") ? "page" : undefined}
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
        <div className={styles.modalOverlay} onMouseDown={() => setIsCreateOpen(false)}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-label="Create a post"
            onMouseDown={(event) => event.stopPropagation()}
          >
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
              onPostCreated={(createdPost) => {
                setIsCreateOpen(false);

                window.dispatchEvent(
                  new CustomEvent("postCreated", {
                    detail: createdPost,
                  })
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

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Search, Heart, MessageCircle, SquarePlus, X } from "lucide-react";
import styles from "./Header.module.css";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../ui/avatar/Avatar";
import CreatePost from "./CreatePost";

const Header = ({ scrollY }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { receivedRequests } = useChat();
  const pendingRequestCount = Array.isArray(receivedRequests)
    ? receivedRequests.filter(
      (request) => request.status === "pending"
    ).length
    : 0;
  const openChat = () => {
    navigate("/chat");
  };
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // 🚀 Scroll to Hide State
  const [showTopHeader, setShowTopHeader] = useState(true);

  const lastScrollY = useRef(0);

  useEffect(() => {
    if (Math.abs(scrollY - lastScrollY.current) < 8) return;

    if (scrollY > lastScrollY.current && scrollY > 60) {
      setShowTopHeader(false);
    } else {
      setShowTopHeader(true);
    }

    lastScrollY.current = scrollY;
  }, [scrollY]);

  return (
    <>
      {/* 📱 MOBILE TOP HEADER */}
      <div className={`${styles.mobileTopHeader} ${!showTopHeader ? styles.hideTopHeader : ""}`}>
        {/* Top Left Create Button */}
        <button className={styles.topHeaderBtn} onClick={() => setIsCreateOpen(true)}>
          <SquarePlus size={26} color="var(--text-primary)" />
        </button>

        {/* Center Logo */}
        <div className={styles.topHeaderLogo} onClick={() => navigate("/home")}>
          PingMe
        </div>

        {/* Top Right Profile Icon */}
        <button className={styles.topHeaderBtn} onClick={() => navigate("/profile")}>
          <Avatar
            src={user?.profilePic || "https://ui-avatars.com/api/?name=User"}
            alt="Profile"
            className={styles.topHeaderProfileIcon}
          />
        </button>
      </div>

      {/* 💻 MAIN SIDEBAR / BOTTOM NAV */}
      <nav className={styles.sidebar}>
        <div className={styles.logo} onClick={() => navigate("/home")}>
          PingMe
        </div>

        <div className={styles.navLinks}>
          <button className={styles.navItem} onClick={() => navigate("/home")}>
            <Home className={styles.icon} />
            <span className={styles.text}>Home</span>
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
            className={styles.navItem}
            onClick={openChat}
          >
            <MessageCircle className={styles.icon} />
            <span className={styles.text}>Messages</span>
          </button>

          <button
            type="button"
            className={styles.navItem}
            onClick={() => navigate("/activity")}
          >
            <div className={styles.iconWrapper}>
              <Heart className={styles.icon} />

              {pendingRequestCount > 0 && (
                <span className={styles.badge}>
                  {pendingRequestCount}
                </span>
              )}
            </div>

            <span className={styles.text}>
              Notifications
            </span>
          </button>

          {/* Desktop Only Buttons */}
          <button className={`${styles.navItem} ${styles.desktopOnly}`} onClick={() => setIsCreateOpen(true)}>
            <SquarePlus className={styles.icon} />
            <span className={styles.text}>Create</span>
          </button>

          <button className={`${styles.navItem} ${styles.desktopOnly}`} onClick={() => navigate("/profile")}>
            <Avatar
              src={user?.profilePic || "https://ui-avatars.com/api/?name=User"}
              alt="Profile"
              className={styles.profileIcon}
            />
            <span className={styles.text}>Profile</span>
          </button>
        </div>
      </nav>

      {/* 📝 CREATE POST MODAL */}
      {isCreateOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeModalBtn} onClick={() => setIsCreateOpen(false)}>
              <X size={28} />
            </button>
            <CreatePost onPostCreated={() => { setIsCreateOpen(false); window.dispatchEvent(new Event("postCreated")); }} />
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
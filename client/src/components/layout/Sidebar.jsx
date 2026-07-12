import { useState } from "react";
import { useNavigate } from "react-router-dom";
// 🚀 Kothaga SquarePlus inka X (close) icons theeskuntunnam
import { Home, Search, Heart, MessageCircle, SquarePlus, X } from "lucide-react";
import styles from "./Sidebar.module.css";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../ui/avatar/Avatar";
import { searchUsers } from "../../services/authService";
import SearchResults from "../search/SearchResults";
// 🚀 CreatePost Component ni import chesthunnam
import CreatePost from "./CreatePost";

const Sidebar = () => {
  const { user } = useAuth();
  const { receivedRequests } = useChat();
  const navigate = useNavigate();

  const openChat = () => {
    console.log("clicked");
    alert("clicked");
    navigate("/chat");
  };

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // 🚀 Modal open/close state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleSearch = async (e) => {
    /* ... (Nee paatha search logic same alage unchu) ... */
  };

  return (
    <>
      <nav className={styles.sidebar}>
        <div className={styles.logo} onClick={() => navigate("/home")}>
          PingMe
        </div>

        <div className={styles.navLinks}>
          <button className={styles.navItem} onClick={() => navigate("/home")}>
            <Home className={styles.icon} />
            <span className={styles.text}>Home</span>
          </button>

          <div className={styles.searchContainer}>
            {/* ... (Nee paatha searchBox code) ... */}
          </div>

          <button
            className={styles.navItem}
            onClick={openChat}
          >
            <MessageCircle className={styles.icon} />
            <span className={styles.text}>Messages</span>
          </button>

          <button
            className={styles.navItem}
            onClick={() => navigate("/activity")}
          >
            <div
              style={{
                position: "relative",
              }}
            >
              <Heart className={styles.icon} />

              {receivedRequests.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-8px",
                    background: "red",
                    color: "white",
                    borderRadius: "50%",
                    minWidth: "18px",
                    height: "18px",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                  }}
                >
                  {receivedRequests.length}
                </span>
              )}
            </div>

            <span className={styles.text}>
              Activity
            </span>
          </button>

          {/* 🚀 Kotha Create Post Button */}
          <button className={styles.navItem} onClick={() => setIsCreateOpen(true)}>
            <SquarePlus className={styles.icon} />
            <span className={styles.text}>Create</span>
          </button>

          <button className={styles.navItem} onClick={() => navigate("/profile")}>
            <Avatar
              src={user?.profilePic || "https://ui-avatars.com/api/?name=User"}
              alt="Profile"
              className={styles.profileIcon}
            />
            <span className={styles.text}>Profile</span>
          </button>
        </div>
      </nav>

      {/* 🚀 Modal Overlay Magic */}
      {isCreateOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button
              className={styles.closeModalBtn}
              onClick={() => setIsCreateOpen(false)}
            >
              <X size={28} />
            </button>

            {/* CreatePost render chesthunnam. Post aipogane modal close ayyi event fire avthundi */}
            <CreatePost
              onPostCreated={() => {
                setIsCreateOpen(false);
                window.dispatchEvent(new Event("postCreated"));
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
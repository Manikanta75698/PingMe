import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Search, Heart, MessageCircle, SquarePlus, X } from "lucide-react";
import styles from "./Header.module.css";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/avatar/Avatar";
import { searchUsers } from "../../services/authService";
import SearchResults from "../search/SearchResults";
import CreatePost from "./CreatePost"; 

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // 🚀 Scroll to Hide State
  const [showTopHeader, setShowTopHeader] = useState(true);
  

  const lastScrollY = useRef(0);

  useEffect(() => {
    const container = document.getElementById('main-container') || window;

    const handleScroll = () => {
      const currentScrollY = container === window ? window.scrollY : container.scrollTop;

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowTopHeader(false);
      } else if (currentScrollY < lastScrollY.current) {
        setShowTopHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };

    if (container === window) {
       window.addEventListener("scroll", handleScroll, { passive: true });
    } else {
       container.addEventListener("scroll", handleScroll, { passive: true });
    }
    
    return () => {
       if (container === window) window.removeEventListener("scroll", handleScroll);
       else container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);
    
    if (!value.trim()) {
      setResults([]);
      return;
    }
    
    try {
      const response = await searchUsers(value);
      if (response.success) {
        setResults(response.users);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error(error);
      setResults([]);
    }
  };

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

          <div className={styles.searchContainer}>
            <div className={styles.searchBox}>
              <Search className={styles.icon} />
              <input
                type="text"
                placeholder="Search users..."
                value={query}
                onChange={handleSearch}
                className={styles.searchInput}
              />
            </div>
            {query && (
              <div className={styles.searchResultsWrapper}>
                <SearchResults users={results} onClose={() => { setQuery(""); setResults([]); }} />
              </div>
            )}
          </div>

          <button className={styles.navItem}>
            <MessageCircle className={styles.icon} />
            <span className={styles.text}>Messages</span>
          </button>

          <button className={styles.navItem}>
            <Heart className={styles.icon} />
            <span className={styles.text}>Notifications</span>
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
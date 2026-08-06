import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Compass,
  HandHeart,
  Heart,
  Home,
  MessageCircle,
  Search,
  SquarePlus,
} from "lucide-react";

import styles from "./Header.module.css";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../ui/avatar/Avatar";

const Header = ({
  scrollY = 0,
}) => {
  const { user } = useAuth();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(
      `${path}/`
    );

  const {
    notificationUnreadCount,
    chatSummaries,
    loadChatSummaries,
    loadNotifications,
  } = useChat();

  const totalUnreadMessages =
    Array.isArray(chatSummaries)
      ? chatSummaries.reduce(
        (total, chat) =>
          total +
          (Number(
            chat?.unreadCount
          ) || 0),
        0
      )
      : 0;

  const [
    showTopHeader,
    setShowTopHeader,
  ] = useState(true);

  const lastScrollY =
    useRef(0);

  useEffect(() => {
    Promise.all([
      loadChatSummaries(),
      loadNotifications(),
    ]).catch((error) => {
      console.error(
        "HEADER DATA LOAD ERROR:",
        error
      );
    });
  }, [
    loadChatSummaries,
    loadNotifications,
  ]);

  useEffect(() => {
    if (
      Math.abs(
        scrollY -
        lastScrollY.current
      ) < 8
    ) {
      return;
    }

    if (
      scrollY >
      lastScrollY.current &&
      scrollY > 60
    ) {
      setShowTopHeader(false);
    } else {
      setShowTopHeader(true);
    }

    lastScrollY.current =
      scrollY;
  }, [scrollY]);

  const openChat = () => {
    navigate("/chat");
  };

  return (
    <>
      {/* MOBILE TOP HEADER */}
      <div
        className={`${styles.mobileTopHeader} ${!showTopHeader
            ? styles.hideTopHeader
            : ""
          }`}
      >
        <button
          type="button"
          className={
            styles.topHeaderBtn
          }
          onClick={() =>
            navigate("/create")
          }
          aria-label="Create post"
        >
          <SquarePlus
            size={26}
            color="var(--text-primary)"
          />
        </button>

        <button
          type="button"
          className={
            styles.topHeaderLogo
          }
          onClick={() =>
            navigate("/home")
          }
          aria-label="Open home"
        >
          PingMe
        </button>

        <button
          type="button"
          className={
            styles.topHeaderBtn
          }
          onClick={() =>
            navigate("/profile")
          }
          aria-label="Open profile"
        >
          <Avatar
            src={
              user?.profilePic ||
              "https://ui-avatars.com/api/?name=User"
            }
            alt="Profile"
            className={
              styles.topHeaderProfileIcon
            }
          />
        </button>
      </div>

      {/* DESKTOP SIDEBAR / MOBILE BOTTOM NAV */}
      <nav
        className={
          styles.sidebar
        }
      >
        <button
          type="button"
          className={
            styles.logo
          }
          onClick={() =>
            navigate("/home")
          }
          aria-label="Open home"
        >
          PingMe
        </button>

        <div
          className={
            styles.navLinks
          }
        >
          <button
            type="button"
            className={`${styles.navItem} ${isActive("/home")
                ? styles.active
                : ""
              }`}
            onClick={() =>
              navigate("/home")
            }
          >
            <Home
              className={
                styles.icon
              }
            />

            <span
              className={
                styles.text
              }
            >
              Home
            </span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${isActive("/search")
                ? styles.active
                : ""
              }`}
            onClick={() =>
              navigate("/search")
            }
          >
            <Search
              className={
                styles.icon
              }
            />

            <span
              className={
                styles.text
              }
            >
              Search
            </span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${isActive("/explore")
                ? styles.active
                : ""
              }`}
            onClick={() =>
              navigate("/explore")
            }
          >
            <Compass
              className={
                styles.icon
              }
            />

            <span
              className={
                styles.text
              }
            >
              Explore
            </span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${isActive("/help")
                ? styles.active
                : ""
              }`}
            onClick={() =>
              navigate("/help")
            }
          >
            <HandHeart
              className={
                styles.icon
              }
            />

            <span
              className={
                styles.text
              }
            >
              Nearby Help
            </span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${isActive("/chat")
                ? styles.active
                : ""
              }`}
            onClick={openChat}
          >
            <div
              className={
                styles.iconWrapper
              }
            >
              <MessageCircle
                className={
                  styles.icon
                }
              />

              {totalUnreadMessages >
                0 && (
                  <span
                    className={
                      styles.badge
                    }
                  >
                    {totalUnreadMessages >
                      99
                      ? "99+"
                      : totalUnreadMessages}
                  </span>
                )}
            </div>

            <span
              className={
                styles.text
              }
            >
              Messages
            </span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${isActive("/activity")
                ? styles.active
                : ""
              }`}
            onClick={() =>
              navigate("/activity")
            }
          >
            <div
              className={
                styles.iconWrapper
              }
            >
              <Heart
                className={
                  styles.icon
                }
              />

              {notificationUnreadCount >
                0 && (
                  <span
                    className={
                      styles.badge
                    }
                  >
                    {notificationUnreadCount >
                      99
                      ? "99+"
                      : notificationUnreadCount}
                  </span>
                )}
            </div>

            <span
              className={
                styles.text
              }
            >
              Notifications
            </span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${styles.desktopOnly} ${isActive("/create")
                ? styles.active
                : ""
              }`}
            onClick={() =>
              navigate("/create")
            }
          >
            <SquarePlus
              className={
                styles.icon
              }
            />

            <span
              className={
                styles.text
              }
            >
              Create
            </span>
          </button>

          <button
            type="button"
            className={`${styles.navItem} ${styles.desktopOnly} ${isActive("/profile")
                ? styles.active
                : ""
              }`}
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
              className={
                styles.profileIcon
              }
            />

            <span
              className={
                styles.text
              }
            >
              Profile
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Header;
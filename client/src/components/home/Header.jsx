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

const NAV_ITEMS = [
  {
    label: "Home",
    path: "/home",
    icon: Home,
  },
  {
    label: "Search",
    path: "/search",
    icon: Search,
  },
  {
    label: "Explore",
    path: "/explore",
    icon: Compass,
  },
  {
    label: "Nearby Help",
    path: "/help",
    icon: HandHeart,
  },
  {
    label: "Messages",
    path: "/chat",
    icon: MessageCircle,
    badgeType: "messages",
  },
  {
    label: "Notifications",
    path: "/activity",
    icon: Heart,
    badgeType: "notifications",
  },
];

const Header = ({
  scrollY = 0,
}) => {
  const { user } = useAuth();

  const {
    notificationUnreadCount,
    chatSummaries,
    loadChatSummaries,
    loadNotifications,
  } = useChat();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    showTopHeader,
    setShowTopHeader,
  ] = useState(true);

  const lastScrollY =
    useRef(0);

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

  const profileImage =
    user?.profilePic ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user?.name ||
      user?.username ||
      "User"
    )}&background=2563eb&color=ffffff`;

  const isActive = (path) => {
    if (path === "/home") {
      return (
        location.pathname ===
        "/home"
      );
    }

    return (
      location.pathname ===
      path ||
      location.pathname.startsWith(
        `${path}/`
      )
    );
  };

  useEffect(() => {
    Promise.allSettled([
      loadChatSummaries(),
      loadNotifications(),
    ]).then((results) => {
      results.forEach((result) => {
        if (
          result.status ===
          "rejected"
        ) {
          console.error(
            "HEADER DATA LOAD ERROR:",
            result.reason
          );
        }
      });
    });
  }, [
    loadChatSummaries,
    loadNotifications,
  ]);

  useEffect(() => {
    const previousScroll =
      lastScrollY.current;

    if (
      Math.abs(
        scrollY -
        previousScroll
      ) < 8
    ) {
      return;
    }

    const shouldHide =
      scrollY >
      previousScroll &&
      scrollY > 72;

    setShowTopHeader(
      !shouldHide
    );

    lastScrollY.current =
      scrollY;
  }, [scrollY]);

  const getBadgeValue = (
    badgeType
  ) => {
    if (
      badgeType ===
      "messages"
    ) {
      return totalUnreadMessages;
    }

    if (
      badgeType ===
      "notifications"
    ) {
      return Number(
        notificationUnreadCount
      ) || 0;
    }

    return 0;
  };

  const openProfile = () => {
    navigate("/profile");
  };

  return (
    <>
      <header
        className={`${styles.mobileTopHeader} ${!showTopHeader
            ? styles.hideTopHeader
            : ""
          }`}
      >
        <button
          type="button"
          className={
            styles.topHeaderAction
          }
          onClick={() =>
            navigate("/create")
          }
          aria-label="Create post"
        >
          <SquarePlus
            size={23}
            strokeWidth={2.1}
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
            styles.topHeaderAvatarButton
          }
          onClick={
            openProfile
          }
          aria-label="Open profile"
        >
          <Avatar
            src={
              profileImage
            }
            alt={
              user?.name ||
              "Profile"
            }
            className={
              styles.topHeaderProfileIcon
            }
          />
        </button>
      </header>

      <nav
        className={
          styles.sidebar
        }
        aria-label="Primary navigation"
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
          <span
            className={
              styles.logoMark
            }
          >
            P
          </span>

          <span
            className={
              styles.logoText
            }
          >
            PingMe
          </span>
        </button>

        <div
          className={
            styles.navLinks
          }
        >
          {NAV_ITEMS.map(
            ({
              label,
              path,
              icon: Icon,
              badgeType,
            }) => {
              const badgeValue =
                getBadgeValue(
                  badgeType
                );

              return (
                <button
                  key={path}
                  type="button"
                  className={`${styles.navItem} ${isActive(
                    path
                  )
                      ? styles.active
                      : ""
                    }`}
                  onClick={() =>
                    navigate(
                      path
                    )
                  }
                  aria-current={
                    isActive(
                      path
                    )
                      ? "page"
                      : undefined
                  }
                  aria-label={
                    label
                  }
                >
                  <span
                    className={
                      styles.iconShell
                    }
                  >
                    <Icon
                      className={
                        styles.icon
                      }
                      strokeWidth={
                        2
                      }
                    />

                    {badgeValue >
                      0 && (
                        <span
                          className={
                            styles.badge
                          }
                        >
                          {badgeValue >
                            99
                            ? "99+"
                            : badgeValue}
                        </span>
                      )}
                  </span>

                  <span
                    className={
                      styles.text
                    }
                  >
                    {label}
                  </span>
                </button>
              );
            }
          )}

          <button
            type="button"
            className={`${styles.navItem} ${styles.desktopOnly} ${isActive(
              "/create"
            )
                ? styles.active
                : ""
              }`}
            onClick={() =>
              navigate("/create")
            }
          >
            <span
              className={
                styles.iconShell
              }
            >
              <SquarePlus
                className={
                  styles.icon
                }
              />
            </span>

            <span
              className={
                styles.text
              }
            >
              Create
            </span>
          </button>
        </div>

        <button
          type="button"
          className={`${styles.profileNavItem} ${styles.desktopOnly} ${isActive(
            "/profile"
          )
              ? styles.profileNavActive
              : ""
            }`}
          onClick={
            openProfile
          }
        >
          <Avatar
            src={
              profileImage
            }
            alt={
              user?.name ||
              "Profile"
            }
            className={
              styles.profileIcon
            }
          />

          <span
            className={
              styles.profileText
            }
          >
            <strong>
              {user?.name ||
                user?.username ||
                "Profile"}
            </strong>

            <small>
              {user?.username
                ? `@${user.username.replace(
                  /^@/,
                  ""
                )}`
                : "View profile"}
            </small>
          </span>
        </button>
      </nav>
    </>
  );
};

export default Header;
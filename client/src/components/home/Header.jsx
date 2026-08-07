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
  SquarePlus,
} from "lucide-react";

import styles from "./Header.module.css";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  useChat,
} from "../../context/ChatContext";

import Avatar from "../ui/avatar/Avatar";

/* =====================================
   DESKTOP NAVIGATION
===================================== */

const DESKTOP_NAV_ITEMS = [
  {
    label: "Home",
    path: "/home",
    icon: Home,
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

/* =====================================
   MOBILE BOTTOM NAVIGATION
===================================== */

const MOBILE_NAV_ITEMS = [
  {
    label: "Home",
    path: "/home",
    icon: Home,
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
    label: "Notifications",
    path: "/activity",
    icon: Heart,
    badgeType: "notifications",
  },
];

const Header = () => {
  const {
    user,
  } = useAuth();

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
    user?.avatar ||
    user?.photoURL ||
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
      return (
        Number(
          notificationUnreadCount
        ) || 0
      );
    }

    return 0;
  };

  useEffect(() => {
    Promise.allSettled([
      loadChatSummaries(),
      loadNotifications(),
    ]).then((results) => {
      results.forEach(
        (result) => {
          if (
            result.status ===
            "rejected"
          ) {
            console.error(
              "HEADER DATA LOAD ERROR:",
              result.reason
            );
          }
        }
      );
    });
  }, [
    loadChatSummaries,
    loadNotifications,
  ]);

  useEffect(() => {
    const headerElement =
      document.querySelector(
        `.${styles.mobileTopHeader}`
      );

    const getScrollableParent = (
      element
    ) => {
      let parent =
        element?.parentElement;

      while (
        parent &&
        parent !== document.body
      ) {
        const style =
          window.getComputedStyle(
            parent
          );

        const overflowY =
          style.overflowY;

        if (
          (
            overflowY === "auto" ||
            overflowY === "scroll"
          ) &&
          parent.scrollHeight >
          parent.clientHeight
        ) {
          return parent;
        }

        parent =
          parent.parentElement;
      }

      return window;
    };

    const scrollTarget =
      getScrollableParent(
        headerElement
      );

    const getScrollY = () =>
      scrollTarget === window
        ? window.scrollY ||
        document.documentElement
          .scrollTop ||
        0
        : scrollTarget.scrollTop;

    lastScrollY.current =
      getScrollY();

    const handleScroll = () => {
      const currentScrollY =
        getScrollY();

      const previousScrollY =
        lastScrollY.current;

      if (
        currentScrollY <= 12
      ) {
        setShowTopHeader(true);

        lastScrollY.current =
          currentScrollY;

        return;
      }

      if (
        Math.abs(
          currentScrollY -
          previousScrollY
        ) < 5
      ) {
        return;
      }

      const scrollingDown =
        currentScrollY >
        previousScrollY;

      if (
        scrollingDown &&
        currentScrollY > 72
      ) {
        setShowTopHeader(false);
      } else if (!scrollingDown) {
        setShowTopHeader(true);
      }

      lastScrollY.current =
        currentScrollY;
    };

    scrollTarget.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      scrollTarget.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  const openProfile = () => {
    navigate("/profile");
  };

  const renderDesktopNavItem =
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

      const active =
        isActive(path);

      return (
        <button
          key={path}
          type="button"
          className={`${styles.navItem} ${active
            ? styles.active
            : ""
            }`}
          onClick={() =>
            navigate(path)
          }
          aria-current={
            active
              ? "page"
              : undefined
          }
          aria-label={label}
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
              strokeWidth={2}
              aria-hidden="true"
            />

            {badgeValue >
              0 && (
                <span
                  className={
                    styles.badge
                  }
                >
                  {badgeValue > 99
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
    };

  const renderMobileNavItem =
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

      const active =
        isActive(path);

      return (
        <button
          key={path}
          type="button"
          className={`${styles.mobileNavItem} ${active
            ? styles.mobileNavActive
            : ""
            }`}
          onClick={() =>
            navigate(path)
          }
          aria-current={
            active
              ? "page"
              : undefined
          }
          aria-label={label}
        >
          <span
            className={
              styles.mobileIconShell
            }
          >
            <Icon
              className={
                styles.mobileIcon
              }
              strokeWidth={2}
              aria-hidden="true"
            />

            {badgeValue >
              0 && (
                <span
                  className={
                    styles.mobileBadge
                  }
                >
                  {badgeValue > 99
                    ? "99+"
                    : badgeValue}
                </span>
              )}
          </span>
        </button>
      );
    };

  return (
    <>
      {/* MOBILE TOP HEADER */}

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
            size={22}
            strokeWidth={2.1}
            aria-hidden="true"
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
          className={`${styles.topHeaderChatButton} ${isActive("/chat")
            ? styles.topHeaderChatActive
            : ""
            }`}
          onClick={() =>
            navigate("/chat")
          }
          aria-label={
            totalUnreadMessages >
              0
              ? `Open messages, ${totalUnreadMessages} unread`
              : "Open messages"
          }
        >
          <MessageCircle
            size={22}
            strokeWidth={2.1}
            aria-hidden="true"
          />

          {totalUnreadMessages >
            0 && (
              <span
                className={
                  styles.topHeaderBadge
                }
              >
                {totalUnreadMessages >
                  99
                  ? "99+"
                  : totalUnreadMessages}
              </span>
            )}
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}

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
          {DESKTOP_NAV_ITEMS.map(
            renderDesktopNavItem
          )}

          <button
            type="button"
            className={`${styles.navItem} ${isActive("/create")
              ? styles.active
              : ""
              }`}
            onClick={() =>
              navigate("/create")
            }
            aria-current={
              isActive("/create")
                ? "page"
                : undefined
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
                strokeWidth={2}
                aria-hidden="true"
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
          className={`${styles.profileNavItem} ${isActive("/profile")
            ? styles.profileNavActive
            : ""
            }`}
          onClick={
            openProfile
          }
        >
          <Avatar
            src={profileImage}
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

      {/* MOBILE BOTTOM NAVIGATION */}

      <nav
        className={
          styles.mobileBottomNav
        }
        aria-label="Mobile navigation"
      >
        <div
          className={
            styles.mobileNavLinks
          }
        >
          {MOBILE_NAV_ITEMS.map(
            renderMobileNavItem
          )}

          <button
            type="button"
            className={`${styles.mobileNavItem} ${isActive("/profile")
              ? styles.mobileNavActive
              : ""
              }`}
            onClick={
              openProfile
            }
            aria-current={
              isActive("/profile")
                ? "page"
                : undefined
            }
            aria-label="Profile"
          >
            <span
              className={
                styles.mobileProfileShell
              }
            >
              <Avatar
                src={profileImage}
                alt={
                  user?.name ||
                  "Profile"
                }
                className={
                  styles.mobileProfileIcon
                }
              />
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Header;
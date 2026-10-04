import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, UsersRound, X } from "lucide-react";
import { createPortal } from "react-dom";

import { getUserFollowList } from "../../services/authService";
import DefaultAvatar from "../../assets/default-avatar.png";
import styles from "./FollowListModal.module.css";

const PAGE_SIZE = 30;

const getStoredUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return String(user?._id || user?.id || "");
  } catch {
    return "";
  }
};

const FollowListModal = ({
  isOpen,
  username,
  initialType = "followers",
  followersCount = 0,
  followingCount = 0,
  onClose,
}) => {
  const [activeType, setActiveType] = useState(initialType);
  const [users, setUsers] = useState([]);
  const usersByTypeRef = useRef({
    followers: { users: null, page: 1, hasMore: false },
    following: { users: null, page: 1, hasMore: false },
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return undefined;

    const requestVersion = ++requestVersionRef.current;
    const cachedList = usersByTypeRef.current[initialType];
    // Opening the dialog is an external prop change; reset its local view to the requested tab.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveType(initialType);
    setUsers(cachedList.users || []);
    setPage(cachedList.page);
    setHasMore(cachedList.hasMore);
    setError("");
    setLoading(cachedList.users === null);

    if (cachedList.users !== null) return undefined;

    getUserFollowList(username, initialType, { page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (requestVersion !== requestVersionRef.current) return;
        setUsers(Array.isArray(result?.users) ? result.users : []);
        const nextUsers = Array.isArray(result?.users) ? result.users : [];
        const nextHasMore = Boolean(result?.pagination?.hasMore);
        usersByTypeRef.current = {
          ...usersByTypeRef.current,
          [initialType]: { users: nextUsers, page: 1, hasMore: nextHasMore },
        };
        setHasMore(nextHasMore);
      })
      .catch((requestError) => {
        if (requestVersion !== requestVersionRef.current) return;
        setError(requestError?.response?.data?.message || "Could not load this list. Try again.");
      })
      .finally(() => {
        if (requestVersion === requestVersionRef.current) setLoading(false);
      });

    return () => {
      requestVersionRef.current += 1;
    };
  }, [isOpen, username, initialType]);

  const switchList = useCallback((type) => {
    if (type === activeType) return;
    setActiveType(type);
    const cachedList = usersByTypeRef.current[type];
    setUsers(cachedList.users || []);
    setPage(cachedList.page);
    setHasMore(cachedList.hasMore);
    setError("");
    setLoading(cachedList.users === null);

    if (cachedList.users !== null) return;

    const requestVersion = ++requestVersionRef.current;
    getUserFollowList(username, type, { page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (requestVersion !== requestVersionRef.current) return;
        setUsers(Array.isArray(result?.users) ? result.users : []);
        const nextUsers = Array.isArray(result?.users) ? result.users : [];
        const nextHasMore = Boolean(result?.pagination?.hasMore);
        usersByTypeRef.current = {
          ...usersByTypeRef.current,
          [type]: { users: nextUsers, page: 1, hasMore: nextHasMore },
        };
        setHasMore(nextHasMore);
      })
      .catch((requestError) => {
        if (requestVersion !== requestVersionRef.current) return;
        setError(requestError?.response?.data?.message || "Could not load this list. Try again.");
      })
      .finally(() => {
        if (requestVersion === requestVersionRef.current) setLoading(false);
      });
  }, [activeType, username]);

  const retryList = () => {
    const requestVersion = ++requestVersionRef.current;
    setError("");
    setLoading(true);
    getUserFollowList(username, activeType, { page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (requestVersion !== requestVersionRef.current) return;
        setUsers(Array.isArray(result?.users) ? result.users : []);
        const nextUsers = Array.isArray(result?.users) ? result.users : [];
        const nextHasMore = Boolean(result?.pagination?.hasMore);
        usersByTypeRef.current = {
          ...usersByTypeRef.current,
          [activeType]: { users: nextUsers, page: 1, hasMore: nextHasMore },
        };
        setHasMore(nextHasMore);
      })
      .catch((requestError) => {
        if (requestVersion === requestVersionRef.current) {
          setError(requestError?.response?.data?.message || "Could not load this list. Try again.");
        }
      })
      .finally(() => {
        if (requestVersion === requestVersionRef.current) setLoading(false);
      });
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    const requestVersion = requestVersionRef.current;
    setLoadingMore(true);
    setError("");

    try {
      const result = await getUserFollowList(username, activeType, {
        page: nextPage,
        limit: PAGE_SIZE,
      });
      if (requestVersion !== requestVersionRef.current) return;
      const nextUsers = Array.isArray(result?.users) ? result.users : [];
      const ids = new Set(users.map((user) => String(user?._id || user?.id || "")));
      const mergedUsers = [...users, ...nextUsers.filter((user) => !ids.has(String(user?._id || user?.id || "")))];
      const nextHasMore = Boolean(result?.pagination?.hasMore);
      setUsers(mergedUsers);
      setPage(nextPage);
      setHasMore(nextHasMore);
      usersByTypeRef.current = {
        ...usersByTypeRef.current,
        [activeType]: { users: mergedUsers, page: nextPage, hasMore: nextHasMore },
      };
    } catch (requestError) {
      if (requestVersion === requestVersionRef.current) {
        setError(requestError?.response?.data?.message || "Could not load more people.");
      }
    } finally {
      if (requestVersion === requestVersionRef.current) setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUserId = getStoredUserId();
  const count = activeType === "followers" ? followersCount : followingCount;
  const title = activeType === "followers" ? "Followers" : "Following";

  return createPortal((
    <div className={styles.backdrop} onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-list-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="follow-list-title">{title}</h2>
            <p>{Number(count || 0).toLocaleString()} people</p>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Close list">
            <X size={20} />
          </button>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Profile connections">
          <button
            type="button"
            role="tab"
            aria-selected={activeType === "followers"}
            className={activeType === "followers" ? styles.activeTab : styles.tab}
            onClick={() => switchList("followers")}
          >
            Followers <span>{Number(followersCount || 0).toLocaleString()}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeType === "following"}
            className={activeType === "following" ? styles.activeTab : styles.tab}
            onClick={() => switchList("following")}
          >
            Following <span>{Number(followingCount || 0).toLocaleString()}</span>
          </button>
        </div>

        <div className={styles.list} aria-live="polite">
          {loading ? (
            <div className={styles.state} role="status">
              <LoaderCircle className={styles.spinner} size={24} />
              <span>Loading {title.toLowerCase()}…</span>
            </div>
          ) : error && users.length === 0 ? (
            <div className={styles.state} role="alert">
              <span>{error}</span>
              <button type="button" className={styles.retryButton} onClick={retryList}>
                Try again
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className={styles.state}>
              <UsersRound size={28} aria-hidden="true" />
              <span>{activeType === "followers" ? "No followers yet" : "Not following anyone yet"}</span>
            </div>
          ) : (
            <>
              {users.map((user) => {
                const userId = String(user?._id || user?.id || "");
                const destination = userId && userId === currentUserId
                  ? "/profile"
                  : `/user/${encodeURIComponent(user?.username || "")}`;

                return (
                  <Link
                    className={styles.userRow}
                    key={userId || user?.username}
                    to={destination}
                    onClick={onClose}
                  >
                    <img
                      className={styles.avatar}
                      src={user?.profilePic || DefaultAvatar}
                      alt=""
                      loading="lazy"
                      onError={(event) => { event.currentTarget.src = DefaultAvatar; }}
                    />
                    <span className={styles.userText}>
                      <strong>{user?.name || "PingMe User"}</strong>
                      <small>@{user?.username || "user"}</small>
                    </span>
                  </Link>
                );
              })}
              {error && <p className={styles.inlineError} role="alert">{error}</p>}
            </>
          )}
        </div>

        {hasMore && !loading && (
          <footer className={styles.footer}>
            <button type="button" className={styles.loadMoreButton} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <LoaderCircle className={styles.spinner} size={16} /> : "Load more"}
            </button>
          </footer>
        )}
      </section>
    </div>
  ), document.body);
};

export default FollowListModal;

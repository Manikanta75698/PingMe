import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";

import DefaultAvatar from "../../assets/default-avatar.png";
import { searchUsers } from "../../services/authService";

import styles from "./Search.module.css";

const Search = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const searchValue = query.trim();

    if (!searchValue) {
      setUsers([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setSearched(true);

        const response = await searchUsers(searchValue);

        const allUsers = Array.isArray(response?.users)
          ? response.users
          : Array.isArray(response?.data?.users)
            ? response.data.users
            : [];

        const normalizedQuery = searchValue
          .toLowerCase()
          .replace(/^@/, "")
          .trim();

        const getSearchScore = (user) => {
          const name = String(user?.name || "").toLowerCase();
          const username = String(user?.username || "").toLowerCase();

          if (username === normalizedQuery) return 1;
          if (name === normalizedQuery) return 2;
          if (username.startsWith(normalizedQuery)) return 3;
          if (name.startsWith(normalizedQuery)) return 4;
          if (username.includes(normalizedQuery)) return 5;
          if (name.includes(normalizedQuery)) return 6;

          return 100;
        };

        const filteredUsers = allUsers
          .filter((user) => {
            const name = String(user?.name || "").toLowerCase();
            const username = String(
              user?.username || ""
            ).toLowerCase();

            return (
              name.includes(normalizedQuery) ||
              username.includes(normalizedQuery)
            );
          })
          .sort(
            (firstUser, secondUser) =>
              getSearchScore(firstUser) -
              getSearchScore(secondUser)
          )
          .slice(0, 20);

        setUsers(filteredUsers);

      } catch (error) {
        console.error(
          "Search users error:",
          error.response?.data || error.message
        );

        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const openUserProfile = (user) => {
    if (!user?.username) return;

    navigate(`/user/${user.username}`);
  };

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </button>

          <h1>Search</h1>
        </header>

        <div className={styles.searchBox}>
          <SearchIcon
            size={20}
            className={styles.searchIcon}
          />

          <input
            type="search"
            placeholder="Search by name or username..."
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            className={styles.searchInput}
            autoFocus
          />
        </div>

        <div className={styles.results}>
          {loading && (
            <div className={styles.message}>
              Searching users...
            </div>
          )}

          {!loading && !query.trim() && (
            <div className={styles.empty}>
              <SearchIcon size={34} />

              <h2>Find people</h2>

              <p>
                Search for people using their name or
                username.
              </p>
            </div>
          )}

          {!loading &&
            searched &&
            query.trim() &&
            users.length === 0 && (
              <div className={styles.empty}>
                <h2>No users found</h2>

                <p>
                  Try searching with another name or
                  username.
                </p>
              </div>
            )}

          {!loading &&
            users.map((user) => {
              const userId = user?._id || user?.id;

              return (
                <button
                  type="button"
                  key={userId}
                  className={styles.userCard}
                  onClick={() =>
                    openUserProfile(user)
                  }
                >
                  <img
                    src={
                      user?.profilePic ||
                      DefaultAvatar
                    }
                    alt={
                      user?.name || "PingMe user"
                    }
                    className={styles.avatar}
                    onError={(event) => {
                      event.currentTarget.src =
                        DefaultAvatar;
                    }}
                  />

                  <div className={styles.userInfo}>
                    <strong>
                      {user?.name || "PingMe User"}
                    </strong>

                    <span>
                      @{user?.username || "user"}
                    </span>

                    {user?.bio && (
                      <p>{user.bio}</p>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </section>
    </main>
  );
};

export default Search;
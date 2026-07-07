import styles from "./Header.module.css";
import Avatar from "../ui/avatar/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { searchUsers } from "../../services/authService";
import SearchResults from "../search/SearchResults";

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
  const value = e.target.value;

  setQuery(value);

  if (!value.trim()) {
    setResults([]);
    return;
  }

  try {
    const response = await searchUsers(value);

    console.log("Search Response:", response);
    
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
    <header className={styles.header}>
      <div className={styles.logo}>
        PingMe
      </div>

      <div className={styles.search}>
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={handleSearch}
        />

        {query && (
          <SearchResults
            users={results}
            onClose={() => {
              setQuery("");
              setResults([]);
            }}
          />
        )}

      </div>

      <div className={styles.right}>

        <button className={styles.icon}>
          ❤️
        </button>

        <button className={styles.icon}>
          💬
        </button>

        <div
          className={styles.profile}
          onClick={() => navigate("/profile")}
        >
          <Avatar
            src={
              user?.profilePic ||
              "https://ui-avatars.com/api/?name=User"
            }
            alt="Profile"
            className={styles.avatar}
          />
        </div>

      </div>
    </header>
  );
};

export default Header;
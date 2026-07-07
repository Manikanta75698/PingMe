import styles from "./SearchResults.module.css";
import { useNavigate } from "react-router-dom";
import DefaultAvatar from "../../assets/default-avatar.png";

const SearchResults = ({ users, onClose }) => {
  const navigate = useNavigate();

  const openProfile = (username) => {
    navigate(`/user/${username}`);

    onClose();
  };

  if (!users.length) {
    return (
      <div className={styles.empty}>
        No users found
      </div>
    );
  }

  return (
    <div className={styles.results}>
      {users.map((user) => (
        <div
          key={user._id}
          className={styles.user}
          onClick={() => openProfile(user.username)}
        >
          <img
            src={user.profilePic || DefaultAvatar}
            alt={user.name}
            onError={(e) => {
              e.target.src = DefaultAvatar;
            }}
          />

          <div>
            <h4>{user.name}</h4>
            <p>@{user.username}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResults;
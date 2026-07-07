import styles from "./Avatar.module.css";
import DefaultAvatar from "../../../assets/default-avatar.png";

const Avatar = ({
  src,
  alt = "Avatar",
  size = "medium",
  online = false,
  story = false,
  onClick,
}) => {
  return (
    <div
      className={`${styles.wrapper} ${
        story ? styles.story : ""
      }`}
      onClick={onClick}
    >
      <img
        src={src || DefaultAvatar}
        alt={alt}
        className={`${styles.avatar} ${styles[size]}`}
        onError={(e) => {
          e.currentTarget.src = DefaultAvatar;
        }}
      />

      {online && (
        <span className={styles.online}></span>
      )}
    </div>
  );
};

export default Avatar;
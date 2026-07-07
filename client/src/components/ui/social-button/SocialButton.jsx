import { FcGoogle } from "react-icons/fc";
import styles from "./SocialButton.module.css";

const SocialButton = ({ children, onClick }) => {
  return (
    <button
      className={styles.socialButton}
      onClick={onClick}
      type="button"
    >
      <FcGoogle size={22} />
      <span>{children}</span>
    </button>
  );
};

export default SocialButton;
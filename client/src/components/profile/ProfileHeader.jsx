import {
  useEffect,
  useState,
} from "react";

import EditProfileModal from "./EditProfileModal";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  getProfile,
} from "../../services/authService";

import styles from "./ProfileHeader.module.css";

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1503264116251-35a269479413?w=1600";

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch (error) {
    console.error(
      "Stored User Parse Error:",
      error
    );

    return null;
  }
};

const ProfileHeader = () => {
  const [user, setUser] = useState(
    getStoredUser
  );

  const [showModal, setShowModal] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================
  // FETCH FRESH PROFILE
  // =========================
  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getProfile();

        if (cancelled) return;

        if (!response?.user) {
          throw new Error(
            "Invalid profile response"
          );
        }

        setUser(response.user);

        // Keep localStorage fresh
        localStorage.setItem(
          "user",
          JSON.stringify(response.user)
        );
      } catch (error) {
        if (cancelled) return;

        console.error(
          "GET PROFILE ERROR:",
          error.response?.data ||
            error.message
        );

        // Keep cached user visible
        // if localStorage user exists
        if (!user) {
          setError(
            error.response?.data?.message ||
              "Unable to load profile"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================
  // PROFILE UPDATED
  // =========================
  const handleProfileUpdated = (
    updatedUser
  ) => {
    if (!updatedUser) return;

    // Preserve postsCount because
    // updateProfile response may not
    // include it
    const mergedUser = {
      ...user,
      ...updatedUser,
      postsCount:
        updatedUser.postsCount ??
        user?.postsCount ??
        0,
    };

    setUser(mergedUser);

    localStorage.setItem(
      "user",
      JSON.stringify(mergedUser)
    );
  };

  // =========================
  // INITIAL LOADING
  // =========================
  if (loading && !user) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.empty}>
          Loading profile...
        </div>
      </div>
    );
  }

  // =========================
  // ERROR WITHOUT CACHE
  // =========================
  if (error && !user) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.empty}>
          {error}
        </div>
      </div>
    );
  }

  // =========================
  // NO USER
  // =========================
  if (!user) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.empty}>
          Unable to load profile.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileCard}>
      {/* =====================
          COVER PHOTO
      ====================== */}
      <div className={styles.cover}>
        <img
          src={
            user.coverPhoto ||
            DEFAULT_COVER
          }
          alt={`${user.name || "User"} cover`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              DEFAULT_COVER;
          }}
        />
      </div>

      {/* =====================
          PROFILE INFO
      ====================== */}
      <div className={styles.profileInfo}>
        <img
          src={
            user.profilePic ||
            DefaultAvatar
          }
          alt={user.name || "User"}
          className={styles.avatar}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              DefaultAvatar;
          }}
        />

        <div className={styles.details}>
          <h2>
            {user.name || "PingMe User"}
          </h2>

          <p>
            @{user.username || "username"}
          </p>

          <p>
            {user.bio ||
              "Welcome to PingMe 🚀"}
          </p>

          {/* =====================
              META
          ====================== */}
          <div className={styles.meta}>
            <span>
              📍{" "}
              {user.location ||
                "Unknown"}
            </span>

            <span>
              🌐{" "}
              {user.website ||
                "pingme.app"}
            </span>
          </div>

          {/* =====================
              STATS
          ====================== */}
          <div className={styles.stats}>
            <div>
              <strong>
                {user.postsCount ?? 0}
              </strong>

              <span>Posts</span>
            </div>

            <div>
              <strong>
                {user.followers?.length ??
                  0}
              </strong>

              <span>Followers</span>
            </div>

            <div>
              <strong>
                {user.following?.length ??
                  0}
              </strong>

              <span>Following</span>
            </div>
          </div>

          {/* =====================
              EDIT PROFILE
          ====================== */}
          <button
            type="button"
            className={styles.editBtn}
            onClick={() =>
              setShowModal(true)
            }
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* =====================
          EDIT PROFILE MODAL
      ====================== */}
      {showModal && (
        <EditProfileModal
          user={user}
          onClose={() =>
            setShowModal(false)
          }
          onUpdated={
            handleProfileUpdated
          }
        />
      )}
    </div>
  );
};

export default ProfileHeader;
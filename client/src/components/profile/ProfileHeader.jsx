import {
  useEffect,
  useState,
  useRef,
} from "react";

import SetPasswordModal from "./SetPasswordModal";

import { Camera, SquarePen } from "lucide-react";

import EditProfileModal from "./EditProfileModal";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  getProfile,
  uploadProfilePicture,
} from "../../services/authService";

import styles from "./ProfileHeader.module.css";

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

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  const fileInputRef = useRef(null);

  const showSetPassword =
    user?.provider === "google" &&
    !user?.hasPassword;

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

  const handleProfilePictureChange = async (
    e
  ) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return alert("Please select an image.");
    }

    if (file.size > 5 * 1024 * 1024) {
      return alert(
        "Image must be below 5MB."
      );
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append(
        "profilePic",
        file
      );

      const response =
        await uploadProfilePicture(
          formData
        );

      const updatedUser = {
        ...user,
        ...response.user,
      };

      setUser(updatedUser);

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      alert(
        "Profile picture updated successfully."
      );

    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
        "Upload failed."
      );

    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
          PROFILE INFO
      ====================== */}
      <div className={styles.profileInfo}>
        <div className={styles.avatarWrapper}>

          <img
            src={
              user.profilePic ||
              DefaultAvatar
            }
            alt={user.name || "Profile"}
            className={styles.avatar}
            onError={(e) => {
              e.currentTarget.src =
                DefaultAvatar;
            }}
          />

          <button
            type="button"
            className={styles.cameraBtn}
            onClick={() =>
              fileInputRef.current.click()
            }
            disabled={uploading}
          >
            {uploading ? "..." : <Camera size={14} />}
          </button>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            hidden
            onChange={
              handleProfilePictureChange
            }
          />

        </div>
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
            onClick={() => setShowModal(true)}
          >
            <SquarePen size={16} />
            <span>Edit Profile</span>
          </button>

          {showSetPassword && (
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => setShowPasswordModal(true)}
            >
              Set Password
            </button>
          )}
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

      {showPasswordModal && (
        <SetPasswordModal
          onClose={() =>
            setShowPasswordModal(false)
          }
          onSuccess={() => {
            const updatedUser = {
              ...user,
              hasPassword: true,
            };

            setUser(updatedUser);

            localStorage.setItem(
              "user",
              JSON.stringify(updatedUser)
            );

            setShowPasswordModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ProfileHeader;
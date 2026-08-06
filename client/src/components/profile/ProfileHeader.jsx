import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  LoaderCircle,
  Settings,
  SquarePen,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import EditProfileModal from "./EditProfileModal";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  getProfile,
  uploadProfilePicture,
} from "../../services/authService";

import {
  useToastContext,
} from "../ui/toast/ToastProvider";

import styles from "./ProfileHeader.module.css";

const MAX_PROFILE_IMAGE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_PROFILE_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

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

const getProfileUser = (
  response
) =>
  response?.user ||
  response?.data?.user ||
  response?.data ||
  null;

const getSafeCount = (
  directCount,
  collection
) => {
  const numericCount =
    Number(directCount);

  if (
    Number.isFinite(numericCount) &&
    numericCount >= 0
  ) {
    return numericCount;
  }

  return Array.isArray(collection)
    ? collection.length
    : 0;
};

const ProfileHeader = () => {
  const navigate =
    useNavigate();

  const toast =
    useToastContext();

  const [
    user,
    setUser,
  ] = useState(getStoredUser);

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const fileInputRef =
    useRef(null);

  const persistUser =
    useCallback(
      (nextUser) => {
        if (!nextUser) {
          return;
        }

        setUser(nextUser);

        try {
          localStorage.setItem(
            "user",
            JSON.stringify(
              nextUser
            )
          );
        } catch (storageError) {
          console.error(
            "Profile Storage Error:",
            storageError
          );
        }
      },
      []
    );

  const fetchProfile =
    useCallback(
      async ({
        showLoading = true,
      } = {}) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          setError("");

          const response =
            await getProfile();

          const freshUser =
            getProfileUser(
              response
            );

          if (!freshUser) {
            throw new Error(
              "Invalid profile response"
            );
          }

          persistUser(
            freshUser
          );
        } catch (fetchError) {
          console.error(
            "GET PROFILE ERROR:",
            fetchError
              ?.response?.data ||
            fetchError?.message
          );

          setUser(
            (currentUser) => {
              if (!currentUser) {
                setError(
                  fetchError
                    ?.response?.data
                    ?.message ||
                  "Unable to load profile"
                );
              }

              return currentUser;
            }
          );
        } finally {
          setLoading(false);
        }
      },
      [persistUser]
    );

  useEffect(() => {
    let cancelled = false;

    const loadProfile =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await getProfile();

          if (cancelled) {
            return;
          }

          const freshUser =
            getProfileUser(
              response
            );

          if (!freshUser) {
            throw new Error(
              "Invalid profile response"
            );
          }

          persistUser(
            freshUser
          );
        } catch (fetchError) {
          if (cancelled) {
            return;
          }

          console.error(
            "GET PROFILE ERROR:",
            fetchError
              ?.response?.data ||
            fetchError?.message
          );

          setUser(
            (currentUser) => {
              if (!currentUser) {
                setError(
                  fetchError
                    ?.response?.data
                    ?.message ||
                  "Unable to load profile"
                );
              }

              return currentUser;
            }
          );
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [persistUser]);

  const handleProfileUpdated =
    useCallback(
      (updatedUser) => {
        if (!updatedUser) {
          return;
        }

        setUser(
          (currentUser) => {
            const mergedUser = {
              ...currentUser,
              ...updatedUser,

              postsCount:
                updatedUser
                  .postsCount ??
                currentUser
                  ?.postsCount ??
                0,
            };

            try {
              localStorage.setItem(
                "user",
                JSON.stringify(
                  mergedUser
                )
              );
            } catch (storageError) {
              console.error(
                "Profile Update Storage Error:",
                storageError
              );
            }

            return mergedUser;
          }
        );
      },
      []
    );

  const handleProfilePictureChange =
    async (event) => {
      const file =
        event.target
          .files?.[0];

      if (!file) {
        return;
      }

      if (
        !ALLOWED_PROFILE_IMAGE_TYPES
          .includes(file.type)
      ) {
        toast.warning(
          "Choose a JPG, PNG or WebP image"
        );

        event.target.value =
          "";

        return;
      }

      if (
        file.size >
        MAX_PROFILE_IMAGE_SIZE
      ) {
        toast.warning(
          "Image must be below 5 MB"
        );

        event.target.value =
          "";

        return;
      }

      try {
        setUploading(true);

        const formData =
          new FormData();

        formData.append(
          "profilePic",
          file
        );

        const response =
          await uploadProfilePicture(
            formData
          );

        const responseUser =
          getProfileUser(
            response
          );

        if (!responseUser) {
          throw new Error(
            "Invalid upload response"
          );
        }

        const updatedUser = {
          ...user,
          ...responseUser,
        };

        persistUser(
          updatedUser
        );

        toast.success(
          "Profile picture updated"
        );

        window.dispatchEvent(
          new CustomEvent(
            "profile:updated",
            {
              detail:
                updatedUser,
            }
          )
        );
      } catch (uploadError) {
        console.error(
          "PROFILE PICTURE UPLOAD ERROR:",
          uploadError
            ?.response?.data ||
          uploadError?.message
        );

        toast.error(
          uploadError
            ?.response?.data
            ?.message ||
          "Unable to upload profile picture"
        );
      } finally {
        setUploading(false);

        if (
          fileInputRef.current
        ) {
          fileInputRef
            .current
            .value = "";
        }
      }
    };

  const openImagePicker = () => {
    if (uploading) {
      return;
    }

    fileInputRef.current
      ?.click();
  };

  if (loading && !user) {
    return (
      <section
        className={
          styles.profileCard
        }
        aria-label="Loading profile"
      >
        <div
          className={
            styles.state
          }
          role="status"
        >
          <LoaderCircle
            className={
              styles.stateSpinner
            }
            aria-hidden="true"
          />

          <strong>
            Loading profile
          </strong>

          <span>
            Getting your latest
            profile information.
          </span>
        </div>
      </section>
    );
  }

  if (error && !user) {
    return (
      <section
        className={
          styles.profileCard
        }
        aria-label="Profile error"
      >
        <div
          className={
            styles.state
          }
          role="alert"
        >
          <strong>
            Unable to load profile
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            className={
              styles.retryButton
            }
            onClick={() => {
              void fetchProfile();
            }}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section
        className={
          styles.profileCard
        }
        aria-label="Profile unavailable"
      >
        <div
          className={
            styles.state
          }
        >
          <strong>
            Profile unavailable
          </strong>

          <span>
            We could not find your
            profile information.
          </span>
        </div>
      </section>
    );
  }

  const postsCount =
    getSafeCount(
      user.postsCount,
      user.posts
    );

  const followersCount =
    getSafeCount(
      user.followersCount,
      user.followers
    );

  const followingCount =
    getSafeCount(
      user.followingCount,
      user.following
    );

  return (
    <section
      className={
        styles.profileCard
      }
      aria-label="Profile overview"
    >
      <button
        type="button"
        className={
          styles.settingsBtn
        }
        onClick={() =>
          navigate("/settings")
        }
        aria-label="Open settings"
        title="Settings"
      >
        <Settings
          size={19}
          aria-hidden="true"
        />
      </button>

      <div
        className={
          styles.profileInfo
        }
      >
        <div
          className={
            styles.avatarColumn
          }
        >
          <div
            className={
              styles.avatarWrapper
            }
          >
            <img
              src={
                user.profilePic ||
                DefaultAvatar
              }
              alt={
                user.name
                  ? `${user.name}'s profile`
                  : "Profile"
              }
              className={
                styles.avatar
              }
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onError={(event) => {
                event.currentTarget
                  .onerror = null;

                event.currentTarget
                  .src =
                  DefaultAvatar;
              }}
            />

            {uploading && (
              <span
                className={
                  styles.uploadOverlay
                }
                aria-hidden="true"
              >
                <LoaderCircle
                  className={
                    styles.uploadSpinner
                  }
                />
              </span>
            )}

            <button
              type="button"
              className={
                styles.cameraBtn
              }
              onClick={
                openImagePicker
              }
              disabled={uploading}
              aria-label={
                uploading
                  ? "Uploading profile picture"
                  : "Change profile picture"
              }
              title="Change profile picture"
            >
              {uploading ? (
                <LoaderCircle
                  size={15}
                  className={
                    styles.uploadSpinner
                  }
                  aria-hidden="true"
                />
              ) : (
                <Camera
                  size={15}
                  aria-hidden="true"
                />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={
                handleProfilePictureChange
              }
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>

          <span
            className={
              styles.avatarHint
            }
          >
            Tap the camera to
            update your photo
          </span>
        </div>

        <div
          className={
            styles.details
          }
        >
          <div
            className={
              styles.identity
            }
          >
            <h1>
              {user.name ||
                "PingMe User"}
            </h1>

            <p>
              @
              {user.username ||
                "username"}
            </p>

            {user.bio && (
              <span
                className={
                  styles.bio
                }
              >
                {user.bio}
              </span>
            )}
          </div>

          <div
            className={
              styles.stats
            }
            aria-label="Profile statistics"
          >
            <div>
              <strong>
                {postsCount}
              </strong>

              <span>Posts</span>
            </div>

            <div>
              <strong>
                {followersCount}
              </strong>

              <span>
                Followers
              </span>
            </div>

            <div>
              <strong>
                {followingCount}
              </strong>

              <span>
                Following
              </span>
            </div>
          </div>

          <div
            className={
              styles.actions
            }
          >
            <button
              type="button"
              className={
                styles.editBtn
              }
              onClick={() =>
                setShowModal(true)
              }
            >
              <SquarePen
                size={16}
                aria-hidden="true"
              />

              <span>
                Edit Profile
              </span>
            </button>
          </div>
        </div>
      </div>

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
    </section>
  );
};

export default ProfileHeader;
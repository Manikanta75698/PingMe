import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import styles from "./UserProfile.module.css";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  getUserProfile,
  followUser,
  unfollowUser,
} from "../../services/authService";

import { sendChatRequest } from "../../services/chatRequestService";


import { useChat } from "../../context/ChatContext";

import {
  getUserPosts,
} from "../../services/postService";

import PostModal from "../../components/posts/PostModal";

// =========================
// SAFE STORED USER
// =========================
const getStoredUser = () => {
  try {
    const stored =
      localStorage.getItem("user");

    return stored
      ? JSON.parse(stored)
      : null;
  } catch (error) {
    console.error(
      "Stored User Parse Error:",
      error
    );

    return null;
  }
};

// =========================
// NORMALIZE ID
// =========================
const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (value?._id) {
    return String(value._id);
  }

  if (value?.id) {
    return String(value.id);
  }

  return String(value);
};


const UserProfile = () => {

  const navigate = useNavigate();

  const {
    sentRequests,
    receivedRequests,
    loadRequests,
  } = useChat();

  const { username } = useParams();

  const [currentUser] =
    useState(getStoredUser);

  const [user, setUser] =
    useState(null);

  const [posts, setPosts] =
    useState([]);

  const [
    isFollowing,
    setIsFollowing,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    followLoading,
    setFollowLoading,
  ] = useState(false);

  const [requestLoading, setRequestLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    selectedPost,
    setSelectedPost,
  ] = useState(null);

  const [requestStatus, setRequestStatus] = useState(null);

  const currentUserId = normalizeId(
    currentUser?.id ||
    currentUser?._id
  );

  const profileUserId = normalizeId(
    user?._id ||
    user?.id
  );

  const isOwnProfile =
    Boolean(currentUserId) &&
    Boolean(profileUserId) &&
    currentUserId === profileUserId;

  const pendingRequest = sentRequests.find(
    (req) =>
      req.receiver?._id === profileUserId &&
      req.status === "pending"
  );

  const chatAccepted =
    sentRequests.find(
      (req) =>
        req.receiver?._id === profileUserId &&
        req.status === "accepted"
    ) ||
    receivedRequests.find(
      (req) =>
        req.sender?._id === profileUserId &&
        req.status === "accepted"
    );

  // =========================
  // FETCH PROFILE + POSTS
  // =========================
  const fetchUser = useCallback(
    async () => {
      if (!username) {
        setError(
          "Invalid username"
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        setUser(null);
        setPosts([]);

        const [
          profileResponse,
          postsResponse,
        ] = await Promise.all([
          getUserProfile(username),
          getUserPosts(username),
        ]);

        const userData =
          profileResponse?.user;

        if (!userData) {
          throw new Error(
            "User not found"
          );
        }

        setUser(userData);

        setPosts(
          Array.isArray(
            postsResponse?.posts
          )
            ? postsResponse.posts
            : []
        );

        const followers =
          Array.isArray(
            userData.followers
          )
            ? userData.followers
            : [];

        const following =
          followers.some(
            (follower) =>
              normalizeId(follower) ===
              currentUserId
          );

        setIsFollowing(following);
      } catch (error) {
        console.error(
          "User Profile Error:",
          error.response?.data ||
          error.message
        );

        setError(
          error.response?.data?.message ||
          error.message ||
          "Unable to load profile"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      username,
      currentUserId,
    ]
  );

  useEffect(() => {
    fetchUser();
  }, [fetchUser, sentRequests]);

  // =========================
  // FOLLOW / UNFOLLOW
  // =========================
  const handleFollow = async () => {
    if (
      followLoading ||
      !profileUserId ||
      !currentUserId ||
      isOwnProfile
    ) {
      return;
    }

    try {
      setFollowLoading(true);

      if (isFollowing) {
        await unfollowUser(
          profileUserId
        );

        setIsFollowing(false);

        setUser((prev) => {
          if (!prev) return prev;

          const followers =
            Array.isArray(
              prev.followers
            )
              ? prev.followers
              : [];

          return {
            ...prev,

            followers:
              followers.filter(
                (follower) =>
                  normalizeId(
                    follower
                  ) !==
                  currentUserId
              ),
          };
        });
      } else {
        await followUser(
          profileUserId
        );

        setIsFollowing(true);

        setUser((prev) => {
          if (!prev) return prev;

          const followers =
            Array.isArray(
              prev.followers
            )
              ? prev.followers
              : [];

          const alreadyExists =
            followers.some(
              (follower) =>
                normalizeId(
                  follower
                ) ===
                currentUserId
            );

          return {
            ...prev,

            followers:
              alreadyExists
                ? followers
                : [
                  ...followers,
                  currentUserId,
                ],
          };
        });
      }
    } catch (error) {
      console.error(
        "Follow Error:",
        error.response?.data ||
        error.message
      );

      alert(
        error.response?.data?.message ||
        "Unable to update follow status"
      );
    } finally {
      setFollowLoading(false);
    }
  };

  // =========================
  // MESSAGE USER
  // =========================

  const handleSendRequest = async () => {
    try {
      setRequestLoading(true);

      const res = await sendChatRequest({
        receiver: profileUserId,
      });

      console.log(res.data);

      await loadRequests();

    } catch (error) {
      console.log("FULL ERROR:", error);

      console.log("BACKEND:", error.response?.data);

      alert(
        error.response?.data?.message ||
        error.message
      );
    } finally {
      setRequestLoading(false);
    }
  };

  const handleMessage = () => {
    if (!profileUserId) return;

    navigate(
      `/chat/${encodeURIComponent(
        profileUserId
      )}`
    );
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className={styles.loading}>
        Loading profile...
      </div>
    );
  }

  // =========================
  // ERROR
  // =========================
  if (error || !user) {
    return (
      <div className={styles.loading}>
        <p>
          {error ||
            "User not found"}
        </p>

        <button
          type="button"
          onClick={fetchUser}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        {/* =====================
          PROFILE HEADER
      ====================== */}
        <div className={styles.header}>
          <img
            src={
              user.profilePic ||
              DefaultAvatar
            }
            alt={user.name || "User"}
            className={styles.avatar}
            onError={(e) => {
              e.currentTarget.onerror =
                null;

              e.currentTarget.src =
                DefaultAvatar;
            }}
          />

          <h2 className={styles.name}>
            {user.name || "User"}
          </h2>

          <p
            className={
              styles.username
            }
          >
            @{user.username || "user"}
          </p>

          <p className={styles.bio}>
            {user.bio || "No bio yet"}
          </p>

          {user.location && (
            <p>
              📍 {user.location}
            </p>
          )}

          {user.website && (
            <p>
              🌐 {user.website}
            </p>
          )}
        </div>

        {/* =====================
          STATS
      ====================== */}
        <div className={styles.stats}>
          <div
            className={
              styles.statItem
            }
          >
            <span>
              {posts.length}
            </span>

            <small>
              Posts
            </small>
          </div>

          <div
            className={
              styles.statItem
            }
          >
            <span>
              {user.followers?.length ||
                0}
            </span>

            <small>
              Followers
            </small>
          </div>

          <div
            className={
              styles.statItem
            }
          >
            <span>
              {user.following?.length ||
                0}
            </span>

            <small>
              Following
            </small>
          </div>
        </div>

        {/* =====================
          ACTIONS
      ====================== */}
        {!isOwnProfile && (
          <div className={styles.actions}>
            <button
              type="button"
              className={
                isFollowing
                  ? styles.followingBtn
                  : styles.followBtn
              }
              onClick={handleFollow}
              disabled={followLoading}
            >
              {followLoading
                ? "Please wait..."
                : isFollowing
                  ? "Following"
                  : "Follow"}
            </button>

            {chatAccepted ? (
              <button
                className={styles.messageBtn}
                onClick={handleMessage}
              >
                Message
              </button>
            ) : pendingRequest ? (
              <button
                className={styles.messageBtn}
                disabled
              >
                Pending
              </button>
            ) : (
              <button
                className={styles.messageBtn}
                onClick={handleSendRequest}
                disabled={requestLoading}
              >
                {requestLoading
                  ? "Sending..."
                  : "Send Request"}
              </button>
            )}
          </div>
        )}

        {/* POSTS GRID */}
        <div className={styles.postsGrid}>
          {posts.length > 0 ? (
            posts.map((post) => (
              <button
                key={post._id}
                type="button"
                className={styles.postButton}
                onClick={() =>
                  setSelectedPost(post)
                }
                aria-label="Open post"
              >
                <img
                  src={post.image}
                  alt={post.caption || "Post"}
                  className={styles.postImage}
                  loading="lazy"
                />
              </button>
            ))
          ) : (
            <p className={styles.empty}>
              No posts yet.
            </p>
          )}
        </div>
      </div>
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() =>
            setSelectedPost(null)
          }
        />
      )}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() =>
            setSelectedPost(null)
          }
        />
      )}
    </>
  );
};

export default UserProfile;
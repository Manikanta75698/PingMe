import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ImageOff,
  LockKeyhole,
} from "lucide-react";

import styles from "./UserProfile.module.css";

import {
  useChat,
} from "../../context/ChatContext";

import UserProfileSkeleton from "../../components/profile/UserProfileSkeleton";
import DefaultAvatar from "../../assets/default-avatar.png";

import {
  getUserProfile,
  followUser,
  unfollowUser,
} from "../../services/authService";

import {
  getUserPosts,
} from "../../services/postService";

import {
  useToastContext,
} from "../../components/ui/toast/ToastProvider";

import PostModal from "../../components/posts/PostModal";

/* =========================
   SAFE STORED USER
========================= */

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

/* =========================
   NORMALIZE ID
========================= */

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

/* =========================
   NORMALIZE API DATA
========================= */

const getResponseData = (response) =>
  response?.data?.data ||
  response?.data ||
  response ||
  {};

const getProfileData = (response) =>
  response?.data?.user ||
  response?.user ||
  null;

const getPostsData = (response) => {
  const posts =
    response?.data?.posts ||
    response?.posts;

  return Array.isArray(posts)
    ? posts
    : [];
};

/* =========================
   USER PROFILE
========================= */

const UserProfile = () => {
  const navigate = useNavigate();

  const {
    setSelectedChat,
  } = useChat();

  const { username } = useParams();

  const toast =
    useToastContext();

  const [currentUser] =
    useState(getStoredUser);

  const [user, setUser] =
    useState(null);

  const [posts, setPosts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    followLoading,
    setFollowLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    selectedPost,
    setSelectedPost,
  ] = useState(null);

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

  const followStatus =
    user?.followStatus ||
    (user?.isFollowing
      ? "following"
      : user?.isRequested
        ? "requested"
        : "none");

  const isFollowing =
    followStatus === "following";

  const isRequested =
    followStatus === "requested";

  const isBlocked =
    Boolean(user?.isBlocked);

  const canViewPrivateContent =
    user?.canViewPrivateContent !== false;

  /* =========================
     FETCH PROFILE
  ========================= */

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

        /*
         * Profile first fetch chestham.
         * Private content permission profile
         * response nundi determine chestham.
         */
        const profileResponse =
          await getUserProfile(username);

        const userData =
          getProfileData(
            profileResponse
          );

        if (!userData) {
          throw new Error(
            "User not found"
          );
        }

        setUser(userData);

        /*
         * Private account ni follow
         * cheyakapothe posts fetch cheyyamu.
         */
        if (
          userData.canViewPrivateContent ===
          false
        ) {
          setPosts([]);
          return;
        }

        try {
          const postsResponse =
            await getUserPosts(
              username
            );

          setPosts(
            getPostsData(
              postsResponse
            )
          );
        } catch (postsError) {
          console.error(
            "User Posts Error:",
            postsError?.response?.data ||
            postsError?.message
          );

          setPosts([]);
        }
      } catch (fetchError) {
        console.error(
          "User Profile Error:",
          fetchError?.response?.data ||
          fetchError?.message
        );

        setError(
          fetchError?.response?.data
            ?.message ||
          fetchError?.message ||
          "Unable to load profile"
        );
      } finally {
        setLoading(false);
      }
    },
    [username]
  );

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleRequestAccepted = async (
      event
    ) => {
      const payload =
        event?.detail || {};

      const updatedProfileUserId =
        normalizeId(
          payload?.userId
        );

      if (
        !updatedProfileUserId ||
        updatedProfileUserId !==
        profileUserId
      ) {
        return;
      }

      setUser((previous) => {
        if (!previous) {
          return previous;
        }

        const wasFollowing =
          previous.followStatus ===
          "following" ||
          previous.isFollowing === true;

        const previousFollowersCount =
          Number(
            previous.followersCount ??
            previous.followers?.length ??
            0
          );

        return {
          ...previous,

          followStatus:
            "following",

          isFollowing: true,
          isRequested: false,
          followRequestId: null,

          canViewPrivateContent:
            true,

          followersCount:
            wasFollowing
              ? previousFollowersCount
              : previousFollowersCount +
              1,
        };
      });

      /*
       * Private account accept ayyaka
       * posts immediate ga load chestham.
       */
      try {
        const postsResponse =
          await getUserPosts(
            username
          );

        setPosts(
          getPostsData(
            postsResponse
          )
        );
      } catch (postsError) {
        console.error(
          "Accepted Follow Posts Error:",
          postsError?.response?.data ||
          postsError?.message
        );
      }
    };

    const handleRequestDeclined = (
      event
    ) => {
      const payload =
        event?.detail || {};

      const updatedProfileUserId =
        normalizeId(
          payload?.userId
        );

      if (
        !updatedProfileUserId ||
        updatedProfileUserId !==
        profileUserId
      ) {
        return;
      }

      setUser((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,

          followStatus: "none",
          isFollowing: false,
          isRequested: false,
          followRequestId: null,

          canViewPrivateContent:
            previous.privateAccount
              ? false
              : true,
        };
      });

      if (user?.privateAccount) {
        setPosts([]);
      }
    };

    const handleSocketReconnect =
      () => {
        void fetchUser();
      };

    window.addEventListener(
      "follow-request:accepted",
      handleRequestAccepted
    );

    window.addEventListener(
      "follow-request:declined",
      handleRequestDeclined
    );

    window.addEventListener(
      "socket:reconnected",
      handleSocketReconnect
    );

    return () => {
      window.removeEventListener(
        "follow-request:accepted",
        handleRequestAccepted
      );

      window.removeEventListener(
        "follow-request:declined",
        handleRequestDeclined
      );

      window.removeEventListener(
        "socket:reconnected",
        handleSocketReconnect
      );
    };
  }, [
    fetchUser,
    profileUserId,
    username,
    user?.privateAccount,
  ]);

  /* =========================
     UPDATE FOLLOW STATE
  ========================= */

  const applyFollowResult = (
    result
  ) => {
    setUser((previous) => {
      if (!previous) {
        return previous;
      }

      const nextStatus =
        result?.followStatus ||
        previous.followStatus ||
        "none";

      const becameFollowing =
        nextStatus === "following" &&
        previous.followStatus !==
        "following";

      const stoppedFollowing =
        nextStatus === "none" &&
        previous.followStatus ===
        "following";

      const previousFollowersCount =
        Number(
          previous.followersCount ??
          previous.followers?.length ??
          0
        );

      let followersCount =
        previousFollowersCount;

      if (becameFollowing) {
        followersCount += 1;
      }

      if (stoppedFollowing) {
        followersCount = Math.max(
          0,
          followersCount - 1
        );
      }

      return {
        ...previous,

        followStatus:
          nextStatus,

        isFollowing:
          nextStatus ===
          "following",

        isRequested:
          nextStatus ===
          "requested",

        followRequestId:
          result?.requestId ??
          (nextStatus ===
            "requested"
            ? previous
              .followRequestId
            : null),

        followersCount,

        /*
         * Public follow or accepted
         * follow request tarvatha private
         * content accessible avuthundi.
         */
        canViewPrivateContent:
          nextStatus ===
            "following"
            ? true
            : previous
              .canViewPrivateContent,
      };
    });
  };

  /* =========================
     FOLLOW / UNFOLLOW
  ========================= */

  const handleFollow = async () => {
    if (
      followLoading ||
      !profileUserId ||
      !currentUserId ||
      isOwnProfile ||
      isBlocked ||
      isRequested
    ) {
      return;
    }

    try {
      setFollowLoading(true);

      if (isFollowing) {
        const response =
          await unfollowUser(
            profileUserId
          );

        const result =
          getResponseData(response);

        applyFollowResult({
          ...result,
          followStatus:
            result?.followStatus ||
            "none",
          isFollowing: false,
          isRequested: false,
          requestId: null,
        });

        /*
         * Private account ayithe unfollow
         * tarvatha posts hide cheyyali.
         */
        if (user?.privateAccount) {
          setPosts([]);
        }

        return;
      }

      const response =
        await followUser(
          profileUserId
        );

      const result =
        getResponseData(response);

      /*
       * Private:
       * followStatus = requested
       *
       * Public:
       * followStatus = following
       */
      applyFollowResult(result);

      if (
        result?.followStatus ===
        "following"
      ) {
        try {
          const postsResponse =
            await getUserPosts(
              username
            );

          setPosts(
            getPostsData(
              postsResponse
            )
          );
        } catch (postsError) {
          console.error(
            "Posts Refresh Error:",
            postsError
              ?.response?.data ||
            postsError?.message
          );
        }
      }
    } catch (followError) {
      console.error(
        "Follow Error:",
        followError?.response?.data ||
        followError?.message
      );

      toast.error(
        followError?.response?.data
          ?.message ||
        "Unable to update follow status"
      );
    } finally {
      setFollowLoading(false);
    }
  };

  /* =========================
     MESSAGE USER
  ========================= */

  const handleMessage = () => {
    if (
      !profileUserId ||
      !user ||
      isBlocked
    ) {
      toast.error(
        "Unable to open chat"
      );

      return;
    }

  
    setSelectedChat(
      user
    );

    navigate(
      `/chat/${encodeURIComponent(
        profileUserId
      )}`
    );
  };

  /* =========================
     FOLLOW BUTTON LABEL
  ========================= */

  const getFollowButtonLabel =
    () => {
      if (followLoading) {
        return "Please wait...";
      }

      if (isRequested) {
        return "Requested";
      }

      if (isFollowing) {
        return "Following";
      }

      if (
        followStatus ===
        "follow-back"
      ) {
        return "Follow Back";
      }

      if (followStatus === "blocked") {
        return "Unavailable";
      }

      return "Follow";
    };

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <UserProfileSkeleton />
    );
  }

  /* =========================
     ERROR
  ========================= */

  if (error || !user) {
    return (
      <div
        className={styles.loading}
      >
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

  const postsCount =
    canViewPrivateContent
      ? Number(
        user.postsCount ??
        posts.length
      )
      : 0;

  const followersCount =
    Number(
      user.followersCount ??
      user.followers?.length ??
      0
    );

  const followingCount =
    Number(
      user.followingCount ??
      user.following?.length ??
      0
    );

  return (
    <>
      <div
        className={styles.container}
      >
        <div
          className={
            styles.profileCard
          }
        >
          {/* PROFILE HEADER */}
          <div
            className={styles.header}
          >
            <img
              src={
                user.profilePic ||
                DefaultAvatar
              }
              alt={
                user.name || "User"
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

            <h1
              className={styles.name}
            >
              {user.name || "User"}
            </h1>

            <p
              className={
                styles.username
              }
            >
              @
              {user.username ||
                "user"}
            </p>

            <p
              className={styles.bio}
            >
              {user.bio ||
                "No bio yet"}
            </p>
          </div>

          {/* STATS */}
          <div
            className={styles.stats}
          >
            <div
              className={
                styles.statItem
              }
            >
              <span>
                {postsCount}
              </span>

              <small>Posts</small>
            </div>

            <div
              className={
                styles.statItem
              }
            >
              <span>
                {followersCount}
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
                {followingCount}
              </span>

              <small>
                Following
              </small>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          {!isOwnProfile && (
            <div
              className={
                styles.actions
              }
            >
              <button
                type="button"
                className={
                  isFollowing ||
                    isRequested
                    ? styles
                      .followingBtn
                    : styles
                      .followBtn
                }
                onClick={
                  handleFollow
                }
                disabled={
                  followLoading ||
                  isRequested ||
                  isBlocked
                }
              >
                {getFollowButtonLabel()}
              </button>

              <button
                type="button"
                className={
                  styles.messageBtn
                }
                onClick={
                  handleMessage
                }
                disabled={isBlocked}
              >
                Message
              </button>
            </div>
          )}
        </div>

        {/* PRIVATE ACCOUNT */}
        {!canViewPrivateContent ? (
          <div
            className={
              styles.emptyPosts
            }
          >
            <LockKeyhole
              size={56}
              strokeWidth={1.5}
              className={
                styles.emptyIcon
              }
            />

            <h3>
              This account is private
            </h3>

            <p>
              Follow this account to
              see their posts.
            </p>
          </div>
        ) : (
          /* POSTS */
          <div
            className={
              styles.postsGrid
            }
          >
            {posts.length > 0 ? (
              posts.map((post) => (
                <button
                  key={post._id}
                  type="button"
                  className={
                    styles.postButton
                  }
                  onClick={() =>
                    setSelectedPost(
                      post
                    )
                  }
                  aria-label="Open post"
                >
                  <img
                    src={post.image}
                    alt={
                      post.caption ||
                      "Post"
                    }
                    className={
                      styles.postImage
                    }
                    loading="lazy"
                  />
                </button>
              ))
            ) : (
              <div
                className={
                  styles.emptyPosts
                }
              >
                <ImageOff
                  size={64}
                  strokeWidth={1.5}
                  className={
                    styles.emptyIcon
                  }
                />

                <h3>
                  No Posts Yet
                </h3>

                <p>
                  This user hasn't
                  shared any posts
                  yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

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
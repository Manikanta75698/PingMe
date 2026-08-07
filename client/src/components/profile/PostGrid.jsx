import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bookmark,
  ImageOff,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import {
  getSavedPosts,
  getUserPosts,
} from "../../services/postService";

import PostModal from "../posts/PostModal";

import styles from "./PostGrid.module.css";

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

const getPostsFromResponse = (
  response
) => {
  const posts =
    response?.data?.posts ||
    response?.posts ||
    response?.data?.data?.posts ||
    response?.data?.data ||
    response?.data;

  return Array.isArray(posts)
    ? posts
    : [];
};

const normalizeId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  return String(
    value?._id ||
    value?.id ||
    ""
  );
};

const getPostImage = (
  post
) =>
  post?.image ||
  post?.imageUrl ||
  post?.media?.url ||
  post?.media?.[0]?.url ||
  "";

const PostGrid = ({
  type = "posts",
}) => {
  const currentUser =
    useMemo(
      getStoredUser,
      []
    );

  const username =
    currentUser?.username || "";

  const [
    posts,
    setPosts,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    selectedPost,
    setSelectedPost,
  ] = useState(null);


  const [
    failedImageIds,
    setFailedImageIds,
  ] = useState(() => new Set());

  const isSavedTab =
    type === "saved";

  const loadPosts =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          let response;

          if (isSavedTab) {
            response =
              await getSavedPosts();
          } else {
            if (!username) {
              setPosts([]);
              return;
            }

            response =
              await getUserPosts(
                username
              );
          }

          const loadedPosts =
            getPostsFromResponse(
              response
            );

          const uniquePosts =
            Array.from(
              new Map(
                loadedPosts.map(
                  (post) => [
                    normalizeId(post),
                    post,
                  ]
                )
              ).values()
            );

          setPosts(uniquePosts);
        } catch (loadError) {
          console.error(
            "POST GRID ERROR:",
            loadError
              ?.response?.data ||
            loadError?.message
          );

          setPosts([]);

          setError(
            loadError
              ?.response?.data
              ?.message ||
            "Unable to load posts"
          );
        } finally {
          setLoading(false);
        }
      },
      [
        isSavedTab,
        username,
      ]
    );

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const handlePostCreated =
      (event) => {
        const newPost =
          event?.detail?.post ||
          event?.detail;

        if (
          !newPost ||
          isSavedTab
        ) {
          return;
        }

        setPosts(
          (currentPosts) => {
            const newPostId =
              normalizeId(newPost);

            const alreadyExists =
              currentPosts.some(
                (post) =>
                  normalizeId(post) ===
                  newPostId
              );

            if (alreadyExists) {
              return currentPosts;
            }

            return [
              newPost,
              ...currentPosts,
            ];
          }
        );
      };

    const handlePostDeleted =
      (event) => {
        const deletedPostId =
          normalizeId(
            event?.detail?.postId ||
            event?.detail?._id ||
            event?.detail
          );

        if (!deletedPostId) {
          return;
        }

        setPosts(
          (currentPosts) =>
            currentPosts.filter(
              (post) =>
                normalizeId(post) !==
                deletedPostId
            )
        );

        setSelectedPost(
          (currentPost) =>
            normalizeId(currentPost) ===
              deletedPostId
              ? null
              : currentPost
        );
      };

    const handleSavedPostsUpdated =
      () => {
        if (isSavedTab) {
          void loadPosts();
        }
      };

    window.addEventListener(
      "post:created",
      handlePostCreated
    );

    window.addEventListener(
      "post:deleted",
      handlePostDeleted
    );

    window.addEventListener(
      "saved-posts:updated",
      handleSavedPostsUpdated
    );

    return () => {
      window.removeEventListener(
        "post:created",
        handlePostCreated
      );

      window.removeEventListener(
        "post:deleted",
        handlePostDeleted
      );

      window.removeEventListener(
        "saved-posts:updated",
        handleSavedPostsUpdated
      );
    };
  }, [
    isSavedTab,
    loadPosts,
  ]);

  const handleImageError = (
    postId
  ) => {
    setFailedImageIds(
      (previous) => {
        const next =
          new Set(previous);

        next.add(postId);

        return next;
      }
    );
  };

  if (loading) {
    return (
      <div
        className={
          styles.skeletonGrid
        }
        aria-label="Loading posts"
        aria-busy="true"
      >
        {Array.from({
          length: 9,
        }).map((_, index) => (
          <div
            key={index}
            className={
              styles.skeletonTile
            }
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          styles.stateCard
        }
        role="alert"
      >
        <div
          className={
            styles.stateIcon
          }
        >
          <ImageOff
            size={24}
            aria-hidden="true"
          />
        </div>

        <h3>
          Unable to load posts
        </h3>

        <p>{error}</p>

        <button
          type="button"
          className={
            styles.retryButton
          }
          onClick={() => {
            void loadPosts();
          }}
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
          />

          <span>Try Again</span>
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div
        className={
          styles.stateCard
        }
      >
        <div
          className={
            styles.stateIcon
          }
        >
          {isSavedTab ? (
            <Bookmark
              size={24}
              aria-hidden="true"
            />
          ) : (
            <ImageOff
              size={24}
              aria-hidden="true"
            />
          )}
        </div>

        <h3>
          {isSavedTab
            ? "No saved posts yet"
            : "No posts yet"}
        </h3>

        <p>
          {isSavedTab
            ? "Posts you save will appear here for quick access."
            : "Your published posts will appear here."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={styles.grid}
        aria-label={
          isSavedTab
            ? "Saved posts"
            : "Your posts"
        }
      >
        {posts.map((post) => {
          const postId =
            normalizeId(post);

          const image =
            getPostImage(post);

          const imageFailed =
            failedImageIds.has(
              postId
            );

          const likesCount =
            Number(
              post?.likesCount ??
              post?.likes?.length ??
              0
            );

          const commentsCount =
            Number(
              post?.commentsCount ??
              post?.comments?.length ??
              0
            );

          return (
            <button
              key={postId}
              type="button"
              className={
                styles.postButton
              }
              onClick={() =>
                setSelectedPost(post)
              }
              aria-label={
                post?.caption
                  ? `Open post: ${post.caption}`
                  : "Open post"
              }
            >
              {image && !imageFailed ? (
                <img
                  src={image}
                  alt={
                    post?.caption ||
                    "Profile post"
                  }
                  className={
                    styles.image
                  }
                  loading="lazy"
                  decoding="async"
                  onError={() =>
                    handleImageError(
                      postId
                    )
                  }
                />
              ) : (
                <span
                  className={
                    styles.imagePlaceholder
                  }
                  aria-hidden="true"
                >
                  <ImageOff
                    size={28}
                  />
                </span>
              )}

              <span
                className={
                  styles.overlay
                }
                aria-hidden="true"
              >
                <span
                  className={
                    styles.metric
                  }
                >
                  <strong>
                    {likesCount}
                  </strong>

                  <small>Likes</small>
                </span>

                <span
                  className={
                    styles.metric
                  }
                >
                  <strong>
                    {commentsCount}
                  </strong>

                  <small>
                    Comments
                  </small>
                </span>
              </span>

              {isSavedTab && (
                <span
                  className={
                    styles.savedBadge
                  }
                  aria-hidden="true"
                >
                  <Bookmark
                    size={14}
                    fill="currentColor"
                  />
                </span>
              )}
            </button>
          );
        })}
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

export default PostGrid;
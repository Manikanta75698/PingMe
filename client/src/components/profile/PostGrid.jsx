import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bookmark,
  ImageOff,
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

// Keep fetched grids alive when React Router unmounts a page.
const postGridCache = new Map();

const getPostGridCacheKey = (username, type) =>
  `${username || "current-user"}:${type}`;

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

  const [postsByType, setPostsByType] = useState(() => ({
    posts: postGridCache.get(getPostGridCacheKey(username, "posts")) ?? null,
    saved: postGridCache.get(getPostGridCacheKey(username, "saved")) ?? null,
  }));
  const [loadingByType, setLoadingByType] = useState(() => ({
    posts: !postGridCache.has(getPostGridCacheKey(username, "posts")),
    saved: !postGridCache.has(getPostGridCacheKey(username, "saved")),
  }));
  const [errorByType, setErrorByType] = useState({ posts: "", saved: "" });

  const [
    selectedPost,
    setSelectedPost,
  ] = useState(null);


  const [
    failedImageIds,
    setFailedImageIds,
  ] = useState(() => new Set());
  const requestedTypesRef = useRef(new Set());

  const isSavedTab =
    type === "saved";
  const activeType = isSavedTab ? "saved" : "posts";
  const posts = postsByType[activeType] || [];
  const loading = loadingByType[activeType];
  const error = errorByType[activeType];

  const loadPosts =
    useCallback(
      async (force = false) => {
        const cacheKey = getPostGridCacheKey(username, activeType);
        if (!force && requestedTypesRef.current.has(cacheKey)) return;
        requestedTypesRef.current.add(cacheKey);
        const hasCachedPosts = postGridCache.has(cacheKey);
        try {
          setLoadingByType((current) => ({ ...current, [activeType]: !hasCachedPosts }));
          setErrorByType((current) => ({ ...current, [activeType]: "" }));

          let response;

          if (isSavedTab) {
            response =
              await getSavedPosts();
          } else {
            if (!username) {
              setPostsByType((current) => ({ ...current, posts: [] }));
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

          postGridCache.set(cacheKey, uniquePosts);
          setPostsByType((current) => ({ ...current, [activeType]: uniquePosts }));
        } catch (loadError) {
          console.error(
            "POST GRID ERROR:",
            loadError
              ?.response?.data ||
            loadError?.message
          );

          if (!hasCachedPosts) {
            setErrorByType((current) => ({
              ...current, [activeType]:
                loadError
                  ?.response?.data
                  ?.message ||
                "Unable to load posts"
            }));
          }
        } finally {
          setLoadingByType((current) => ({ ...current, [activeType]: false }));
        }
      },
      [
        activeType,
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

        setPostsByType(
          (current) => {
            const currentPosts = current.posts || [];
            const newPostId =
              normalizeId(newPost);

            const alreadyExists =
              currentPosts.some(
                (post) =>
                  normalizeId(post) ===
                  newPostId
              );

            if (alreadyExists) {
              return current;
            }

            const nextPosts = [newPost, ...currentPosts];
            postGridCache.set(getPostGridCacheKey(username, "posts"), nextPosts);
            return { ...current, posts: nextPosts };
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

        setPostsByType((current) => {
          const next = Object.fromEntries(
            Object.entries(current).map(([key, list]) => [
              key,
              Array.isArray(list) ? list.filter((post) => normalizeId(post) !== deletedPostId) : list,
            ])
          );
          for (const key of ["posts", "saved"]) {
            if (Array.isArray(next[key])) {
              postGridCache.set(getPostGridCacheKey(username, key), next[key]);
            }
          }
          return next;
        });

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
          void loadPosts(true);
        }
      };

    window.addEventListener(
      "postCreated",
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
        "postCreated",
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
    username,
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
            requestedTypesRef.current.delete(getPostGridCacheKey(username, activeType));
            void loadPosts(true);
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

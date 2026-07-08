import {
  useCallback,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

import {
  getPosts,
} from "../../services/postService";

import PostCard from "./PostCard";

import styles from "./Feed.module.css";

const Feed = forwardRef((props, ref) => {
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================
  // LOAD POSTS
  // =========================
  const loadPosts = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getPosts();

        setPosts(
          Array.isArray(data?.posts)
            ? data.posts
            : []
        );
      } catch (error) {
        console.error(
          "LOAD POSTS ERROR:",
          error.response?.data ||
          error.message
        );

        setError(
          error.response?.data?.message ||
          "Unable to load posts"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // =========================
  // EXPOSE REFRESH TO PARENT
  // =========================
  useImperativeHandle(
    ref,
    () => ({
      refreshFeed: loadPosts,
    }),
    [loadPosts]
  );

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // =========================
  // REMOVE DELETED POST
  // =========================
  const handlePostDeleted = (
    deletedPostId
  ) => {
    if (!deletedPostId) return;

    setPosts((currentPosts) =>
      currentPosts.filter(
        (post) =>
          String(post?._id) !==
          String(deletedPostId)
      )
    );
  };

  // =========================
  // LOADING
  // =========================
  if (loading && posts.length === 0) {
    return (
      <div className={styles.feed}>
        <div className={styles.state}>
          Loading posts...
        </div>
      </div>
    );
  }

  // =========================
  // ERROR
  // =========================
  if (error && posts.length === 0) {
    return (
      <div className={styles.feed}>
        <div className={styles.state}>
          <p>{error}</p>

          <button
            type="button"
            onClick={loadPosts}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // EMPTY
  // =========================
  if (posts.length === 0) {
    return (
      <div className={styles.feed}>
        <div className={styles.state}>
          No posts yet.
        </div>
      </div>
    );
  }

  // =========================
  // FEED
  // =========================
  return (
    <div className={styles.feed}>
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          onDeleted={
            handlePostDeleted
          }
        />
      ))}
    </div>
  );
});

Feed.displayName = "Feed";

export default Feed;
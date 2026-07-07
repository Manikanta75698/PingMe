import {
  useEffect,
  useState,
} from "react";

import {
  getUserPosts,
  getSavedPosts,
} from "../../services/postService";

import PostModal from "../posts/PostModal";

import styles from "./PostGrid.module.css";

const PostGrid = ({ type }) => {
  const [posts, setPosts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    selectedPost,
    setSelectedPost,
  ] = useState(null);

  const currentUser = JSON.parse(
    localStorage.getItem("user")
  );

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);

        let response;

        if (type === "saved") {
          response =
            await getSavedPosts();
        } else {
          if (!currentUser?.username) {
            setPosts([]);
            return;
          }

          response =
            await getUserPosts(
              currentUser.username
            );
        }

        setPosts(
          response?.posts || []
        );
      } catch (error) {
        console.error(
          "Post Grid Error:",
          error
        );

        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [
    type,
    currentUser?.username,
  ]);

  if (loading) {
    return (
      <div className={styles.status}>
        Loading posts...
      </div>
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {posts.length > 0 ? (
          posts.map((post) => (
            <button
              key={post._id}
              type="button"
              className={
                styles.postButton
              }
              onClick={() =>
                setSelectedPost(post)
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
                  styles.image
                }
                loading="lazy"
              />
            </button>
          ))
        ) : (
          <div
            className={styles.status}
          >
            {type === "saved"
              ? "No saved posts yet."
              : "No posts yet."}
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

export default PostGrid;
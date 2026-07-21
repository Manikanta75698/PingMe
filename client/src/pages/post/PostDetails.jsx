import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import PostModal from "../../components/posts/PostModal";

import {
  getPostById,
} from "../../services/postService";

const PostDetails = () => {
  const { postId } =
    useParams();

  const navigate =
    useNavigate();

  const [
    post,
    setPost,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadPost =
    useCallback(
      async () => {
        if (!postId) {
          setError(
            "Invalid post"
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);
          setError("");

          const response =
            await getPostById(
              postId
            );

          setPost(
            response?.post ||
            null
          );
        } catch (loadError) {
          console.error(
            "LOAD POST ERROR:",
            loadError.response
              ?.data ||
            loadError.message
          );

          setError(
            loadError.response
              ?.data?.message ||
            "Unable to load post"
          );
        } finally {
          setLoading(false);
        }
      },
      [postId]
    );

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  const closePost =
    useCallback(() => {
      if (
        window.history.length >
        1
      ) {
        navigate(-1);
      } else {
        navigate(
          "/home",
          {
            replace: true,
          }
        );
      }
    }, [navigate]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          color:
            "var(--text-primary)",
          background:
            "var(--background)",
        }}
      >
        Loading post...
      </div>
    );
  }

  if (
    error ||
    !post
  ) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background:
            "var(--background)",
          color:
            "var(--text-primary)",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <p>
            {error ||
              "Post not found"}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/home",
                {
                  replace: true,
                }
              )
            }
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <PostModal
      post={post}
      onClose={closePost}
    />
  );
};

export default PostDetails;
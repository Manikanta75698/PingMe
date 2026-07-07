import {
  useEffect,
  useState,
} from "react";

import {
  Heart,
  MessageCircle,
  Bookmark,
  X,
  Send,
} from "lucide-react";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  getComments,
  commentPost,
} from "../../services/postService";

import styles from "./PostModal.module.css";

import { useNavigate } from "react-router-dom";

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(
    value?._id ||
    value?.id ||
    ""
  );
};

const getStoredUser = () => {
  try {
    const stored =
      localStorage.getItem("user");

    return stored
      ? JSON.parse(stored)
      : null;
  } catch {
    return null;
  }
};

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs =
    Date.now() - date.getTime();

  if (diffMs < 0) {
    return "now";
  }

  const seconds = Math.floor(
    diffMs / 1000
  );

  if (seconds < 60) {
    return "now";
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(
    days / 7
  );

  if (weeks < 5) {
    return `${weeks}w`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year:
        date.getFullYear() !==
          new Date().getFullYear()
          ? "numeric"
          : undefined,
    }
  );
};


const PostModal = ({
  post,
  onClose,
}) => {

  const navigate = useNavigate();

  const [currentUser] =
    useState(getStoredUser);

  const postUser =
    post?.user || {};

  const postTime = formatRelativeTime(
    post?.createdAt
  );

  const currentUserId =
    normalizeId(
      currentUser?.id ||
      currentUser?._id
    );

  const openUserProfile = (
    targetUser
  ) => {
    const targetUsername =
      targetUser?.username
        ?.trim();

    if (!targetUsername) return;

    const ownUsername =
      currentUser?.username
        ?.trim()
        .toLowerCase();

    onClose();

    if (
      targetUsername.toLowerCase() ===
      ownUsername
    ) {
      navigate("/profile");
      return;
    }

    navigate(
      `/user/${encodeURIComponent(
        targetUsername
      )}`
    );
  };

  const handlePostUserClick = () => {
    openUserProfile(postUser);
  };

  const [isLiked, setIsLiked] =
    useState(() =>
      Array.isArray(post?.likes)
        ? post.likes.some(
          (id) =>
            normalizeId(id) ===
            currentUserId
        )
        : false
    );

  const [
    likesCount,
    setLikesCount,
  ] = useState(
    post?.likes?.length || 0
  );

  const [isSaved, setIsSaved] =
    useState(() =>
      Array.isArray(
        currentUser?.savedPosts
      )
        ? currentUser.savedPosts.some(
          (id) =>
            normalizeId(id) ===
            normalizeId(post?._id)
        )
        : false
    );

  const [comments, setComments] =
    useState([]);

  const [
    commentText,
    setCommentText,
  ] = useState("");

  const [
    commentsLoading,
    setCommentsLoading,
  ] = useState(true);

  const [
    submittingComment,
    setSubmittingComment,
  ] = useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  // =========================
  // ESCAPE + BODY LOCK
  // =========================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  // =========================
  // LOAD COMMENTS
  // =========================
  useEffect(() => {
    let active = true;

    const loadComments = async () => {
      try {
        setCommentsLoading(true);

        const response =
          await getComments(post._id);

        if (!active) return;

        setComments(
          Array.isArray(response?.comments)
            ? response.comments
            : []
        );
      } catch (error) {
        console.error(
          "Comments Error:",
          error
        );
      } finally {
        if (active) {
          setCommentsLoading(false);
        }
      }
    };

    if (post?._id) {
      loadComments();
    }

    return () => {
      active = false;
    };
  }, [post?._id]);

  // =========================
  // LIKE
  // =========================
  const handleLike = async () => {
    if (actionLoading) return;

    try {
      setActionLoading(true);

      if (isLiked) {
        await unlikePost(post._id);

        setIsLiked(false);

        setLikesCount((prev) =>
          Math.max(0, prev - 1)
        );
      } else {
        await likePost(post._id);

        setIsLiked(true);

        setLikesCount(
          (prev) => prev + 1
        );
      }
    } catch (error) {
      console.error(
        "Like Error:",
        error
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // SAVE
  // =========================
  const handleSave = async () => {
    if (actionLoading) return;

    try {
      setActionLoading(true);

      const storedUser =
        getStoredUser();

      const savedPosts =
        Array.isArray(
          storedUser?.savedPosts
        )
          ? storedUser.savedPosts
          : [];

      if (isSaved) {
        await unsavePost(post._id);

        setIsSaved(false);

        if (storedUser) {
          storedUser.savedPosts =
            savedPosts.filter(
              (id) =>
                normalizeId(id) !==
                normalizeId(post._id)
            );
        }
      } else {
        await savePost(post._id);

        setIsSaved(true);

        if (storedUser) {
          const exists =
            savedPosts.some(
              (id) =>
                normalizeId(id) ===
                normalizeId(post._id)
            );

          if (!exists) {
            storedUser.savedPosts = [
              ...savedPosts,
              post._id,
            ];
          }
        }
      }

      if (storedUser) {
        localStorage.setItem(
          "user",
          JSON.stringify(storedUser)
        );
      }
    } catch (error) {
      console.error(
        "Save Error:",
        error.response?.data?.message ||
        error.message
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // ADD COMMENT
  // =========================
  const handleComment = async (e) => {
    e.preventDefault();

    const cleanText =
      commentText.trim();

    if (
      !cleanText ||
      submittingComment
    ) {
      return;
    }

    try {
      setSubmittingComment(true);

      const response =
        await commentPost(
          post._id,
          cleanText
        );

      const newComment =
        response?.comment;

      if (newComment) {
        setComments((prev) => [
          ...prev,
          newComment,
        ]);
      } else {
        const refreshed =
          await getComments(post._id);

        setComments(
          refreshed?.comments || []
        );
      }

      setCommentText("");
    } catch (error) {
      console.error(
        "Comment Error:",
        error
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Post details"
      >
        {/* CLOSE */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close post"
        >
          <X size={22} />
        </button>

        {/* LEFT IMAGE */}
        <div
          className={styles.mediaSide}
          style={{
            "--post-image":
              `url("${post.image}")`,
          }}
        >
          <img
            src={post.image}
            alt={
              post.caption || "Post"
            }
            className={styles.image}
          />
        </div>

        {/* RIGHT PANEL */}
        <div className={styles.detailsSide}>
          {/* USER HEADER */}
          <div className={styles.header}>
            <button
              type="button"
              className={styles.userLink}
              onClick={handlePostUserClick}
              disabled={!postUser?.username}
              aria-label={
                postUser?.username
                  ? `Open ${postUser.username} profile`
                  : "User profile"
              }
            >
              <img
                src={
                  postUser.profilePic ||
                  DefaultAvatar
                }
                alt={postUser.name || "User"}
                className={styles.avatar}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    DefaultAvatar;
                }}
              />

              <div className={styles.userText}>
                <strong>
                  {postUser.name || "User"}
                </strong>

                <div className={styles.userMeta}>
                  <span>
                    @{postUser.username || "user"}
                  </span>

                  {postTime && (
                    <>
                      <span
                        className={styles.metaDot}
                        aria-hidden="true"
                      >
                        ·
                      </span>

                      <time
                        dateTime={post.createdAt}
                        title={new Date(
                          post.createdAt
                        ).toLocaleString()}
                      >
                        {postTime}
                      </time>
                    </>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* COMMENTS AREA */}
          <div className={styles.comments}>
            {post.caption && (
              <div
                className={
                  styles.commentRow
                }
              >
                <img
                  src={
                    postUser.profilePic ||
                    DefaultAvatar
                  }
                  alt=""
                  className={
                    styles.commentAvatar
                  }
                />

                <p>
                  <button
                    type="button"
                    className={styles.inlineUsername}
                    onClick={handlePostUserClick}
                    disabled={!postUser?.username}
                  >
                    {postUser.username || "user"}
                  </button>{" "}
                  {post.caption}
                </p>
              </div>
            )}

            {commentsLoading ? (
              <p
                className={
                  styles.statusText
                }
              >
                Loading comments...
              </p>
            ) : comments.length > 0 ? (
              comments.map(
                (comment) => {
                  const commentUser =
                    comment?.user || {};

                  return (
                    <div
                      key={
                        comment._id ||
                        `${normalizeId(
                          commentUser
                        )}-${comment.text}`
                      }
                      className={
                        styles.commentRow
                      }
                    >
                      <img
                        src={
                          commentUser.profilePic ||
                          DefaultAvatar
                        }
                        alt=""
                        className={
                          styles.commentAvatar
                        }
                        onError={(e) => {
                          e.currentTarget.onerror =
                            null;

                          e.currentTarget.src =
                            DefaultAvatar;
                        }}
                      />

                      <p>
                        <button
                          type="button"
                          className={styles.inlineUsername}
                          onClick={() =>
                            openUserProfile(commentUser)
                          }
                          disabled={!commentUser?.username}
                        >
                          {commentUser.username || "user"}
                        </button>{" "}
                        {comment.text}
                      </p>
                    </div>
                  );
                }
              )
            ) : (
              <p
                className={
                  styles.statusText
                }
              >
                No comments yet.
              </p>
            )}
          </div>

          {/* ACTIONS */}
          <div className={styles.actionSection}>
            <div className={styles.actions}>
              <div
                className={
                  styles.leftActions
                }
              >
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={handleLike}
                  disabled={actionLoading}
                  aria-label={
                    isLiked
                      ? "Unlike post"
                      : "Like post"
                  }
                >
                  <Heart
                    size={25}
                    fill={
                      isLiked
                        ? "#ef4444"
                        : "none"
                    }
                    color={
                      isLiked
                        ? "#ef4444"
                        : "currentColor"
                    }
                  />
                </button>

                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Comment"
                  onClick={() => {
                    document
                      .getElementById(
                        `comment-${post._id}`
                      )
                      ?.focus();
                  }}
                >
                  <MessageCircle
                    size={25}
                  />
                </button>
              </div>

              <button
                type="button"
                className={styles.iconBtn}
                onClick={handleSave}
                disabled={actionLoading}
                aria-label={
                  isSaved
                    ? "Unsave post"
                    : "Save post"
                }
              >
                <Bookmark
                  size={25}
                  fill={
                    isSaved
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>

            <p className={styles.likes}>
              {likesCount}{" "}
              {likesCount === 1
                ? "like"
                : "likes"}
            </p>
          </div>

          {/* COMMENT INPUT */}
          <form
            className={styles.commentForm}
            onSubmit={handleComment}
          >
            <input
              id={`comment-${post._id}`}
              type="text"
              value={commentText}
              onChange={(e) =>
                setCommentText(
                  e.target.value
                )
              }
              placeholder="Add a comment..."
              maxLength={500}
            />

            <button
              type="submit"
              disabled={
                !commentText.trim() ||
                submittingComment
              }
              aria-label="Post comment"
            >
              <Send size={19} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostModal;
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import CommentModal from "./CommentModal";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  deletePost,
} from "../../services/postService";

import styles from "./PostCard.module.css";

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();

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

// =========================
// SAFE LOCAL USER
// =========================

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

const PostCard = ({
  post,
  onDeleted,
}) => {
  const navigate = useNavigate();

  const currentUser = useMemo(() => getStoredUser(), []);

  const user = post?.user || {};

  const postTime = formatRelativeTime(
    post?.createdAt
  );

  const postId = normalizeId(
    post?._id
  );

  const currentUserId = normalizeId(
    currentUser?.id ||
    currentUser?._id
  );

  const postOwnerId = normalizeId(
    user?._id ||
    user?.id ||
    post?.user
  );

  const handleOpenUserProfile = () => {
    const username =
      user?.username?.trim();

    if (!username) return;

    if (
      username.toLowerCase() ===
      currentUser?.username
        ?.trim()
        .toLowerCase()
    ) {
      navigate("/profile");
      return;
    }

    navigate(
      `/user/${encodeURIComponent(username)}`
    );
  };

  // =========================
  // OWN POST CHECK
  // =========================
  const isOwnPost =
    Boolean(currentUserId) &&
    Boolean(postOwnerId) &&
    currentUserId === postOwnerId;

  // =========================
  // LIKE STATE
  // =========================
  const [isLiked, setIsLiked] =
    useState(() => {
      return (
        post?.likes || []
      ).some(
        (id) =>
          normalizeId(id) ===
          currentUserId
      );
    });

  const [likesCount, setLikesCount] =
    useState(
      Array.isArray(post?.likes)
        ? post.likes.length
        : 0
    );

  // =========================
  // SAVED STATE
  // =========================
  const [saved, setSaved] =
    useState(() => {
      return (
        currentUser?.savedPosts || []
      ).some(
        (id) =>
          normalizeId(id) ===
          postId
      );
    });

  const [likeLoading, setLikeLoading] =
    useState(false);

  const [saveLoading, setSaveLoading] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [
    showDeleteConfirm,
    setShowDeleteConfirm,
  ] = useState(false);

  const [
    showComments,
    setShowComments,
  ] = useState(false);

  const [showHeart, setShowHeart] = useState(false);

  const [imagePop, setImagePop] = useState(false);

  const tapTimeout = useRef(null);

  const imageTimeout = useRef(null);
  const heartTimeout = useRef(null);


  const menuRef = useRef(null);

  // =========================
  // OUTSIDE CLICK CLOSE
  // =========================
  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          e.target
        )
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [menuOpen]);

  // =========================
  // ESCAPE CLOSE
  // Menu + confirmation
  // =========================
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== "Escape") {
        return;
      }

      if (
        showDeleteConfirm &&
        !deleting
      ) {
        setShowDeleteConfirm(false);
        return;
      }

      if (menuOpen) {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    menuOpen,
    showDeleteConfirm,
    deleting,
  ]);

  // =========================
  // LIKE / UNLIKE
  // =========================
  const handleLike = async () => {
    if (likeLoading || !postId || !currentUserId) return;

    const wasLiked = isLiked;

    // Optimistic UI
    setIsLiked(!wasLiked);
    setLikesCount((prev) =>
      wasLiked ? Math.max(0, prev - 1) : prev + 1
    );

    try {
      setLikeLoading(true);

      if (wasLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      // Rollback
      setIsLiked(wasLiked);
      setLikesCount((prev) =>
        wasLiked ? prev + 1 : Math.max(0, prev - 1)
      );

      console.error(error);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleImageClick = () => {
    if (tapTimeout.current) {
      clearTimeout(tapTimeout.current);
      tapTimeout.current = null;

      if (!isLiked && !likeLoading) {
        handleLike();
      }

      setImagePop(false);
      setShowHeart(false);

      requestAnimationFrame(() => {
        setImagePop(true);
        setShowHeart(true);
      });

      clearTimeout(imageTimeout.current);
      clearTimeout(heartTimeout.current);

      imageTimeout.current = setTimeout(() => {
        setImagePop(false);
      }, 220);

      heartTimeout.current = setTimeout(() => {
        setShowHeart(false);
        setImagePop(false);
      }, 520);

      return;
    }

    tapTimeout.current = setTimeout(() => {
      tapTimeout.current = null;
    }, 250);
  };

  useEffect(() => {
    return () => {
      clearTimeout(tapTimeout.current);
      clearTimeout(imageTimeout.current);
      clearTimeout(heartTimeout.current);
    };
  }, []);

  // =========================
  // SAVE / UNSAVE
  // =========================
  const handleSave = async () => {
    if (
      saveLoading ||
      !postId ||
      !currentUser
    ) {
      return;
    }

    try {
      setSaveLoading(true);

      let response;

      if (saved) {
        response =
          await unsavePost(postId);
      } else {
        response =
          await savePost(postId);
      }

      const nextSaved =
        typeof response?.saved ===
          "boolean"
          ? response.saved
          : !saved;

      setSaved(nextSaved);

      const currentSavedPosts =
        Array.isArray(
          currentUser.savedPosts
        )
          ? currentUser.savedPosts
          : [];

      let nextSavedPosts;

      if (nextSaved) {
        const alreadyExists =
          currentSavedPosts.some(
            (id) =>
              normalizeId(id) ===
              postId
          );

        nextSavedPosts =
          alreadyExists
            ? currentSavedPosts
            : [
              ...currentSavedPosts,
              postId,
            ];
      } else {
        nextSavedPosts =
          currentSavedPosts.filter(
            (id) =>
              normalizeId(id) !==
              postId
          );
      }

      const updatedUser = {
        ...currentUser,
        savedPosts: nextSavedPosts,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );
    } catch (error) {
      console.error(
        "Save Error:",
        error.response?.data ||
        error.message
      );
    } finally {
      setSaveLoading(false);
    }
  };

  // =========================
  // OPEN DELETE CONFIRM
  // =========================
  const handleDeleteRequest = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  // =========================
  // DELETE POST
  // =========================
  const handleDeletePost = async () => {
    if (
      deleting ||
      !postId ||
      !isOwnPost
    ) {
      return;
    }

    try {
      setDeleting(true);

      const response =
        await deletePost(postId);

      const deletedPostId =
        normalizeId(
          response?.deletedPostId
        ) || postId;

      setShowDeleteConfirm(false);

      // Instant remove from Feed
      if (onDeleted) {
        onDeleted(deletedPostId);
      }
    } catch (error) {
      console.error(
        "Delete Post Error:",
        error.response?.data ||
        error.message
      );

      alert(
        error.response?.data?.message ||
        "Unable to delete post"
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!post) {
    return null;
  }

  return (
    <>
      <div className={styles.card}>
        {/* =====================
            HEADER
        ====================== */}
        <div className={styles.header}>
          <button
            type="button"
            className={styles.userInfo}
            onClick={handleOpenUserProfile}
            disabled={!user?.username}
            aria-label={
              user?.username
                ? `Open ${user.username} profile`
                : "User profile"
            }
          >
            <img
              src={
                user.profilePic ||
                DefaultAvatar
              }
              alt={user.name || "User"}
              className={styles.avatar}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  DefaultAvatar;
              }}
            />

            <div className={styles.userText}>
              <h3>
                {user.name || "User"}
              </h3>

              <div className={styles.userMeta}>
                <span>
                  @{user.username || "user"}
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

          {/* =====================
              OWN POST MENU ONLY
          ====================== */}
          {isOwnPost && (
            <div
              className={
                styles.menuWrapper
              }
              ref={menuRef}
            >
              <button
                type="button"
                className={
                  styles.menuButton
                }
                onClick={() =>
                  setMenuOpen(
                    (prev) => !prev
                  )
                }
                disabled={deleting}
                aria-label="Post options"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal
                  size={22}
                />
              </button>

              {menuOpen && (
                <div
                  className={styles.menu}
                  role="menu"
                >
                  <button
                    type="button"
                    className={
                      styles.deleteButton
                    }
                    onClick={
                      handleDeleteRequest
                    }
                    disabled={deleting}
                    role="menuitem"
                  >
                    <Trash2 size={17} />

                    <span>
                      Delete Post
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =====================
            IMAGE
        ====================== */}
        {post.image && (
          <div
            className={styles.imageWrapper}
            onClick={handleImageClick}
          >
            {showHeart && (
              <div className={styles.bigHeart}>
                <span className={styles.heartRipple}></span>

                <Heart
                  size={110}
                  fill="#ff3040"
                  color="#ff3040"
                  strokeWidth={0}
                />
              </div>
            )}

            <img
              src={post.image}
              alt={post.caption || "Post"}
              className={`${styles.image} ${imagePop ? styles.imagePop : ""}`}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              draggable={false}
            />

          </div>
        )}

        {/* =====================
            ACTIONS
        ====================== */}
        <div className={styles.actions}>
          <div
            className={
              styles.leftActions
            }
          >
            <Heart
              size={22}
              onClick={handleLike}
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
              className={styles.icon}
              aria-label={
                isLiked
                  ? "Unlike post"
                  : "Like post"
              }
              style={{
                opacity: likeLoading
                  ? 0.55
                  : 1,
                pointerEvents:
                  likeLoading
                    ? "none"
                    : "auto",
              }}
            />

            <MessageCircle
              size={22}
              color="currentColor"
              className={styles.icon}
              onClick={() =>
                setShowComments(true)
              }
              aria-label="Open comments"
            />
          </div>

          <Bookmark
            size={22}
            onClick={handleSave}
            fill={
              saved
                ? "#3b82f6"
                : "none"
            }
            color={
              saved
                ? "#3b82f6"
                : "currentColor"
            }
            className={styles.icon}
            aria-label={
              saved
                ? "Remove saved post"
                : "Save post"
            }
            style={{
              opacity: saveLoading
                ? 0.55
                : 1,
              pointerEvents:
                saveLoading
                  ? "none"
                  : "auto",
            }}
          />
        </div>

        {/* =====================
            CONTENT
        ====================== */}
        <div className={styles.content}>
          <p className={styles.likes}>
            {likesCount}{" "}
            {likesCount === 1
              ? "Like"
              : "Likes"}
          </p>

          {post.caption && (
            <p
              className={
                styles.caption
              }
            >
              <strong>
                @
                {user.username ||
                  "user"}
              </strong>{" "}
              {post.caption}
            </p>
          )}
        </div>
      </div>

      {/* =====================
          DELETE CONFIRM MODAL
      ====================== */}
      {showDeleteConfirm && (
        <div
          className={
            styles.confirmOverlay
          }
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget &&
              !deleting
            ) {
              setShowDeleteConfirm(
                false
              );
            }
          }}
        >
          <div
            className={
              styles.confirmModal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-post-title"
          >
            <div
              className={
                styles.confirmIcon
              }
            >
              <Trash2 size={24} />
            </div>

            <h3 id="delete-post-title">
              Delete this post?
            </h3>

            <p>
              This action cannot be undone.
              Your post will be permanently
              removed.
            </p>

            <div
              className={
                styles.confirmActions
              }
            >
              <button
                type="button"
                className={
                  styles.cancelDelete
                }
                onClick={() =>
                  setShowDeleteConfirm(
                    false
                  )
                }
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.confirmDelete
                }
                onClick={
                  handleDeletePost
                }
                disabled={deleting}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================
          COMMENTS
      ====================== */}
      {showComments && (
        <CommentModal
          post={post}
          onClose={() =>
            setShowComments(false)
          }
        />
      )}
    </>
  );
};

export default React.memo(PostCard);
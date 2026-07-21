import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import CommentModal from "./CommentModal";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  deletePost,
  likePost,
  savePost,
  unlikePost,
  unsavePost,
  updatePostCaption,
} from "../../services/postService";

import styles from "./PostCard.module.css";

const MAX_CAPTION_LENGTH = 2200;

/* =========================
   FORMAT POST TIME
========================= */

const formatRelativeTime = (
  dateValue
) => {
  if (!dateValue) {
    return "";
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const diffMs =
    Date.now() -
    date.getTime();

  if (diffMs < 0) {
    return "now";
  }

  const seconds =
    Math.floor(
      diffMs / 1000
    );

  if (seconds < 60) {
    return "now";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days}d`;
  }

  const weeks =
    Math.floor(
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

/* =========================
   SAFE LOCAL USER
========================= */

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem(
        "user"
      );

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch (error) {
    console.warn(
      "Stored User Parse Error:",
      error
    );

    return null;
  }
};

/* =========================
   NORMALIZE ID
========================= */

const normalizeId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (value?._id) {
    return String(
      value._id
    );
  }

  if (value?.id) {
    return String(
      value.id
    );
  }

  return String(value);
};

/* =========================
   POST CARD
========================= */

const PostCard = ({
  post,
  onDeleted,
}) => {
  const navigate =
    useNavigate();

  const {
    user: authUser,
  } = useAuth();

  const storedUser =
    useMemo(
      () =>
        getStoredUser(),
      []
    );

  const currentUser =
    authUser ||
    storedUser ||
    null;

  const user =
    post?.user || {};

  const postId =
    normalizeId(
      post?._id ||
      post?.id
    );

  const currentUserId =
    normalizeId(
      currentUser?._id ||
      currentUser?.id
    );

  const postOwnerId =
    normalizeId(
      user?._id ||
      user?.id ||
      post?.user
    );

  const postTime =
    formatRelativeTime(
      post?.createdAt
    );

  const isOwnPost =
    Boolean(
      currentUserId &&
      postOwnerId &&
      currentUserId ===
      postOwnerId
    );

  /* =========================
     LOCAL POST CONTENT
  ========================= */

  const [
    caption,
    setCaption,
  ] = useState(
    post?.caption || ""
  );

  useEffect(() => {
    setCaption(
      post?.caption || ""
    );
  }, [
    post?._id,
    post?.caption,
  ]);

  /* =========================
     LIKE STATE
  ========================= */

  const [
    isLiked,
    setIsLiked,
  ] = useState(() =>
    (
      post?.likes || []
    ).some(
      (id) =>
        normalizeId(id) ===
        currentUserId
    )
  );

  const [
    likesCount,
    setLikesCount,
  ] = useState(
    Array.isArray(
      post?.likes
    )
      ? post.likes.length
      : 0
  );

  useEffect(() => {
    const postLikes =
      Array.isArray(
        post?.likes
      )
        ? post.likes
        : [];

    setIsLiked(
      postLikes.some(
        (id) =>
          normalizeId(id) ===
          currentUserId
      )
    );

    setLikesCount(
      postLikes.length
    );
  }, [
    post?._id,
    post?.likes,
    currentUserId,
  ]);

  /* =========================
     SAVED STATE
  ========================= */

  const [
    saved,
    setSaved,
  ] = useState(() =>
    (
      currentUser?.savedPosts ||
      []
    ).some(
      (id) =>
        normalizeId(id) ===
        postId
    )
  );

  useEffect(() => {
    setSaved(
      (
        currentUser
          ?.savedPosts ||
        []
      ).some(
        (id) =>
          normalizeId(id) ===
          postId
      )
    );
  }, [
    currentUser?.savedPosts,
    postId,
  ]);

  /* =========================
     UI STATE
  ========================= */

  const [
    likeLoading,
    setLikeLoading,
  ] = useState(false);

  const [
    saveLoading,
    setSaveLoading,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    updatingCaption,
    setUpdatingCaption,
  ] = useState(false);

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    showDeleteConfirm,
    setShowDeleteConfirm,
  ] = useState(false);

  const [
    showEditCaption,
    setShowEditCaption,
  ] = useState(false);

  const [
    editCaptionValue,
    setEditCaptionValue,
  ] = useState("");

  const [
    editCaptionError,
    setEditCaptionError,
  ] = useState("");

  const [
    showComments,
    setShowComments,
  ] = useState(false);

  const [
    showHeart,
    setShowHeart,
  ] = useState(false);

  const [
    imagePop,
    setImagePop,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] = useState(null);

  /* =========================
     REFS
  ========================= */

  const menuRef =
    useRef(null);

  const textareaRef =
    useRef(null);

  const tapTimeout =
    useRef(null);

  const imageTimeout =
    useRef(null);

  const heartTimeout =
    useRef(null);

  const toastTimeout =
    useRef(null);

  /* =========================
     TOAST
  ========================= */

  const showToastMessage =
    useCallback(
      (
        message,
        type = "success"
      ) => {
        clearTimeout(
          toastTimeout.current
        );

        setToast({
          message,
          type,
        });

        toastTimeout.current =
          window.setTimeout(
            () => {
              setToast(null);
            },
            3200
          );
      },
      []
    );

  /* =========================
     PROFILE NAVIGATION
  ========================= */

  const handleOpenUserProfile =
    () => {
      const username =
        user?.username?.trim();

      if (!username) {
        return;
      }

      if (
        username.toLowerCase() ===
        currentUser?.username
          ?.trim()
          .toLowerCase()
      ) {
        navigate(
          "/profile"
        );

        return;
      }

      navigate(
        `/user/${encodeURIComponent(
          username
        )}`
      );
    };

  /* =========================
     OUTSIDE CLICK MENU
  ========================= */

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleOutsideClick =
      (event) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(
            event.target
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

  /* =========================
     ESCAPE KEY
  ========================= */

  useEffect(() => {
    const handleEscape =
      (event) => {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        if (
          showEditCaption &&
          !updatingCaption
        ) {
          setShowEditCaption(
            false
          );

          setEditCaptionError(
            ""
          );

          return;
        }

        if (
          showDeleteConfirm &&
          !deleting
        ) {
          setShowDeleteConfirm(
            false
          );

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
    deleting,
    menuOpen,
    showDeleteConfirm,
    showEditCaption,
    updatingCaption,
  ]);

  /* =========================
     BODY SCROLL LOCK
  ========================= */

  useEffect(() => {
    const hasOpenModal =
      showDeleteConfirm ||
      showEditCaption;

    if (!hasOpenModal) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    showDeleteConfirm,
    showEditCaption,
  ]);

  /* =========================
     AUTO FOCUS EDITOR
  ========================= */

  useEffect(() => {
    if (!showEditCaption) {
      return;
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          textareaRef.current
            ?.focus();

          const length =
            textareaRef.current
              ?.value.length ||
            0;

          textareaRef.current
            ?.setSelectionRange(
              length,
              length
            );
        }
      );

    return () => {
      window.cancelAnimationFrame(
        frame
      );
    };
  }, [showEditCaption]);

  /* =========================
     LIKE / UNLIKE
  ========================= */

  const handleLike =
    async () => {
      if (
        likeLoading ||
        !postId ||
        !currentUserId
      ) {
        return;
      }

      const wasLiked =
        isLiked;

      setIsLiked(
        !wasLiked
      );

      setLikesCount(
        (previousCount) =>
          wasLiked
            ? Math.max(
              0,
              previousCount -
              1
            )
            : previousCount +
            1
      );

      try {
        setLikeLoading(true);

        if (wasLiked) {
          await unlikePost(
            postId
          );
        } else {
          await likePost(
            postId
          );
        }
      } catch (error) {
        setIsLiked(
          wasLiked
        );

        setLikesCount(
          (
            previousCount
          ) =>
            wasLiked
              ? previousCount +
              1
              : Math.max(
                0,
                previousCount -
                1
              )
        );

        showToastMessage(
          error.response
            ?.data?.message ||
          "Unable to update like",
          "error"
        );
      } finally {
        setLikeLoading(
          false
        );
      }
    };

  /* =========================
     DOUBLE TAP IMAGE
  ========================= */

  const handleImageClick =
    () => {
      if (
        tapTimeout.current
      ) {
        clearTimeout(
          tapTimeout.current
        );

        tapTimeout.current =
          null;

        if (
          !isLiked &&
          !likeLoading
        ) {
          void handleLike();
        }

        setImagePop(false);
        setShowHeart(false);

        window.requestAnimationFrame(
          () => {
            setImagePop(true);
            setShowHeart(true);
          }
        );

        clearTimeout(
          imageTimeout.current
        );

        clearTimeout(
          heartTimeout.current
        );

        imageTimeout.current =
          window.setTimeout(
            () => {
              setImagePop(false);
            },
            220
          );

        heartTimeout.current =
          window.setTimeout(
            () => {
              setShowHeart(false);
              setImagePop(false);
            },
            520
          );

        return;
      }

      tapTimeout.current =
        window.setTimeout(
          () => {
            tapTimeout.current =
              null;
          },
          250
        );
    };

  /* =========================
     SAVE / UNSAVE
  ========================= */

  const handleSave =
    async () => {
      if (
        saveLoading ||
        !postId ||
        !currentUser
      ) {
        return;
      }

      const wasSaved =
        saved;

      setSaved(
        !wasSaved
      );

      try {
        setSaveLoading(true);

        const response =
          wasSaved
            ? await unsavePost(
              postId
            )
            : await savePost(
              postId
            );

        const nextSaved =
          typeof response?.saved ===
            "boolean"
            ? response.saved
            : !wasSaved;

        setSaved(
          nextSaved
        );

        const localUser =
          getStoredUser() ||
          currentUser;

        const currentSavedPosts =
          Array.isArray(
            localUser
              ?.savedPosts
          )
            ? localUser.savedPosts
            : [];

        const nextSavedPosts =
          nextSaved
            ? [
              ...currentSavedPosts.filter(
                (id) =>
                  normalizeId(
                    id
                  ) !==
                  postId
              ),
              postId,
            ]
            : currentSavedPosts.filter(
              (id) =>
                normalizeId(
                  id
                ) !==
                postId
            );

        const updatedUser = {
          ...localUser,
          savedPosts:
            nextSavedPosts,
        };

        localStorage.setItem(
          "user",
          JSON.stringify(
            updatedUser
          )
        );

        showToastMessage(
          nextSaved
            ? "Post saved"
            : "Post removed from saved"
        );
      } catch (error) {
        setSaved(
          wasSaved
        );

        showToastMessage(
          error.response
            ?.data?.message ||
          "Unable to update saved post",
          "error"
        );
      } finally {
        setSaveLoading(
          false
        );
      }
    };

  /* =========================
     OPEN EDIT CAPTION
  ========================= */

  const handleEditRequest =
    () => {
      setMenuOpen(false);

      setEditCaptionValue(
        caption
      );

      setEditCaptionError(
        ""
      );

      setShowEditCaption(
        true
      );
    };

  /* =========================
     UPDATE CAPTION
  ========================= */

  const handleUpdateCaption =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        updatingCaption ||
        !postId ||
        !isOwnPost
      ) {
        return;
      }

      const normalizedCaption =
        editCaptionValue.trim();

      if (
        normalizedCaption.length >
        MAX_CAPTION_LENGTH
      ) {
        setEditCaptionError(
          `Caption cannot exceed ${MAX_CAPTION_LENGTH} characters`
        );

        return;
      }

      if (
        normalizedCaption ===
        caption.trim()
      ) {
        setShowEditCaption(
          false
        );

        setEditCaptionError(
          ""
        );

        return;
      }

      try {
        setUpdatingCaption(
          true
        );

        setEditCaptionError(
          ""
        );

        const response =
          await updatePostCaption(
            postId,
            normalizedCaption
          );

        const updatedCaption =
          typeof response?.post
            ?.caption ===
            "string"
            ? response.post.caption
            : normalizedCaption;

        setCaption(
          updatedCaption
        );

        setShowEditCaption(
          false
        );

        showToastMessage(
          "Caption updated"
        );
      } catch (error) {
        const message =
          error.response
            ?.data?.message ||
          error.message ||
          "Unable to update caption";

        setEditCaptionError(
          message
        );

        showToastMessage(
          message,
          "error"
        );
      } finally {
        setUpdatingCaption(
          false
        );
      }
    };

  /* =========================
     OPEN DELETE CONFIRM
  ========================= */

  const handleDeleteRequest =
    () => {
      setMenuOpen(false);

      setShowDeleteConfirm(
        true
      );
    };

  /* =========================
     DELETE POST
  ========================= */

  const handleDeletePost =
    async () => {
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
          await deletePost(
            postId
          );

        const deletedPostId =
          normalizeId(
            response
              ?.deletedPostId
          ) || postId;

        setShowDeleteConfirm(
          false
        );

        onDeleted?.(
          deletedPostId
        );
      } catch (error) {
        showToastMessage(
          error.response
            ?.data?.message ||
          "Unable to delete post",
          "error"
        );
      } finally {
        setDeleting(false);
      }
    };

  /* =========================
     CLEANUP
  ========================= */

  useEffect(() => {
    return () => {
      clearTimeout(
        tapTimeout.current
      );

      clearTimeout(
        imageTimeout.current
      );

      clearTimeout(
        heartTimeout.current
      );

      clearTimeout(
        toastTimeout.current
      );
    };
  }, []);

  if (!post) {
    return null;
  }

  return (
    <>
      <article
        className={
          styles.card
        }
      >
        {/* HEADER */}
        <div
          className={
            styles.header
          }
        >
          <button
            type="button"
            className={
              styles.userInfo
            }
            onClick={
              handleOpenUserProfile
            }
            disabled={
              !user?.username
            }
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
              alt={
                user.name ||
                "User"
              }
              className={
                styles.avatar
              }
              onError={(
                event
              ) => {
                event.currentTarget.onerror =
                  null;

                event.currentTarget.src =
                  DefaultAvatar;
              }}
            />

            <div
              className={
                styles.userText
              }
            >
              <h3>
                {user.name ||
                  "User"}
              </h3>

              <div
                className={
                  styles.userMeta
                }
              >
                <span>
                  @
                  {user.username ||
                    "user"}
                </span>

                {postTime && (
                  <>
                    <span
                      className={
                        styles.metaDot
                      }
                      aria-hidden="true"
                    >
                      ·
                    </span>

                    <time
                      dateTime={
                        post.createdAt
                      }
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

          {isOwnPost && (
            <div
              className={
                styles.menuWrapper
              }
              ref={
                menuRef
              }
            >
              <button
                type="button"
                className={
                  styles.menuButton
                }
                onClick={() =>
                  setMenuOpen(
                    (
                      previousValue
                    ) =>
                      !previousValue
                  )
                }
                disabled={
                  deleting ||
                  updatingCaption
                }
                aria-label="Post options"
                aria-expanded={
                  menuOpen
                }
              >
                <MoreHorizontal
                  size={22}
                />
              </button>

              {menuOpen && (
                <div
                  className={
                    styles.menu
                  }
                  role="menu"
                >
                  <button
                    type="button"
                    className={
                      styles.editButton
                    }
                    onClick={
                      handleEditRequest
                    }
                    role="menuitem"
                  >
                    <Pencil
                      size={17}
                    />

                    <span>
                      Edit Caption
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      styles.deleteButton
                    }
                    onClick={
                      handleDeleteRequest
                    }
                    role="menuitem"
                  >
                    <Trash2
                      size={17}
                    />

                    <span>
                      Delete Post
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* IMAGE */}
        {post.image && (
          <div
            className={
              styles.imageWrapper
            }
            onClick={
              handleImageClick
            }
          >
            {showHeart && (
              <div
                className={
                  styles.bigHeart
                }
              >
                <span
                  className={
                    styles.heartRipple
                  }
                />

                <Heart
                  size={110}
                  fill="#ff3040"
                  color="#ff3040"
                  strokeWidth={0}
                />
              </div>
            )}

            <img
              src={
                post.image
              }
              alt={
                caption ||
                "Post"
              }
              className={`${styles.image} ${imagePop
                  ? styles.imagePop
                  : ""
                }`}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              draggable={
                false
              }
            />
          </div>
        )}

        {/* ACTIONS */}
        <div
          className={
            styles.actions
          }
        >
          <div
            className={
              styles.leftActions
            }
          >
            <button
              type="button"
              className={
                styles.actionButton
              }
              onClick={
                handleLike
              }
              disabled={
                likeLoading
              }
              aria-label={
                isLiked
                  ? "Unlike post"
                  : "Like post"
              }
            >
              <Heart
                size={22}
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
                className={
                  styles.icon
                }
              />
            </button>

            <button
              type="button"
              className={
                styles.actionButton
              }
              onClick={() =>
                setShowComments(
                  true
                )
              }
              aria-label="Open comments"
            >
              <MessageCircle
                size={22}
                className={
                  styles.icon
                }
              />
            </button>
          </div>

          <button
            type="button"
            className={
              styles.actionButton
            }
            onClick={
              handleSave
            }
            disabled={
              saveLoading
            }
            aria-label={
              saved
                ? "Remove saved post"
                : "Save post"
            }
          >
            <Bookmark
              size={22}
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
              className={
                styles.icon
              }
            />
          </button>
        </div>

        {/* CONTENT */}
        <div
          className={
            styles.content
          }
        >
          <p
            className={
              styles.likes
            }
          >
            {likesCount}{" "}
            {likesCount === 1
              ? "Like"
              : "Likes"}
          </p>

          {caption && (
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
              {caption}
            </p>
          )}
        </div>
      </article>

      {/* EDIT CAPTION MODAL */}
      {showEditCaption && (
        <div
          className={
            styles.modalOverlay
          }
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget &&
              !updatingCaption
            ) {
              setShowEditCaption(
                false
              );

              setEditCaptionError(
                ""
              );
            }
          }}
        >
          <form
            className={
              styles.editModal
            }
            onSubmit={
              handleUpdateCaption
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-caption-title"
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <h3
                  id="edit-caption-title"
                >
                  Edit caption
                </h3>

                <p>
                  Update the text for
                  this post.
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.modalCloseButton
                }
                onClick={() => {
                  setShowEditCaption(
                    false
                  );

                  setEditCaptionError(
                    ""
                  );
                }}
                disabled={
                  updatingCaption
                }
                aria-label="Close edit caption"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={
                styles.editorBody
              }
            >
              <textarea
                ref={
                  textareaRef
                }
                value={
                  editCaptionValue
                }
                onChange={(
                  event
                ) => {
                  const nextValue =
                    event.target
                      .value;

                  if (
                    nextValue.length <=
                    MAX_CAPTION_LENGTH
                  ) {
                    setEditCaptionValue(
                      nextValue
                    );

                    setEditCaptionError(
                      ""
                    );
                  }
                }}
                className={
                  styles.captionTextarea
                }
                maxLength={
                  MAX_CAPTION_LENGTH
                }
                placeholder="Write a caption..."
                disabled={
                  updatingCaption
                }
              />

              <div
                className={
                  styles.editorMeta
                }
              >
                <span
                  className={
                    editCaptionError
                      ? styles.editorError
                      : ""
                  }
                >
                  {editCaptionError}
                </span>

                <span
                  className={
                    styles.characterCount
                  }
                >
                  {
                    editCaptionValue.length
                  }
                  /
                  {
                    MAX_CAPTION_LENGTH
                  }
                </span>
              </div>
            </div>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={() => {
                  setShowEditCaption(
                    false
                  );

                  setEditCaptionError(
                    ""
                  );
                }}
                disabled={
                  updatingCaption
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className={
                  styles.primaryButton
                }
                disabled={
                  updatingCaption ||
                  editCaptionValue.trim() ===
                  caption.trim()
                }
              >
                {updatingCaption
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div
          className={
            styles.confirmOverlay
          }
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget &&
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
              <Trash2
                size={24}
              />
            </div>

            <h3
              id="delete-post-title"
            >
              Delete this post?
            </h3>

            <p>
              This action cannot be
              undone. Your post will be
              permanently removed.
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
                disabled={
                  deleting
                }
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
                disabled={
                  deleting
                }
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMENTS */}
      {showComments && (
        <CommentModal
          post={{
            ...post,
            caption,
          }}
          onClose={() =>
            setShowComments(
              false
            )
          }
        />
      )}

      {/* TOAST */}
      {toast && (
        <div
          className={`${styles.toast} ${toast.type ===
              "error"
              ? styles.toastError
              : styles.toastSuccess
            }`}
          role={
            toast.type ===
              "error"
              ? "alert"
              : "status"
          }
          aria-live="polite"
        >
          {toast.type ===
            "error" ? (
            <AlertCircle
              size={19}
            />
          ) : (
            <CheckCircle2
              size={19}
            />
          )}

          <span>
            {toast.message}
          </span>

          <button
            type="button"
            onClick={() =>
              setToast(null)
            }
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
};

export default React.memo(
  PostCard
);
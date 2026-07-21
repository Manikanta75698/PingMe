import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Send,
  Trash2,
  X,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  commentPost,
  deleteComment,
  getComments,
} from "../../services/postService";

import DefaultAvatar from "../../assets/default-avatar.png";

import styles from "./CommentModal.module.css";

const MAX_COMMENT_LENGTH = 500;

const normalizeId = (
  value
) =>
  String(
    value?._id ??
    value?.id ??
    value ??
    ""
  ).trim();

const CommentModal = ({
  post,
  onClose,
  onCommentCountChange,
}) => {
  const {
    user: currentUser,
  } = useAuth();

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
      post?.user?._id ||
      post?.user?.id ||
      post?.user
    );

  const [
    comments,
    setComments,
  ] = useState([]);

  const [
    text,
    setText,
  ] = useState("");

  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    deletingCommentId,
    setDeletingCommentId,
  ] = useState("");

  const [
    activeMenuId,
    setActiveMenuId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    toast,
    setToast,
  ] = useState(null);

  const inputRef =
    useRef(null);

  const commentsEndRef =
    useRef(null);

  const toastTimerRef =
    useRef(null);

  const mountedRef =
    useRef(false);

  const normalizedText =
    text.trim();

  const canSubmit =
    Boolean(
      normalizedText &&
      normalizedText.length <=
      MAX_COMMENT_LENGTH &&
      !submitting
    );

  const updateCommentCount =
    useCallback(
      (nextComments) => {
        onCommentCountChange?.(
          nextComments.length
        );
      },
      [
        onCommentCountChange,
      ]
    );

  const showToast =
    useCallback(
      (
        message,
        type = "success"
      ) => {
        clearTimeout(
          toastTimerRef.current
        );

        setToast({
          message,
          type,
        });

        toastTimerRef.current =
          window.setTimeout(
            () => {
              setToast(null);
            },
            3000
          );
      },
      []
    );

  const loadComments =
    useCallback(
      async () => {
        if (!postId) {
          setError(
            "Invalid post"
          );

          setInitialLoading(
            false
          );

          return;
        }

        try {
          setInitialLoading(
            true
          );

          setError("");

          const data =
            await getComments(
              postId
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          const nextComments =
            Array.isArray(
              data?.comments
            )
              ? data.comments
              : [];

          setComments(
            nextComments
          );

          updateCommentCount(
            nextComments
          );
        } catch (loadError) {
          if (
            !mountedRef.current
          ) {
            return;
          }

          console.error(
            "Load Comments Error:",
            loadError.response
              ?.data ||
            loadError.message
          );

          setError(
            loadError.response
              ?.data?.message ||
            "Unable to load comments"
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setInitialLoading(
              false
            );
          }
        }
      },
      [
        postId,
        updateCommentCount,
      ]
    );

  useEffect(() => {
    mountedRef.current =
      true;

    void loadComments();

    return () => {
      mountedRef.current =
        false;

      clearTimeout(
        toastTimerRef.current
      );
    };
  }, [loadComments]);

  useEffect(() => {
    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleEscape =
      (event) => {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        if (activeMenuId) {
          setActiveMenuId(
            ""
          );

          return;
        }

        if (
          !submitting &&
          !deletingCommentId
        ) {
          onClose?.();
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
    activeMenuId,
    deletingCommentId,
    onClose,
    submitting,
  ]);

  useEffect(() => {
    if (!activeMenuId) {
      return;
    }

    const handleOutsideClick =
      () => {
        setActiveMenuId(
          ""
        );
      };

    window.setTimeout(() => {
      document.addEventListener(
        "click",
        handleOutsideClick
      );
    }, 0);

    return () => {
      document.removeEventListener(
        "click",
        handleOutsideClick
      );
    };
  }, [activeMenuId]);

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        !canSubmit ||
        !postId
      ) {
        return;
      }

      const submittedText =
        normalizedText;

      try {
        setSubmitting(
          true
        );

        setError("");

        const data =
          await commentPost(
            postId,
            submittedText
          );

        const nextComments =
          Array.isArray(
            data?.comments
          )
            ? data.comments
            : [];

        setComments(
          nextComments
        );

        updateCommentCount(
          nextComments
        );

        setText("");

        showToast(
          "Comment added"
        );

        window.requestAnimationFrame(
          () => {
            commentsEndRef.current
              ?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
          }
        );
      } catch (submitError) {
        console.error(
          "Add Comment Error:",
          submitError.response
            ?.data ||
          submitError.message
        );

        showToast(
          submitError.response
            ?.data?.message ||
          "Unable to add comment",
          "error"
        );
      } finally {
        setSubmitting(
          false
        );

        inputRef.current
          ?.focus();
      }
    };

  const handleDeleteComment =
    async (
      commentId
    ) => {
      const normalizedCommentId =
        normalizeId(
          commentId
        );

      if (
        !normalizedCommentId ||
        deletingCommentId
      ) {
        return;
      }

      const previousComments =
        comments;

      const optimisticComments =
        comments.filter(
          (comment) =>
            normalizeId(
              comment
            ) !==
            normalizedCommentId
        );

      setActiveMenuId(
        ""
      );

      setComments(
        optimisticComments
      );

      updateCommentCount(
        optimisticComments
      );

      try {
        setDeletingCommentId(
          normalizedCommentId
        );

        const data =
          await deleteComment(
            postId,
            normalizedCommentId
          );

        const nextComments =
          Array.isArray(
            data?.comments
          )
            ? data.comments
            : optimisticComments;

        setComments(
          nextComments
        );

        updateCommentCount(
          nextComments
        );

        showToast(
          "Comment deleted"
        );
      } catch (deleteError) {
        setComments(
          previousComments
        );

        updateCommentCount(
          previousComments
        );

        showToast(
          deleteError.response
            ?.data?.message ||
          "Unable to delete comment",
          "error"
        );
      } finally {
        setDeletingCommentId(
          ""
        );
      }
    };

  const emptyState =
    useMemo(
      () =>
        !initialLoading &&
        !error &&
        comments.length === 0,
      [
        comments.length,
        error,
        initialLoading,
      ]
    );

  return (
    <>
      <div
        className={
          styles.overlay
        }
        onMouseDown={(
          event
        ) => {
          if (
            event.target ===
            event.currentTarget &&
            !submitting &&
            !deletingCommentId
          ) {
            onClose?.();
          }
        }}
      >
        <section
          className={
            styles.modal
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="comments-title"
        >
          <header
            className={
              styles.header
            }
          >
            <div>
              <h2
                id="comments-title"
              >
                Comments
              </h2>

              <p>
                {comments.length}{" "}
                {comments.length ===
                  1
                  ? "comment"
                  : "comments"}
              </p>
            </div>

            <button
              type="button"
              className={
                styles.closeButton
              }
              onClick={
                onClose
              }
              disabled={
                submitting ||
                Boolean(
                  deletingCommentId
                )
              }
              aria-label="Close comments"
            >
              <X size={21} />
            </button>
          </header>

          <div
            className={
              styles.comments
            }
          >
            {initialLoading && (
              <div
                className={
                  styles.loadingList
                }
                role="status"
                aria-label="Loading comments"
              >
                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={
                        item
                      }
                      className={
                        styles.commentSkeleton
                      }
                    >
                      <div
                        className={
                          styles.skeletonAvatar
                        }
                      />

                      <div
                        className={
                          styles.skeletonText
                        }
                      >
                        <span />
                        <span />
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {!initialLoading &&
              error && (
                <div
                  className={
                    styles.errorState
                  }
                  role="alert"
                >
                  <AlertCircle
                    size={28}
                  />

                  <p>
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      void loadComments();
                    }}
                  >
                    Try Again
                  </button>
                </div>
              )}

            {emptyState && (
              <div
                className={
                  styles.emptyState
                }
              >
                <MessageCircleIcon />

                <h3>
                  No comments yet
                </h3>

                <p>
                  Be the first to
                  share a comment.
                </p>
              </div>
            )}

            {!initialLoading &&
              !error &&
              comments.map(
                (comment) => {
                  const commentId =
                    normalizeId(
                      comment
                    );

                  const commentUser =
                    comment?.user ||
                    {};

                  const commentUserId =
                    normalizeId(
                      commentUser
                    );

                  const canDelete =
                    Boolean(
                      currentUserId &&
                      (
                        currentUserId ===
                        commentUserId ||
                        currentUserId ===
                        postOwnerId
                      )
                    );

                  return (
                    <article
                      key={
                        commentId
                      }
                      className={
                        styles.comment
                      }
                    >
                      <img
                        src={
                          commentUser
                            ?.profilePic ||
                          DefaultAvatar
                        }
                        alt={
                          commentUser
                            ?.username ||
                          "User"
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
                          styles.commentBody
                        }
                      >
                        <div
                          className={
                            styles.commentHeader
                          }
                        >
                          <div>
                            <h4>
                              @
                              {commentUser
                                ?.username ||
                                "user"}
                            </h4>

                            {commentUser
                              ?.name && (
                                <span>
                                  {
                                    commentUser.name
                                  }
                                </span>
                              )}
                          </div>

                          {canDelete && (
                            <div
                              className={
                                styles.commentMenuWrapper
                              }
                              onClick={(
                                event
                              ) =>
                                event.stopPropagation()
                              }
                            >
                              <button
                                type="button"
                                className={
                                  styles.commentMenuButton
                                }
                                onClick={() =>
                                  setActiveMenuId(
                                    (
                                      currentId
                                    ) =>
                                      currentId ===
                                        commentId
                                        ? ""
                                        : commentId
                                  )
                                }
                                disabled={
                                  Boolean(
                                    deletingCommentId
                                  )
                                }
                                aria-label="Comment options"
                                aria-expanded={
                                  activeMenuId ===
                                  commentId
                                }
                              >
                                <MoreHorizontal
                                  size={18}
                                />
                              </button>

                              {activeMenuId ===
                                commentId && (
                                  <div
                                    className={
                                      styles.commentMenu
                                    }
                                    role="menu"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleDeleteComment(
                                          commentId
                                        );
                                      }}
                                      disabled={
                                        deletingCommentId ===
                                        commentId
                                      }
                                      role="menuitem"
                                    >
                                      <Trash2
                                        size={16}
                                      />

                                      <span>
                                        {deletingCommentId ===
                                          commentId
                                          ? "Deleting..."
                                          : "Delete"}
                                      </span>
                                    </button>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>

                        <p>
                          {
                            comment?.text
                          }
                        </p>
                      </div>
                    </article>
                  );
                }
              )}

            <div
              ref={
                commentsEndRef
              }
            />
          </div>

          <form
            className={
              styles.inputArea
            }
            onSubmit={
              handleSubmit
            }
          >
            <div
              className={
                styles.inputWrapper
              }
            >
              <input
                ref={
                  inputRef
                }
                type="text"
                placeholder="Write a comment..."
                value={
                  text
                }
                maxLength={
                  MAX_COMMENT_LENGTH
                }
                onChange={(
                  event
                ) =>
                  setText(
                    event.target
                      .value
                  )
                }
                disabled={
                  submitting
                }
                aria-label="Write a comment"
              />

              <span
                className={
                  styles.characterCount
                }
              >
                {text.length}/
                {
                  MAX_COMMENT_LENGTH
                }
              </span>
            </div>

            <button
              type="submit"
              className={
                styles.sendButton
              }
              disabled={
                !canSubmit
              }
              aria-label="Send comment"
            >
              <Send
                size={18}
              />

              <span>
                {submitting
                  ? "Sending"
                  : "Send"}
              </span>
            </button>
          </form>
        </section>
      </div>

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
              size={18}
            />
          ) : (
            <CheckCircle2
              size={18}
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
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
};

const MessageCircleIcon =
  () => (
    <div
      aria-hidden="true"
      style={{
        fontSize: "36px",
        lineHeight: 1,
      }}
    >
      💬
    </div>
  );

export default CommentModal;
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  getPosts,
} from "../../services/postService";

import PostCard from "./PostCard";

import styles from "./Feed.module.css";

/* =========================
   FEED CACHE CONFIG
========================= */

const FEED_CACHE_PREFIX =
  "pingme:feed:";

const NEW_POST_CACHE_KEY =
  "pingme:new-post";

const FEED_CACHE_MAX_AGE =
  30 * 60 * 1000;

const MAX_CACHED_POSTS = 40;

/*
 * React StrictMode lo duplicate
 * getPosts requests prevent chesthundi.
 */
const inFlightRequests =
  new Map();

/* =========================
   HELPERS
========================= */

const normalizeId = (
  value
) =>
  String(
    value?._id ??
    value?.id ??
    value ??
    ""
  ).trim();

const getFeedCacheKey = (
  userId
) =>
  `${FEED_CACHE_PREFIX}${normalizeId(userId) ||
  "anonymous"
  }`;

const prependUniquePost = (
  currentPosts,
  incomingPost
) => {
  const safeCurrentPosts =
    Array.isArray(currentPosts)
      ? currentPosts
      : [];

  if (
    !incomingPost ||
    typeof incomingPost !==
    "object"
  ) {
    return safeCurrentPosts;
  }

  const incomingPostId =
    normalizeId(
      incomingPost
    );

  if (!incomingPostId) {
    return safeCurrentPosts;
  }

  const remainingPosts =
    safeCurrentPosts.filter(
      (post) =>
        normalizeId(
          post
        ) !==
        incomingPostId
    );

  return [
    incomingPost,
    ...remainingPosts,
  ];
};

/* =========================
   READ FEED CACHE
========================= */

const readFeedCache = (
  userId
) => {
  try {
    const cacheKey =
      getFeedCacheKey(
        userId
      );

    const storedValue =
      sessionStorage.getItem(
        cacheKey
      );

    if (!storedValue) {
      return [];
    }

    const parsedValue =
      JSON.parse(
        storedValue
      );

    const savedAt =
      Number(
        parsedValue?.savedAt
      );

    const cachedPosts =
      parsedValue?.posts;

    if (
      !savedAt ||
      !Array.isArray(
        cachedPosts
      ) ||
      Date.now() - savedAt >
      FEED_CACHE_MAX_AGE
    ) {
      sessionStorage.removeItem(
        cacheKey
      );

      return [];
    }

    return cachedPosts;
  } catch (error) {
    console.warn(
      "READ FEED CACHE ERROR:",
      error
    );

    return [];
  }
};

/* =========================
   WRITE FEED CACHE
========================= */

const writeFeedCache = (
  userId,
  posts
) => {
  try {
    const cacheKey =
      getFeedCacheKey(
        userId
      );

    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        savedAt:
          Date.now(),

        posts:
          Array.isArray(
            posts
          )
            ? posts.slice(
              0,
              MAX_CACHED_POSTS
            )
            : [],
      })
    );
  } catch (error) {
    console.warn(
      "WRITE FEED CACHE ERROR:",
      error
    );
  }
};

/* =========================
   READ NEW POST CACHE
========================= */

const readPendingNewPost =
  () => {
    try {
      const storedPost =
        sessionStorage.getItem(
          NEW_POST_CACHE_KEY
        );

      sessionStorage.removeItem(
        NEW_POST_CACHE_KEY
      );

      if (!storedPost) {
        return null;
      }

      const parsedPost =
        JSON.parse(
          storedPost
        );

      if (
        !parsedPost ||
        typeof parsedPost !==
        "object" ||
        !normalizeId(
          parsedPost
        )
      ) {
        return null;
      }

      return parsedPost;
    } catch (error) {
      console.warn(
        "READ NEW POST CACHE ERROR:",
        error
      );

      sessionStorage.removeItem(
        NEW_POST_CACHE_KEY
      );

      return null;
    }
  };

/* =========================
   DEDUPLICATED REQUEST
========================= */

const requestPosts = (
  userId
) => {
  const requestKey =
    normalizeId(userId) ||
    "anonymous";

  const existingRequest =
    inFlightRequests.get(
      requestKey
    );

  if (existingRequest) {
    return existingRequest;
  }

  const request =
    getPosts().finally(
      () => {
        inFlightRequests.delete(
          requestKey
        );
      }
    );

  inFlightRequests.set(
    requestKey,
    request
  );

  return request;
};

/* =========================
   FEED COMPONENT
========================= */

const Feed = forwardRef(
  (
    {
      targetPostId = "",
    },
    ref
  ) => {
    const { user } =
      useAuth();

    const userId =
      normalizeId(
        user?.id ||
        user?._id
      );

    /*
     * /create route nunchi vachina
     * newly created post.
     */
    const pendingNewPostRef =
      useRef(undefined);

    if (
      pendingNewPostRef.current ===
      undefined
    ) {
      pendingNewPostRef.current =
        readPendingNewPost();
    }

    /*
     * Existing feed cache.
     */
    const initialPostsRef =
      useRef(null);

    if (
      initialPostsRef.current ===
      null
    ) {
      const cachedPosts =
        readFeedCache(
          userId
        );

      initialPostsRef.current =
        pendingNewPostRef.current
          ? prependUniquePost(
            cachedPosts,
            pendingNewPostRef.current
          )
          : cachedPosts;
    }

    const [
      posts,
      setPosts,
    ] = useState(
      initialPostsRef.current
    );

    const [
      loading,
      setLoading,
    ] = useState(
      initialPostsRef.current
        .length === 0
    );

    const [
      error,
      setError,
    ] = useState("");

    const postsRef =
      useRef(
        initialPostsRef.current
      );

    const mountedRef =
      useRef(false);

    const requestSequenceRef =
      useRef(0);

    const targetScrollTimerRef =
      useRef(null);

    const highlightTimerRef =
      useRef(null);

    const pendingTargetPostRef =
      useRef(
        normalizeId(targetPostId)
      );

    const [
      highlightedPostId,
      setHighlightedPostId,
    ] = useState("");

    /* =========================
       MOUNT STATE
    ========================= */

    useEffect(() => {
      mountedRef.current =
        true;

      return () => {
        mountedRef.current =
          false;

        requestSequenceRef.current +=
          1;

        if (
          targetScrollTimerRef.current
        ) {
          window.clearTimeout(
            targetScrollTimerRef.current
          );
        }

        if (
          highlightTimerRef.current
        ) {
          window.clearTimeout(
            highlightTimerRef.current
          );
        }
      };
    }, []);

    /* =========================
       SCROLL TO TARGET POST
    ========================= */

    const scrollToPost =
      useCallback(
        (postId) => {
          const normalizedPostId =
            normalizeId(postId);

          if (!normalizedPostId) {
            return false;
          }

          pendingTargetPostRef.current =
            normalizedPostId;

          const escapedPostId =
            typeof CSS !==
              "undefined" &&
              typeof CSS.escape ===
              "function"
              ? CSS.escape(
                normalizedPostId
              )
              : normalizedPostId.replace(
                /["\\]/g,
                "\\$&"
              );

          const targetElement =
            document.querySelector(
              `[data-feed-post-id="${escapedPostId}"]`
            );

          if (!targetElement) {
            return false;
          }

          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });

          setHighlightedPostId(
            normalizedPostId
          );

          if (
            highlightTimerRef.current
          ) {
            window.clearTimeout(
              highlightTimerRef.current
            );
          }

          highlightTimerRef.current =
            window.setTimeout(() => {
              if (mountedRef.current) {
                setHighlightedPostId("");
              }

              highlightTimerRef.current =
                null;
            }, 2200);

          pendingTargetPostRef.current =
            "";

          return true;
        },
        []
      );

    /* =========================
       KEEP POSTS REF UPDATED
    ========================= */

    useEffect(() => {
      postsRef.current =
        posts;

      const pendingPostId =
        normalizeId(
          pendingTargetPostRef.current
        );

      if (!pendingPostId) {
        return;
      }

      const postExists =
        posts.some(
          (post) =>
            normalizeId(post) ===
            pendingPostId
        );

      if (!postExists) {
        return;
      }

      const frame =
        window.requestAnimationFrame(
          () => {
            scrollToPost(
              pendingPostId
            );
          }
        );

      return () => {
        window.cancelAnimationFrame(
          frame
        );
      };
    }, [
      posts,
      scrollToPost,
    ]);


    useEffect(() => {
      const normalizedTargetPostId =
        normalizeId(targetPostId);

      if (!normalizedTargetPostId) {
        return;
      }

      pendingTargetPostRef.current =
        normalizedTargetPostId;

      /*
       * Cached posts already render ayithe
       * next frame lo scroll.
       */
      targetScrollTimerRef.current =
        window.setTimeout(() => {
          scrollToPost(
            normalizedTargetPostId
          );
        }, 80);

      return () => {
        if (
          targetScrollTimerRef.current
        ) {
          window.clearTimeout(
            targetScrollTimerRef.current
          );

          targetScrollTimerRef.current =
            null;
        }
      };
    }, [
      targetPostId,
      scrollToPost,
    ]);

    /* =========================
       STORE INITIAL PENDING POST
    ========================= */

    useEffect(() => {
      if (
        !pendingNewPostRef.current
      ) {
        return;
      }

      writeFeedCache(
        userId,
        postsRef.current
      );
    }, [userId]);

    /* =========================
       LOAD POSTS
    ========================= */

    const loadPosts =
      useCallback(
        async ({
          silent = false,
        } = {}) => {
          const requestSequence =
            ++requestSequenceRef.current;

          if (
            !silent &&
            postsRef.current
              .length === 0
          ) {
            setLoading(true);
          }

          setError("");

          try {
            const data =
              await requestPosts(
                userId
              );

            if (
              !mountedRef.current ||
              requestSequence !==
              requestSequenceRef.current
            ) {
              return;
            }

            const receivedPosts =
              Array.isArray(
                data?.posts
              )
                ? data.posts
                : [];

            const pendingPost =
              pendingNewPostRef.current;

            const pendingPostId =
              normalizeId(
                pendingPost
              );

            const pendingPostExistsOnServer =
              Boolean(
                pendingPostId &&
                receivedPosts.some(
                  (post) =>
                    normalizeId(
                      post
                    ) ===
                    pendingPostId
                )
              );

            let nextPosts =
              receivedPosts;

            /*
             * Backend/API propagation slight delay
             * unna newly created post disappear
             * kakunda top lo retain chesthundi.
             */
            if (
              pendingPost &&
              !pendingPostExistsOnServer
            ) {
              nextPosts =
                prependUniquePost(
                  receivedPosts,
                  pendingPost
                );
            }

            /*
             * Server response lo post vachaka
             * temporary pending reference clear.
             */
            if (
              pendingPostExistsOnServer
            ) {
              pendingNewPostRef.current =
                null;
            }

            postsRef.current =
              nextPosts;

            setPosts(
              nextPosts
            );

            writeFeedCache(
              userId,
              nextPosts
            );
          } catch (
          loadError
          ) {
            if (
              !mountedRef.current ||
              requestSequence !==
              requestSequenceRef.current
            ) {
              return;
            }

            console.error(
              "LOAD POSTS ERROR:",
              loadError.response
                ?.data ||
              loadError.message
            );

            setError(
              loadError.userMessage ||
              loadError.response
                ?.data?.message ||
              "Unable to load posts"
            );
          } finally {
            if (
              mountedRef.current &&
              requestSequence ===
              requestSequenceRef.current
            ) {
              setLoading(false);
            }
          }
        },
        [userId]
      );

    /* =========================
       EXPOSE REFRESH TO PARENT
    ========================= */

    useImperativeHandle(
      ref,
      () => ({
        refreshFeed: () =>
          loadPosts({
            silent:
              postsRef.current
                .length > 0,
          }),

        scrollToPost: (
          postId
        ) => {
          const didScroll =
            scrollToPost(postId);

          /*
           * Current DOM lo post lekapothe
           * latest feed refresh chesi,
           * posts effect dwara scroll.
           */
          if (!didScroll) {
            pendingTargetPostRef.current =
              normalizeId(postId);

            void loadPosts({
              silent:
                postsRef.current
                  .length > 0,
            });
          }

          return didScroll;
        },

        prependPost: (
          incomingPost
        ) => {
          if (
            !incomingPost ||
            typeof incomingPost !==
            "object"
          ) {
            return;
          }

          pendingNewPostRef.current =
            incomingPost;

          setPosts(
            (currentPosts) => {
              const nextPosts =
                prependUniquePost(
                  currentPosts,
                  incomingPost
                );

              postsRef.current =
                nextPosts;

              writeFeedCache(
                userId,
                nextPosts
              );

              return nextPosts;
            }
          );
        },
      }),
      [
        loadPosts,
        scrollToPost,
        userId,
      ]
    );

    /* =========================
       INITIAL LOAD
    ========================= */

    useEffect(() => {
      void loadPosts({
        silent:
          initialPostsRef.current
            .length > 0,
      });
    }, [loadPosts]);

    /* =========================
       POST CREATED EVENT
    ========================= */

    useEffect(() => {
      const handlePostCreated =
        (event) => {
          const incomingPost =
            event?.detail?.post ||
            event?.detail;

          if (
            incomingPost &&
            typeof incomingPost ===
            "object"
          ) {
            pendingNewPostRef.current =
              incomingPost;

            setPosts(
              (
                currentPosts
              ) => {
                const nextPosts =
                  prependUniquePost(
                    currentPosts,
                    incomingPost
                  );

                postsRef.current =
                  nextPosts;

                writeFeedCache(
                  userId,
                  nextPosts
                );

                return nextPosts;
              }
            );
          }

          void loadPosts({
            silent:
              postsRef.current
                .length > 0,
          });
        };

      window.addEventListener(
        "postCreated",
        handlePostCreated
      );

      return () => {
        window.removeEventListener(
          "postCreated",
          handlePostCreated
        );
      };
    }, [
      loadPosts,
      userId,
    ]);

    /* =========================
       REMOVE DELETED POST
    ========================= */

    const handlePostDeleted =
      useCallback(
        (
          deletedPostId
        ) => {
          const normalizedPostId =
            normalizeId(
              deletedPostId
            );

          if (
            !normalizedPostId
          ) {
            return;
          }

          if (
            normalizeId(
              pendingNewPostRef
                .current
            ) ===
            normalizedPostId
          ) {
            pendingNewPostRef.current =
              null;
          }

          setPosts(
            (
              currentPosts
            ) => {
              const nextPosts =
                currentPosts.filter(
                  (post) =>
                    normalizeId(
                      post
                    ) !==
                    normalizedPostId
                );

              postsRef.current =
                nextPosts;

              writeFeedCache(
                userId,
                nextPosts
              );

              return nextPosts;
            }
          );
        },
        [userId]
      );

    /* =========================
       INITIAL LOADING
    ========================= */

    if (
      loading &&
      posts.length === 0
    ) {
      return (
        <div
          className={
            styles.feed
          }
        >
          <div
            className={
              styles.state
            }
            role="status"
            aria-live="polite"
          >
            Loading posts...
          </div>
        </div>
      );
    }

    /* =========================
       INITIAL ERROR
    ========================= */

    if (
      error &&
      posts.length === 0
    ) {
      return (
        <div
          className={
            styles.feed
          }
        >
          <div
            className={
              styles.state
            }
            role="alert"
          >
            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={() => {
                void loadPosts();
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    /* =========================
       EMPTY FEED
    ========================= */

    if (
      posts.length === 0
    ) {
      return (
        <div
          className={
            styles.feed
          }
        >
          <div
            className={
              styles.state
            }
          >
            No posts yet.
          </div>
        </div>
      );
    }

    /* =========================
       FEED
    ========================= */

    return (
      <div
        className={
          styles.feed
        }
        aria-busy={
          loading
        }
      >
        {error && (
          <div
            className={
              styles.state
            }
            role="alert"
          >
            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={() => {
                void loadPosts({
                  silent: true,
                });
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {posts.map(
          (post) => {
            const postId =
              normalizeId(
                post
              );

            if (!postId) {
              return null;
            }

            return (
              <div
                key={postId}
                data-feed-post-id={
                  postId
                }
                className={`${styles.postAnchor} ${highlightedPostId ===
                  postId
                  ? styles.postHighlighted
                  : ""
                  }`}
              >
                <PostCard
                  post={post}
                  onDeleted={
                    handlePostDeleted
                  }
                />
              </div>
            );
          }
        )}
      </div>
    );
  }
);

Feed.displayName =
  "Feed";

export default memo(
  Feed
);
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { useAuth } from "../../context/AuthContext";

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

const FEED_CACHE_MAX_AGE =
  30 * 60 * 1000;

const MAX_CACHED_POSTS = 40;

/*
 * Prevent duplicate getPosts requests,
 * especially during React StrictMode.
 */
const inFlightRequests =
  new Map();

const normalizeId = (value) =>
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

/* =========================
   READ FEED CACHE
========================= */

const readFeedCache = (
  userId
) => {
  try {
    const cacheKey =
      getFeedCacheKey(userId);

    const storedValue =
      sessionStorage.getItem(
        cacheKey
      );

    if (!storedValue) {
      return [];
    }

    const parsedValue =
      JSON.parse(storedValue);

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
      getFeedCacheKey(userId);

    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        savedAt: Date.now(),

        posts: Array.isArray(
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
    getPosts().finally(() => {
      inFlightRequests.delete(
        requestKey
      );
    });

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
  (_props, ref) => {
    const { user } = useAuth();

    const userId =
      normalizeId(
        user?.id ||
        user?._id
      );

    const initialPostsRef =
      useRef(null);

    if (
      initialPostsRef.current ===
      null
    ) {
      initialPostsRef.current =
        readFeedCache(
          userId
        );
    }

    const [posts, setPosts] =
      useState(
        initialPostsRef.current
      );

    const [loading, setLoading] =
      useState(
        initialPostsRef.current
          .length === 0
      );

    const [error, setError] =
      useState("");

    const postsRef = useRef(
      initialPostsRef.current
    );

    const mountedRef =
      useRef(false);

    const requestSequenceRef =
      useRef(0);

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
      };
    }, []);

    /* =========================
       KEEP POSTS REF UPDATED
    ========================= */

    useEffect(() => {
      postsRef.current =
        posts;
    }, [posts]);

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

            const nextPosts =
              Array.isArray(
                data?.posts
              )
                ? data.posts
                : [];

            postsRef.current =
              nextPosts;

            setPosts(nextPosts);

            writeFeedCache(
              userId,
              nextPosts
            );
          } catch (loadError) {
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
      }),
      [loadPosts]
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
            <p>{error}</p>

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
        aria-busy={loading}
      >
        {posts.map(
          (post) => (
            <PostCard
              key={post._id}
              post={post}
              onDeleted={
                handlePostDeleted
              }
            />
          )
        )}
      </div>
    );
  }
);

Feed.displayName = "Feed";


export default memo(Feed);
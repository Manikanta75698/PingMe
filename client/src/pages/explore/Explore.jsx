import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  getExploreUsers,
} from "../../services/userService";

import {
  cancelFollowRequest,
  followUser,
  unfollowUser,
} from "../../services/authService";

import styles from "./Explore.module.css";

const PAGE_LIMIT = 12;

/* =========================
   HELPERS
========================= */

const normalizeId = (value) => {
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
    value?.userId ||
    ""
  );
};

const getUsersFromResponse = (
  response
) => {
  const users =
    response?.data?.users ||
    response?.users;

  return Array.isArray(users)
    ? users
    : [];
};

const getPaginationFromResponse = (
  response
) =>
  response?.data?.pagination ||
  response?.pagination ||
  {};

const getFollowResult = (
  response
) =>
  response?.data &&
    typeof response.data ===
    "object"
    ? response.data
    : response || {};

/* =========================
   EXPLORE
========================= */

const Explore = () => {
  const navigate =
    useNavigate();

  const searchTimerRef =
    useRef(null);

  const requestIdRef =
    useRef(0);

  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    hasMore,
    setHasMore,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    processingUserId,
    setProcessingUserId,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState(null);

  /* =========================
     TOAST AUTO CLEAR
  ========================= */

  useEffect(() => {
    if (!actionMessage) {
      return undefined;
    }

    const timeout =
      window.setTimeout(() => {
        setActionMessage(null);
      }, 3000);

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [actionMessage]);

  /* =========================
     SEARCH DEBOUNCE
  ========================= */

  useEffect(() => {
    window.clearTimeout(
      searchTimerRef.current
    );

    searchTimerRef.current =
      window.setTimeout(() => {
        setSearchQuery(
          searchInput.trim()
        );

        setPage(1);
      }, 350);

    return () => {
      window.clearTimeout(
        searchTimerRef.current
      );
    };
  }, [searchInput]);

  /* =========================
     LOAD EXPLORE USERS
  ========================= */

  const loadExploreUsers =
    useCallback(
      async ({
        targetPage = 1,
        append = false,
      } = {}) => {
        const currentRequestId =
          requestIdRef.current + 1;

        requestIdRef.current =
          currentRequestId;

        try {
          if (append) {
            setLoadingMore(true);
          } else {
            setLoading(true);
            setError("");
          }

          const response =
            await getExploreUsers({
              search:
                searchQuery,

              page:
                targetPage,

              limit:
                PAGE_LIMIT,
            });

          if (
            requestIdRef.current !==
            currentRequestId
          ) {
            return;
          }

          const loadedUsers =
            getUsersFromResponse(
              response
            );

          const pagination =
            getPaginationFromResponse(
              response
            );

          setUsers((previous) => {
            if (!append) {
              return loadedUsers;
            }

            const combinedUsers = [
              ...previous,
              ...loadedUsers,
            ];

            return Array.from(
              new Map(
                combinedUsers.map(
                  (user) => [
                    normalizeId(user),
                    user,
                  ]
                )
              ).values()
            );
          });

          setPage(targetPage);

          setHasMore(
            Boolean(
              pagination?.hasMore
            )
          );
        } catch (loadError) {
          if (
            requestIdRef.current !==
            currentRequestId
          ) {
            return;
          }

          console.error(
            "LOAD EXPLORE USERS ERROR:",
            loadError?.response?.data ||
            loadError?.message
          );

          const message =
            loadError?.response?.data
              ?.message ||
            "Unable to load people";

          if (append) {
            setActionMessage({
              type: "error",
              text: message,
            });
          } else {
            setError(message);
            setUsers([]);
            setHasMore(false);
          }
        } finally {
          if (
            requestIdRef.current ===
            currentRequestId
          ) {
            setLoading(false);
            setLoadingMore(false);
          }
        }
      },
      [searchQuery]
    );

  useEffect(() => {
    loadExploreUsers({
      targetPage: 1,
      append: false,
    });
  }, [loadExploreUsers]);

  /* =========================
     LOCAL USER UPDATE
  ========================= */

  const updateExploreUser =
    useCallback(
      (
        userId,
        updates
      ) => {
        const safeUserId =
          normalizeId(userId);

        setUsers((previous) =>
          previous.map((user) =>
            normalizeId(user) ===
              safeUserId
              ? {
                ...user,
                ...updates,
              }
              : user
          )
        );
      },
      []
    );

  /* =========================
     FOLLOW ACTION
  ========================= */

  const handleFollow = async (
    user
  ) => {
    const userId =
      normalizeId(user);

    if (
      !userId ||
      processingUserId
    ) {
      return;
    }

    const previousStatus =
      user?.relationshipStatus ||
      "none";

    try {
      setProcessingUserId(
        userId
      );

      const response =
        await followUser(
          userId
        );

      const data =
        getFollowResult(
          response
        );

      const responseStatus =
        String(
          data?.relationshipStatus ||
          data?.status ||
          ""
        )
          .trim()
          .toLowerCase();

      const isRequested =
        responseStatus ===
        "requested" ||
        responseStatus ===
        "pending" ||
        Boolean(
          data?.requestId ||
          data?.followRequest?._id
        );

      const nextStatus =
        isRequested
          ? "requested"
          : "following";

      const nextRequestId =
        normalizeId(
          data?.requestId ||
          data?.followRequest
        ) || null;

      updateExploreUser(
        userId,
        {
          relationshipStatus:
            nextStatus,

          requestId:
            nextRequestId,

          followersCount:
            nextStatus ===
              "following"
              ? Number(
                user
                  ?.followersCount
              ) + 1
              : Number(
                user
                  ?.followersCount
              ) || 0,
        }
      );

      setActionMessage({
        type: "success",

        text:
          nextStatus ===
            "requested"
            ? "Follow request sent"
            : previousStatus ===
              "follows_you"
              ? "Followed back"
              : "Following",
      });
    } catch (followError) {
      console.error(
        "EXPLORE FOLLOW ERROR:",
        followError?.response?.data ||
        followError?.message
      );

      setActionMessage({
        type: "error",

        text:
          followError?.response?.data
            ?.message ||
          "Unable to follow user",
      });
    } finally {
      setProcessingUserId("");
    }
  };

  /* =========================
     UNFOLLOW ACTION
  ========================= */

  const handleUnfollow = async (
    user
  ) => {
    const userId =
      normalizeId(user);

    if (
      !userId ||
      processingUserId
    ) {
      return;
    }

    try {
      setProcessingUserId(
        userId
      );

      await unfollowUser(
        userId
      );

      updateExploreUser(
        userId,
        {
          relationshipStatus:
            user?.followsYou
              ? "follows_you"
              : "none",

          requestId: null,

          followersCount:
            Math.max(
              0,
              Number(
                user
                  ?.followersCount
              ) - 1
            ),
        }
      );

      setActionMessage({
        type: "success",
        text: "Unfollowed",
      });
    } catch (unfollowError) {
      console.error(
        "EXPLORE UNFOLLOW ERROR:",
        unfollowError
          ?.response?.data ||
        unfollowError?.message
      );

      setActionMessage({
        type: "error",

        text:
          unfollowError?.response
            ?.data?.message ||
          "Unable to unfollow user",
      });
    } finally {
      setProcessingUserId("");
    }
  };

  /* =========================
     CANCEL REQUEST
  ========================= */

  const handleCancelRequest =
    async (
      user
    ) => {
      const userId =
        normalizeId(user);

      const requestId =
        normalizeId(
          user?.requestId
        );

      if (
        !userId ||
        !requestId ||
        processingUserId
      ) {
        setActionMessage({
          type: "error",
          text:
            "Follow request ID is missing",
        });

        return;
      }

      try {
        setProcessingUserId(
          userId
        );

        await cancelFollowRequest(
          requestId
        );

        updateExploreUser(
          userId,
          {
            relationshipStatus:
              user?.followsYou
                ? "follows_you"
                : "none",

            requestId: null,
          }
        );

        setActionMessage({
          type: "success",
          text:
            "Follow request cancelled",
        });
      } catch (cancelError) {
        console.error(
          "CANCEL EXPLORE REQUEST ERROR:",
          cancelError
            ?.response?.data ||
          cancelError?.message
        );

        setActionMessage({
          type: "error",

          text:
            cancelError?.response
              ?.data?.message ||
            "Unable to cancel request",
        });
      } finally {
        setProcessingUserId("");
      }
    };

  /* =========================
     RELATIONSHIP BUTTON
  ========================= */

  const renderActionButton = (
    user
  ) => {
    const userId =
      normalizeId(user);

    const status =
      user?.relationshipStatus ||
      "none";

    const isProcessing =
      processingUserId ===
      userId;

    if (
      status === "following"
    ) {
      return (
        <button
          type="button"
          className={
            styles.followingButton
          }
          onClick={() =>
            handleUnfollow(user)
          }
          disabled={isProcessing}
        >
          {isProcessing ? (
            <LoaderCircle
              size={17}
              className={
                styles.spinner
              }
            />
          ) : (
            <span>Following</span>
          )}
        </button>
      );
    }

    if (
      status === "requested"
    ) {
      return (
        <button
          type="button"
          className={
            styles.requestedButton
          }
          onClick={() =>
            handleCancelRequest(
              user
            )
          }
          disabled={isProcessing}
        >
          {isProcessing ? (
            <LoaderCircle
              size={17}
              className={
                styles.spinner
              }
            />
          ) : (
            <span>Requested</span>
          )}
        </button>
      );
    }

    return (
      <button
        type="button"
        className={
          styles.followButton
        }
        onClick={() =>
          handleFollow(user)
        }
        disabled={isProcessing}
      >
        {isProcessing ? (
          <LoaderCircle
            size={17}
            className={
              styles.spinner
            }
          />
        ) : (
          <>
            <UserPlus size={17} />

            <span>
              {status ===
                "follows_you"
                ? "Follow Back"
                : "Follow"}
            </span>
          </>
        )}
      </button>
    );
  };

  /* =========================
     CLEAR SEARCH
  ========================= */

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  /* =========================
     UI
  ========================= */

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section
          className={
            styles.hero
          }
        >
          <div
            className={
              styles.heroIcon
            }
          >
            <Users size={25} />
          </div>

          <div>
            <h1>Explore People</h1>

            <p>
              Discover new people and
              grow your connections.
            </p>
          </div>
        </section>

        <div
          className={
            styles.searchWrapper
          }
        >
          <Search
            size={19}
            className={
              styles.searchIcon
            }
          />

          <input
            type="search"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(
                event.target.value
              )
            }
            placeholder="Search by name or username"
            aria-label="Search people"
          />

          {searchInput && (
            <button
              type="button"
              className={
                styles.clearSearch
              }
              onClick={
                clearSearch
              }
              aria-label="Clear search"
            >
              <X size={17} />
            </button>
          )}
        </div>

        {loading ? (
          <div
            className={
              styles.stateCard
            }
          >
            <LoaderCircle
              size={31}
              className={
                styles.spinner
              }
            />

            <h2>
              Finding people
            </h2>

            <p>
              Loading suggestions for
              you.
            </p>
          </div>
        ) : error ? (
          <div
            className={
              styles.stateCard
            }
          >
            <RefreshCw size={30} />

            <h2>
              Unable to load people
            </h2>

            <p>{error}</p>

            <button
              type="button"
              className={
                styles.retryButton
              }
              onClick={() =>
                loadExploreUsers({
                  targetPage: 1,
                  append: false,
                })
              }
            >
              <RefreshCw
                size={17}
              />

              <span>Try Again</span>
            </button>
          </div>
        ) : users.length === 0 ? (
          <div
            className={
              styles.stateCard
            }
          >
            <Users size={31} />

            <h2>
              {searchQuery
                ? "No people found"
                : "No suggestions yet"}
            </h2>

            <p>
              {searchQuery
                ? "Try another name or username."
                : "New suggestions will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div
              className={
                styles.grid
              }
            >
              {users.map((user) => {
                const userId =
                  normalizeId(user);

                return (
                  <article
                    key={userId}
                    className={
                      styles.userCard
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.profileArea
                      }
                      onClick={() =>
                        navigate(
                          `/user/${encodeURIComponent(
                            user
                              ?.username ||
                            ""
                          )}`
                        )
                      }
                      disabled={
                        !user?.username
                      }
                    >
                      <div
                        className={
                          styles.avatarWrapper
                        }
                      >
                        <img
                          src={
                            user
                              ?.profilePic ||
                            DefaultAvatar
                          }
                          alt={
                            user?.name ||
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

                        {user?.isOnline && (
                          <span
                            className={
                              styles.onlineDot
                            }
                            aria-label="Online"
                          />
                        )}
                      </div>

                      <div
                        className={
                          styles.userDetails
                        }
                      >
                        <div
                          className={
                            styles.nameRow
                          }
                        >
                          <h2>
                            {user?.name ||
                              "User"}
                          </h2>

                          {user
                            ?.privateAccount && (
                              <LockKeyhole
                                size={14}
                              />
                            )}
                        </div>

                        <span>
                          @
                          {user
                            ?.username ||
                            "user"}
                        </span>

                        {user?.bio && (
                          <p
                            className={
                              styles.bio
                            }
                          >
                            {user.bio}
                          </p>
                        )}

                        <div
                          className={
                            styles.meta
                          }
                        >
                          <span>
                            <strong>
                              {Number(
                                user
                                  ?.followersCount
                              ) || 0}
                            </strong>{" "}
                            followers
                          </span>

                          {Number(
                            user
                              ?.mutualFollowersCount
                          ) > 0 && (
                              <span>
                                <strong>
                                  {
                                    user
                                      .mutualFollowersCount
                                  }
                                </strong>{" "}
                                mutual
                              </span>
                            )}

                          {user
                            ?.followsYou && (
                              <span
                                className={
                                  styles.followsYou
                                }
                              >
                                Follows you
                              </span>
                            )}
                        </div>
                      </div>
                    </button>

                    <div
                      className={
                        styles.cardAction
                      }
                    >
                      {renderActionButton(
                        user
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <div
                className={
                  styles.loadMoreWrapper
                }
              >
                <button
                  type="button"
                  className={
                    styles.loadMoreButton
                  }
                  onClick={() =>
                    loadExploreUsers({
                      targetPage:
                        page + 1,

                      append: true,
                    })
                  }
                  disabled={
                    loadingMore
                  }
                >
                  {loadingMore ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className={
                          styles.spinner
                        }
                      />

                      <span>
                        Loading
                      </span>
                    </>
                  ) : (
                    <span>
                      Load More
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {actionMessage && (
        <div
          className={`${styles.toast} ${actionMessage.type ===
            "error"
            ? styles.toastError
            : styles.toastSuccess
            }`}
          role={
            actionMessage.type ===
              "error"
              ? "alert"
              : "status"
          }
        >
          {actionMessage.text}
        </div>
      )}
    </div>
  );
};

export default Explore;
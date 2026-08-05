import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
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
  getCurrentIntent,
  getCurrentMood,
  unfollowUser,
  updateCurrentIntent,
  updateCurrentMood,
} from "../../services/authService";

import styles from "./Explore.module.css";

const PAGE_LIMIT = 12;

const MOOD_STORAGE_KEY =
  "pingme-selected-mood";

const INTENT_STORAGE_KEY =
  "pingme-selected-intent";

const INTENT_ACTIVE_DURATION =
  60 * 60 * 1000;

const INTENTS = [
  {
    id: "chat",
    emoji: "💬",
    label: "Chat",
    title: "People ready to chat",
    description:
      "Meet people who are available for a conversation right now.",
  },
  {
    id: "gaming",
    emoji: "🎮",
    label: "Gaming",
    title: "Find a gaming buddy",
    description:
      "Connect with people who want to play and talk about games.",
  },
  {
    id: "study",
    emoji: "📚",
    label: "Study",
    title: "Study together",
    description:
      "Find learners who want company, motivation, or help.",
  },
  {
    id: "music",
    emoji: "🎵",
    label: "Music",
    title: "Share music",
    description:
      "Meet people who want to exchange songs and music recommendations.",
  },
  {
    id: "fun",
    emoji: "😂",
    label: "Fun",
    title: "Have some fun",
    description:
      "Find people interested in memes, jokes, and casual conversations.",
  },
  {
    id: "advice",
    emoji: "🧠",
    label: "Advice",
    title: "Talk and get advice",
    description:
      "Connect with people who are ready to listen and share ideas.",
  },
];

const MOODS = [
  {
    id: "happy",
    emoji: "😊",
    label: "Happy",
    title: "Share the good energy",
    description:
      "Discover positive people and cheerful conversations.",
    keywords: [
      "happy",
      "positive",
      "fun",
      "smile",
      "travel",
      "friends",
      "music",
    ],
  },
  {
    id: "chill",
    emoji: "😌",
    label: "Chill",
    title: "Keep it calm",
    description:
      "Find relaxed people and easy-going conversations.",
    keywords: [
      "chill",
      "calm",
      "peace",
      "nature",
      "music",
      "movies",
      "coffee",
    ],
  },
  {
    id: "bored",
    emoji: "🥱",
    label: "Bored",
    title: "Find something interesting",
    description:
      "Meet active people and discover something new.",
    keywords: [
      "gaming",
      "games",
      "movies",
      "fun",
      "chat",
      "sports",
      "memes",
    ],
  },
  {
    id: "focused",
    emoji: "🎯",
    label: "Focused",
    title: "Connect with motivated people",
    description:
      "Discover creators, learners and goal-driven people.",
    keywords: [
      "student",
      "developer",
      "coding",
      "business",
      "fitness",
      "learning",
      "creator",
    ],
  },
  {
    id: "low",
    emoji: "🌧️",
    label: "Low",
    title: "You are not alone",
    description:
      "Discover kind people and supportive conversations.",
    keywords: [
      "kind",
      "support",
      "friend",
      "listener",
      "peace",
      "motivation",
      "positive",
    ],
  },
  {
    id: "excited",
    emoji: "⚡",
    label: "Excited",
    title: "Match your energy",
    description:
      "Find adventurous and energetic people.",
    keywords: [
      "adventure",
      "travel",
      "sports",
      "fitness",
      "party",
      "creator",
      "photography",
    ],
  },
];


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

const getSameMoodTotal = (
  response
) =>
  Number(
    response?.data?.sameMoodTotal ??
    response?.sameMoodTotal ??
    0
  );

const getSameIntentTotal = (
  response
) =>
  Number(
    response?.data?.sameIntentTotal ??
    response?.sameIntentTotal ??
    0
  );

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
    sameIntentTotal,
    setSameIntentTotal,
  ] = useState(0);

  const [
    sameMoodTotal,
    setSameMoodTotal,
  ] = useState(0);

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


  const [
    selectedIntent,
    setSelectedIntent,
  ] = useState(() => {
    try {
      return (
        window.localStorage.getItem(
          INTENT_STORAGE_KEY
        ) || ""
      );
    } catch {
      return "";
    }
  });

  const [
    intentLoading,
    setIntentLoading,
  ] = useState(true);

  const [
    intentSaving,
    setIntentSaving,
  ] = useState(false);

  const [
    selectedMood,
    setSelectedMood,
  ] = useState(() => {
    try {
      return (
        window.localStorage.getItem(
          MOOD_STORAGE_KEY
        ) || ""
      );
    } catch {
      return "";
    }
  });


  const [
    moodLoading,
    setMoodLoading,
  ] = useState(true);

  const [
    moodSaving,
    setMoodSaving,
  ] = useState(false);


  /* =========================
     LOAD SAVED INTENT
  ========================= */

  useEffect(() => {
    let isMounted = true;

    const loadSavedIntent = async () => {
      try {
        setIntentLoading(true);

        const response =
          await getCurrentIntent();

        if (!isMounted) {
          return;
        }

        const savedIntent =
          typeof response?.currentIntent ===
            "string"
            ? response.currentIntent
              .trim()
              .toLowerCase()
            : "";

        const intentUpdatedAt =
          response?.intentUpdatedAt
            ? new Date(
              response.intentUpdatedAt
            ).getTime()
            : 0;

        const intentIsActive =
          Boolean(
            savedIntent &&
            intentUpdatedAt &&
            Date.now() -
            intentUpdatedAt <
            INTENT_ACTIVE_DURATION
          );

        const activeSavedIntent =
          intentIsActive
            ? savedIntent
            : "";

        setSelectedIntent(
          activeSavedIntent
        );

        try {
          if (activeSavedIntent) {
            window.localStorage.setItem(
              INTENT_STORAGE_KEY,
              activeSavedIntent
            );
          } else {
            window.localStorage.removeItem(
              INTENT_STORAGE_KEY
            );
          }
        } catch {
          // Local storage backup is optional.
        }
      } catch (loadIntentError) {
        console.error(
          "LOAD INTENT ERROR:",
          loadIntentError?.response?.data ||
          loadIntentError?.message
        );
      } finally {
        if (isMounted) {
          setIntentLoading(false);
        }
      }
    };

    loadSavedIntent();

    return () => {
      isMounted = false;
    };
  }, []);


  /* =========================
   LOAD SAVED MOOD
========================= */

  useEffect(() => {
    let isMounted = true;

    const loadSavedMood = async () => {
      try {
        setMoodLoading(true);

        const response =
          await getCurrentMood();

        if (!isMounted) {
          return;
        }

        const savedMood =
          typeof response?.mood === "string"
            ? response.mood
              .trim()
              .toLowerCase()
            : "";

        const moodUpdatedAt =
          response?.moodUpdatedAt
            ? new Date(
              response.moodUpdatedAt
            ).getTime()
            : 0;

        const moodIsActive =
          Boolean(
            savedMood &&
            moodUpdatedAt &&
            Date.now() - moodUpdatedAt <
            24 * 60 * 60 * 1000
          );

        const activeSavedMood =
          moodIsActive
            ? savedMood
            : "";

        setSelectedMood(
          activeSavedMood
        );

        try {
          if (activeSavedMood) {
            window.localStorage.setItem(
              MOOD_STORAGE_KEY,
              activeSavedMood
            );
          } else {
            window.localStorage.removeItem(
              MOOD_STORAGE_KEY
            );
          }
        } catch {
          // Local storage backup is optional.
        }
      } catch (loadMoodError) {
        console.error(
          "LOAD MOOD ERROR:",
          loadMoodError?.response?.data ||
          loadMoodError?.message
        );
      } finally {
        if (isMounted) {
          setMoodLoading(false);
        }
      }
    };

    loadSavedMood();

    return () => {
      isMounted = false;
    };
  }, []);

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

          const intentMatchTotal =
            getSameIntentTotal(
              response
            );

          const moodMatchTotal =
            getSameMoodTotal(
              response
            );

          setSameIntentTotal(
            intentMatchTotal
          );

          setSameMoodTotal(
            moodMatchTotal
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
   REAL-TIME INTENT UPDATES
========================= */

  useEffect(() => {
    const handleIntentUpdate = () => {
      loadExploreUsers({
        targetPage: 1,
        append: false,
      });
    };

    window.addEventListener(
      "user-intent:updated",
      handleIntentUpdate
    );

    return () => {
      window.removeEventListener(
        "user-intent:updated",
        handleIntentUpdate
      );
    };
  }, [loadExploreUsers]);


  /* =========================
   REAL-TIME MOOD UPDATES
========================= */

  useEffect(() => {
    const handleMoodMatchUpdate = () => {
      loadExploreUsers({
        targetPage: 1,
        append: false,
      });
    };

    window.addEventListener(
      "user-mood:updated",
      handleMoodMatchUpdate
    );

    window.addEventListener(
      "user-mood-privacy:updated",
      handleMoodMatchUpdate
    );

    return () => {
      window.removeEventListener(
        "user-mood:updated",
        handleMoodMatchUpdate
      );

      window.removeEventListener(
        "user-mood-privacy:updated",
        handleMoodMatchUpdate
      );
    };
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
   FIND SOMEONE NOW
========================= */

  const activeIntent = useMemo(
    () =>
      INTENTS.find(
        (intent) =>
          intent.id === selectedIntent
      ) || null,
    [selectedIntent]
  );

  const loadedSameIntentCount =
    useMemo(
      () =>
        users.filter(
          (user) => user?.sameIntent
        ).length,
      [users]
    );

  const effectiveSameIntentTotal =
    sameIntentTotal > 0
      ? sameIntentTotal
      : loadedSameIntentCount;


  /* =========================
     MOOD MATCH
  ========================= */

  const activeMood = useMemo(
    () =>
      MOODS.find(
        (mood) =>
          mood.id === selectedMood
      ) || null,
    [selectedMood]
  );

  const displayedUsers = users;

  const loadedSameMoodCount = useMemo(
    () =>
      users.filter(
        (user) => user?.sameMood
      ).length,
    [users]
  );

  const effectiveSameMoodTotal =
    sameMoodTotal > 0
      ? sameMoodTotal
      : loadedSameMoodCount;

  const handleIntentSelect = async (
    intentId
  ) => {
    if (
      intentSaving ||
      intentLoading
    ) {
      return;
    }

    const previousIntent =
      selectedIntent;

    const nextIntent =
      selectedIntent === intentId
        ? ""
        : intentId;

    setSelectedIntent(nextIntent);
    setIntentSaving(true);

    try {
      const response =
        await updateCurrentIntent(
          nextIntent
        );

      const savedIntent =
        typeof response?.currentIntent ===
          "string"
          ? response.currentIntent
            .trim()
            .toLowerCase()
          : "";

      setSelectedIntent(savedIntent);

      try {
        if (savedIntent) {
          window.localStorage.setItem(
            INTENT_STORAGE_KEY,
            savedIntent
          );
        } else {
          window.localStorage.removeItem(
            INTENT_STORAGE_KEY
          );
        }
      } catch {
        // Local storage backup is optional.
      }

      await loadExploreUsers({
        targetPage: 1,
        append: false,
      });

      setActionMessage({
        type: "success",
        text: savedIntent
          ? response?.message ||
          "Activity updated"
          : "Activity cleared",
      });
    } catch (saveIntentError) {
      console.error(
        "SAVE INTENT ERROR:",
        saveIntentError?.response?.data ||
        saveIntentError?.message
      );

      setSelectedIntent(
        previousIntent
      );

      setActionMessage({
        type: "error",
        text:
          saveIntentError?.response?.data
            ?.message ||
          "Unable to update your activity",
      });
    } finally {
      setIntentSaving(false);
    }
  };

  const clearIntent = async () => {
    if (
      !selectedIntent ||
      intentSaving ||
      intentLoading
    ) {
      return;
    }

    await handleIntentSelect(
      selectedIntent
    );
  };


  const handleMoodSelect = async (
    moodId
  ) => {
    if (moodSaving || moodLoading) {
      return;
    }

    const previousMood = selectedMood;

    const nextMood =
      selectedMood === moodId
        ? ""
        : moodId;

    /*
     * Optimistic update:
     * UI immediate ga change avuthundi.
     */
    setSelectedMood(nextMood);
    setMoodSaving(true);

    try {
      const response =
        await updateCurrentMood(
          nextMood
        );

      const savedMood =
        typeof response?.mood === "string"
          ? response.mood
            .trim()
            .toLowerCase()
          : "";

      setSelectedMood(savedMood);

      try {
        if (savedMood) {
          window.localStorage.setItem(
            MOOD_STORAGE_KEY,
            savedMood
          );
        } else {
          window.localStorage.removeItem(
            MOOD_STORAGE_KEY
          );
        }
      } catch {
        // Local storage backup is optional.
      }

      await loadExploreUsers({
        targetPage: 1,
        append: false,
      });

      setActionMessage({
        type: "success",
        text: savedMood
          ? `${response?.message || "Mood updated"}`
          : "Mood cleared",
      });
    } catch (saveMoodError) {
      console.error(
        "SAVE MOOD ERROR:",
        saveMoodError?.response?.data ||
        saveMoodError?.message
      );

      /*
       * API fail ayithe old mood restore.
       */
      setSelectedMood(previousMood);

      setActionMessage({
        type: "error",
        text:
          saveMoodError?.response?.data
            ?.message ||
          "Unable to update your mood",
      });
    } finally {
      setMoodSaving(false);
    }
  };

  const clearMood = async () => {
    if (
      !selectedMood ||
      moodSaving ||
      moodLoading
    ) {
      return;
    }

    await handleMoodSelect(
      selectedMood
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
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />

        </button>

        <section className={styles.hero}>
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

        <section
          className={
            styles.intentSection
          }
          aria-labelledby="find-someone-title"
        >
          <div
            className={
              styles.intentHeader
            }
          >
            <div>
              <span
                className={
                  styles.intentEyebrow
                }
              >
                Find Someone Now
              </span>

              <h2 id="find-someone-title">
                What do you want to do?
              </h2>

              <p>
                Choose an activity and meet
                people interested in the same
                thing right now.
              </p>
            </div>

            {selectedIntent && (
              <button
                type="button"
                className={
                  styles.clearIntentButton
                }
                onClick={clearIntent}
                disabled={
                  intentSaving ||
                  intentLoading
                }
              >
                Clear
              </button>
            )}
          </div>

          <div
            className={
              styles.intentList
            }
            role="list"
            aria-label="Choose an activity"
          >
            {INTENTS.map((intent) => {
              const isSelected =
                selectedIntent ===
                intent.id;

              return (
                <button
                  key={intent.id}
                  type="button"
                  role="listitem"
                  className={`${styles.intentCard} ${isSelected
                    ? styles.intentCardSelected
                    : ""
                    }`}
                  onClick={() =>
                    handleIntentSelect(
                      intent.id
                    )
                  }
                  aria-pressed={isSelected}
                  disabled={
                    intentSaving ||
                    intentLoading
                  }
                >
                  <span
                    className={
                      styles.intentEmoji
                    }
                    aria-hidden="true"
                  >
                    {intent.emoji}
                  </span>

                  <span
                    className={
                      styles.intentLabel
                    }
                  >
                    {intent.label}
                  </span>
                </button>
              );
            })}
          </div>

          {activeIntent && (
            <div
              className={
                styles.activeIntentBanner
              }
              role="status"
            >
              <span
                className={
                  styles.activeIntentBannerEmoji
                }
                aria-hidden="true"
              >
                {activeIntent.emoji}
              </span>

              <div>
                <strong>
                  {activeIntent.title}
                </strong>

                <p>
                  {effectiveSameIntentTotal > 0
                    ? `${effectiveSameIntentTotal} ${effectiveSameIntentTotal === 1
                      ? "person is"
                      : "people are"
                    } interested right now.`
                    : "No one else selected this activity yet."}
                </p>
              </div>
            </div>
          )}
        </section>

        <section
          className={
            styles.moodSection
          }
          aria-labelledby="mood-match-title"
        >
          <div
            className={
              styles.moodHeader
            }
          >
            <div>
              <span
                className={
                  styles.moodEyebrow
                }
              >
                Mood Match
              </span>

              <h2 id="mood-match-title">
                How are you feeling?
              </h2>

              <p>
                Pick your mood and discover
                people matching your vibe.
              </p>
            </div>

            {selectedMood && (
              <button
                type="button"
                className={
                  styles.clearMoodButton
                }
                onClick={clearMood}
              >
                Clear
              </button>
            )}
          </div>

          <div
            className={
              styles.moodList
            }
            role="list"
            aria-label="Choose your mood"
          >
            {MOODS.map((mood) => {
              const isSelected =
                selectedMood === mood.id;

              return (
                <button
                  key={mood.id}
                  type="button"
                  role="listitem"
                  className={`${styles.moodCard} ${isSelected
                    ? styles.moodCardSelected
                    : ""
                    }`}
                  onClick={() =>
                    handleMoodSelect(mood.id)
                  }
                  aria-pressed={isSelected}
                  disabled={
                    moodSaving || moodLoading
                  }
                >
                  <span
                    className={styles.moodEmoji}
                    aria-hidden="true"
                  >
                    {mood.emoji}
                  </span>

                  <span className={styles.moodLabel}>
                    {mood.label}
                  </span>
                </button>
              );
            })}
          </div>

          {activeMood && (
            <div
              className={
                styles.activeMoodBanner
              }
              role="status"
            >
              <span
                className={
                  styles.activeMoodBannerEmoji
                }
                aria-hidden="true"
              >
                {activeMood.emoji}
              </span>

              <div>
                <strong>
                  {activeMood.title}
                </strong>

                <p>
                  {effectiveSameMoodTotal > 0
                    ? `${effectiveSameMoodTotal} ${effectiveSameMoodTotal === 1
                      ? "person matches"
                      : "people match"
                    } your current vibe.`
                    : "No other people share this vibe yet."}
                </p>
              </div>
            </div>
          )}
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

        {!loading &&
          !error &&
          users.length > 0 && (
            <div className={styles.resultsHeader}>
              <div>
                <h2>
                  {activeIntent &&
                    effectiveSameIntentTotal > 0
                    ? "People for your activity"
                    : activeMood &&
                      effectiveSameMoodTotal > 0
                      ? "People for your vibe"
                      : "People you may know"}
                </h2>

                <p>
                  {activeIntent &&
                    effectiveSameIntentTotal > 0
                    ? `${effectiveSameIntentTotal} ${effectiveSameIntentTotal === 1
                      ? "activity match"
                      : "activity matches"
                    } found`
                    : activeMood &&
                      effectiveSameMoodTotal > 0
                      ? `${effectiveSameMoodTotal} ${effectiveSameMoodTotal === 1
                        ? "mood match"
                        : "mood matches"
                      } found`
                      : "Discover and connect with new people"}
                </p>
              </div>
            </div>
          )}

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
              {displayedUsers.map((user) => {
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
                        <div className={styles.nameRow}>
                          <h2>
                            {user?.name || "User"}
                          </h2>

                          {user?.sameIntent && (
                            <span
                              className={
                                styles.sameActivityBadge
                              }
                            >
                              Same activity
                            </span>
                          )}

                          {user?.sameMood && (
                            <span
                              className={
                                styles.sameVibeBadge
                              }
                            >
                              Same vibe
                            </span>
                          )}

                          {user?.privateAccount && (
                            <LockKeyhole size={14} />
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
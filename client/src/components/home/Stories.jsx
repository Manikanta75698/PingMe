import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  createStory,
  deleteStory,
  getStories,
  viewStory,
} from "../../services/storyService";

import socket from "../../socket/socket";

import DefaultAvatar from "../../assets/default-avatar.png";

import styles from "./Stories.module.css";

const STORY_DURATION_MS = 5000;

/* =========================
   HELPERS
========================= */

const normalizeId = (value) =>
  String(
    value?._id ??
    value?.id ??
    value ??
    ""
  ).trim();

const getStoryUserId = (
  story
) =>
  normalizeId(
    story?.user
  );

const getUserAvatar = (
  user
) => {
  const profilePic =
    user?.profilePic ||
    user?.avatar ||
    user?.photoURL;

  return (
    profilePic ||
    DefaultAvatar
  );
};

const formatStoryTime = (
  value
) => {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const normalizeIncomingStory = (
  story,
  currentUserId
) => {
  if (
    !story ||
    typeof story !== "object"
  ) {
    return null;
  }

  const storyId =
    normalizeId(story);

  const ownerId =
    normalizeId(
      story?.user
    );

  if (
    !storyId ||
    !ownerId ||
    !story?.image
  ) {
    return null;
  }

  const isOwner =
    ownerId ===
    currentUserId;

  return {
    ...story,

    _id: storyId,

    isOwner,

    isViewed:
      isOwner
        ? false
        : Boolean(
          story?.isViewed
        ),
  };
};

/* =========================
   GROUP STORIES BY USER
========================= */

const groupStoriesByUser = (
  stories,
  currentUserId
) => {
  const groupsMap =
    new Map();

  stories.forEach(
    (story) => {
      const userId =
        getStoryUserId(
          story
        );

      if (!userId) return;

      if (
        !groupsMap.has(
          userId
        )
      ) {
        groupsMap.set(
          userId,
          {
            userId,
            user:
              story.user,
            stories: [],
          }
        );
      }

      groupsMap
        .get(userId)
        .stories.push(
          story
        );
    }
  );

  const groups =
    Array.from(
      groupsMap.values()
    ).map((group) => {
      const orderedStories =
        [
          ...group.stories,
        ].sort(
          (
            firstStory,
            secondStory
          ) =>
            new Date(
              firstStory.createdAt
            ).getTime() -
            new Date(
              secondStory.createdAt
            ).getTime()
        );

      return {
        ...group,

        stories:
          orderedStories,

        hasUnviewed:
          orderedStories.some(
            (story) =>
              !story.isViewed &&
              !story.isOwner
          ),
      };
    });

  return groups.sort(
    (
      firstGroup,
      secondGroup
    ) => {
      const firstIsCurrentUser =
        firstGroup.userId ===
        currentUserId;

      const secondIsCurrentUser =
        secondGroup.userId ===
        currentUserId;

      if (
        firstIsCurrentUser !==
        secondIsCurrentUser
      ) {
        return firstIsCurrentUser
          ? -1
          : 1;
      }

      if (
        firstGroup.hasUnviewed !==
        secondGroup.hasUnviewed
      ) {
        return firstGroup.hasUnviewed
          ? -1
          : 1;
      }

      const firstLatest =
        new Date(
          firstGroup.stories.at(
            -1
          )?.createdAt || 0
        ).getTime();

      const secondLatest =
        new Date(
          secondGroup.stories.at(
            -1
          )?.createdAt || 0
        ).getTime();

      return (
        secondLatest -
        firstLatest
      );
    }
  );
};

/* =========================
   STORIES COMPONENT
========================= */

const Stories = () => {
  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const currentUserId =
    normalizeId(user);

  const currentUserAvatar =
    getUserAvatar(user);

  const fileInputRef =
    useRef(null);

  const storyTimerRef =
    useRef(null);

  const initialSocketConnectionRef =
    useRef(false);

  const [
    stories,
    setStories,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    storyPaused,
    setStoryPaused,
  ] = useState(false);

  const [
    progressKey,
    setProgressKey,
  ] = useState(0);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activeGroupIndex,
    setActiveGroupIndex,
  ] = useState(-1);

  const [
    activeStoryIndex,
    setActiveStoryIndex,
  ] = useState(0);

  /* =========================
     GROUPED STORIES
  ========================= */

  const storyGroups =
    useMemo(
      () =>
        groupStoriesByUser(
          stories,
          currentUserId
        ),
      [
        stories,
        currentUserId,
      ]
    );

  const activeGroup =
    activeGroupIndex >= 0
      ? storyGroups[
      activeGroupIndex
      ]
      : null;

  const activeStory =
    activeGroup?.stories?.[
    activeStoryIndex
    ] || null;

  const currentUserGroupIndex =
    storyGroups.findIndex(
      (group) =>
        group.userId ===
        currentUserId
    );

  /* =========================
     LOAD STORIES
  ========================= */

  const loadStories =
    useCallback(
      async ({
        showLoading = false,
      } = {}) => {
        if (showLoading) {
          setLoading(true);
        }

        try {
          setError("");

          const response =
            await getStories();

          const receivedStories =
            Array.isArray(
              response?.stories
            )
              ? response.stories
              : [];

          const normalizedStories =
            receivedStories
              .map((story) =>
                normalizeIncomingStory(
                  story,
                  currentUserId
                )
              )
              .filter(Boolean);

          setStories(
            normalizedStories
          );
        } catch (
        loadError
        ) {
          console.error(
            "LOAD STORIES ERROR:",
            loadError.response
              ?.data ||
            loadError.message
          );

          setError(
            loadError.userMessage ||
            loadError.response
              ?.data?.message ||
            "Unable to load stories"
          );
        } finally {
          setLoading(false);
        }
      },
      [currentUserId]
    );

  useEffect(() => {
    void loadStories({
      showLoading: true,
    });
  }, [loadStories]);

  /* =========================
     REALTIME STORY EVENTS
  ========================= */

  useEffect(() => {
    const handleStoryCreated = (
      payload = {}
    ) => {
      const incomingStory =
        normalizeIncomingStory(
          payload?.story,
          currentUserId
        );

      if (!incomingStory) {
        return;
      }

      const incomingStoryId =
        normalizeId(
          incomingStory
        );

      setStories(
        (currentStories) => {
          const existingIndex =
            currentStories.findIndex(
              (story) =>
                normalizeId(
                  story
                ) ===
                incomingStoryId
            );

          if (
            existingIndex ===
            -1
          ) {
            return [
              incomingStory,
              ...currentStories,
            ];
          }

          return currentStories.map(
            (story) =>
              normalizeId(
                story
              ) ===
                incomingStoryId
                ? {
                  ...story,
                  ...incomingStory,

                  isOwner:
                    getStoryUserId(
                      incomingStory
                    ) ===
                    currentUserId,

                  isViewed:
                    story.isViewed ||
                    incomingStory
                      .isViewed,
                }
                : story
          );
        }
      );
    };

    const handleStoryDeleted = (
      payload = {}
    ) => {
      const deletedStoryId =
        normalizeId(
          payload?.storyId
        );

      if (!deletedStoryId) {
        return;
      }

      setStories(
        (currentStories) =>
          currentStories.filter(
            (story) =>
              normalizeId(
                story
              ) !==
              deletedStoryId
          )
      );

      if (
        normalizeId(
          activeStory
        ) ===
        deletedStoryId
      ) {
        setActiveGroupIndex(
          -1
        );

        setActiveStoryIndex(
          0
        );

        setStoryPaused(false);
      }
    };

    const handleSocketConnect =
      () => {
        /*
         * Initial socket connection time lo
         * already initial API fetch run avutundi.
         * Reconnect ayinappudu missed events sync.
         */
        if (
          !initialSocketConnectionRef
            .current
        ) {
          initialSocketConnectionRef
            .current = true;

          return;
        }

        void loadStories();
      };

    socket.on(
      "storyCreated",
      handleStoryCreated
    );

    socket.on(
      "storyDeleted",
      handleStoryDeleted
    );

    socket.on(
      "connect",
      handleSocketConnect
    );

    return () => {
      socket.off(
        "storyCreated",
        handleStoryCreated
      );

      socket.off(
        "storyDeleted",
        handleStoryDeleted
      );

      socket.off(
        "connect",
        handleSocketConnect
      );
    };
  }, [
    currentUserId,
    activeStory,
    loadStories,
  ]);

  /* =========================
     CLOSE INVALID VIEWER
  ========================= */

  useEffect(() => {
    if (
      activeGroupIndex <
      0
    ) {
      return;
    }

    const group =
      storyGroups[
      activeGroupIndex
      ];

    if (
      !group ||
      !group.stories.length
    ) {
      setActiveGroupIndex(
        -1
      );

      setActiveStoryIndex(
        0
      );

      return;
    }

    if (
      activeStoryIndex >=
      group.stories.length
    ) {
      setActiveStoryIndex(
        Math.max(
          0,
          group.stories.length -
          1
        )
      );
    }
  }, [
    storyGroups,
    activeGroupIndex,
    activeStoryIndex,
  ]);

  /* =========================
     MARK STORY VIEWED
  ========================= */

  const markStoryViewed =
    useCallback(
      async (story) => {
        const storyId =
          normalizeId(
            story
          );

        if (
          !storyId ||
          story?.isViewed ||
          story?.isOwner
        ) {
          return;
        }

        setStories(
          (
            currentStories
          ) =>
            currentStories.map(
              (
                currentStory
              ) =>
                normalizeId(
                  currentStory
                ) === storyId
                  ? {
                    ...currentStory,
                    isViewed:
                      true,
                  }
                  : currentStory
            )
        );

        try {
          await viewStory(
            storyId
          );
        } catch (
        viewError
        ) {
          console.error(
            "VIEW STORY ERROR:",
            viewError.response
              ?.data ||
            viewError.message
          );
        }
      },
      []
    );

  /* =========================
     OPEN STORY GROUP
  ========================= */

  const openStoryGroup =
    useCallback(
      (groupIndex) => {
        const group =
          storyGroups[
          groupIndex
          ];

        if (!group) return;

        const firstUnviewedIndex =
          group.stories.findIndex(
            (story) =>
              !story.isViewed &&
              !story.isOwner
          );

        const nextStoryIndex =
          firstUnviewedIndex >= 0
            ? firstUnviewedIndex
            : 0;

        setActiveGroupIndex(
          groupIndex
        );

        setActiveStoryIndex(
          nextStoryIndex
        );

        setStoryPaused(false);

        void markStoryViewed(
          group.stories[
          nextStoryIndex
          ]
        );
      },
      [
        storyGroups,
        markStoryViewed,
      ]
    );

  /* =========================
     CLOSE VIEWER
  ========================= */

  const closeViewer =
    useCallback(() => {
      if (
        storyTimerRef.current
      ) {
        window.clearTimeout(
          storyTimerRef.current
        );

        storyTimerRef.current =
          null;
      }

      setActiveGroupIndex(
        -1
      );

      setActiveStoryIndex(
        0
      );

      setStoryPaused(false);
    }, []);

  /* =========================
     PROFILE NAVIGATION
  ========================= */

  const handleViewerProfileClick =
    useCallback(() => {
      const storyUser =
        activeGroup?.user;

      if (!storyUser) {
        return;
      }

      closeViewer();

      const storyUserId =
        normalizeId(
          storyUser
        );

      if (
        storyUserId ===
        currentUserId
      ) {
        navigate(
          "/profile"
        );

        return;
      }

      const username =
        String(
          storyUser?.username ||
          ""
        ).trim();

      if (username) {
        navigate(
          `/user/${encodeURIComponent(
            username
          )}`
        );
      }
    }, [
      activeGroup,
      closeViewer,
      currentUserId,
      navigate,
    ]);

  /* =========================
     SHOW STORY
  ========================= */

  const showStory =
    useCallback(
      (
        nextGroupIndex,
        nextStoryIndex
      ) => {
        const group =
          storyGroups[
          nextGroupIndex
          ];

        const story =
          group?.stories?.[
          nextStoryIndex
          ];

        if (!story) return;

        setActiveGroupIndex(
          nextGroupIndex
        );

        setActiveStoryIndex(
          nextStoryIndex
        );

        setStoryPaused(false);

        void markStoryViewed(
          story
        );
      },
      [
        storyGroups,
        markStoryViewed,
      ]
    );

  /* =========================
     PREVIOUS STORY
  ========================= */

  const showPreviousStory =
    useCallback(() => {
      if (!activeGroup) {
        return;
      }

      if (
        activeStoryIndex > 0
      ) {
        showStory(
          activeGroupIndex,
          activeStoryIndex -
          1
        );

        return;
      }

      if (
        activeGroupIndex > 0
      ) {
        const previousGroupIndex =
          activeGroupIndex -
          1;

        const previousGroup =
          storyGroups[
          previousGroupIndex
          ];

        if (!previousGroup) {
          return;
        }

        showStory(
          previousGroupIndex,
          previousGroup
            .stories.length -
          1
        );
      }
    }, [
      activeGroup,
      activeGroupIndex,
      activeStoryIndex,
      storyGroups,
      showStory,
    ]);

  /* =========================
     NEXT STORY
  ========================= */

  const showNextStory =
    useCallback(() => {
      if (!activeGroup) {
        return;
      }

      if (
        activeStoryIndex <
        activeGroup.stories
          .length -
        1
      ) {
        showStory(
          activeGroupIndex,
          activeStoryIndex +
          1
        );

        return;
      }

      if (
        activeGroupIndex <
        storyGroups.length -
        1
      ) {
        showStory(
          activeGroupIndex +
          1,
          0
        );

        return;
      }

      closeViewer();
    }, [
      activeGroup,
      activeGroupIndex,
      activeStoryIndex,
      storyGroups,
      showStory,
      closeViewer,
    ]);

  /* =========================
     RESET PROGRESS
  ========================= */

  useEffect(() => {
    if (!activeStory) {
      return;
    }

    setProgressKey(
      (currentKey) =>
        currentKey + 1
    );

    setStoryPaused(false);
  }, [activeStory]);

  /* =========================
     AUTO NEXT
  ========================= */

  useEffect(() => {
    if (
      !activeStory ||
      storyPaused ||
      deleting
    ) {
      return undefined;
    }

    storyTimerRef.current =
      window.setTimeout(
        () => {
          showNextStory();
        },
        STORY_DURATION_MS
      );

    return () => {
      if (
        storyTimerRef.current
      ) {
        window.clearTimeout(
          storyTimerRef.current
        );

        storyTimerRef.current =
          null;
      }
    };
  }, [
    activeStory,
    storyPaused,
    deleting,
    showNextStory,
  ]);

  /* =========================
     KEYBOARD CONTROLS
  ========================= */

  useEffect(() => {
    if (!activeStory) {
      return undefined;
    }

    const handleKeyDown =
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          closeViewer();
        }

        if (
          event.key ===
          "ArrowLeft"
        ) {
          showPreviousStory();
        }

        if (
          event.key ===
          "ArrowRight"
        ) {
          showNextStory();
        }

        if (
          event.key === " "
        ) {
          event.preventDefault();

          setStoryPaused(
            (current) =>
              !current
          );
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    activeStory,
    closeViewer,
    showPreviousStory,
    showNextStory,
  ]);

  /* =========================
     LOCK BODY SCROLL
  ========================= */

  useEffect(() => {
    if (!activeStory) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow = "hidden";

    return () => {
      document.body.style
        .overflow =
        previousOverflow;
    };
  }, [activeStory]);

  /* =========================
     STORY UPLOAD
  ========================= */

  const handleStoryUpload =
    async (event) => {
      const file =
        event.target
          .files?.[0];

      event.target.value =
        "";

      if (
        !file ||
        uploading
      ) {
        return;
      }

      try {
        setUploading(true);
        setError("");

        const response =
          await createStory(
            file
          );

        const createdStory =
          normalizeIncomingStory(
            response?.story,
            currentUserId
          );

        if (createdStory) {
          setStories(
            (
              currentStories
            ) => {
              const storyId =
                normalizeId(
                  createdStory
                );

              const alreadyExists =
                currentStories.some(
                  (story) =>
                    normalizeId(
                      story
                    ) ===
                    storyId
                );

              if (alreadyExists) {
                return currentStories.map(
                  (story) =>
                    normalizeId(
                      story
                    ) ===
                      storyId
                      ? {
                        ...story,
                        ...createdStory,
                        isOwner:
                          true,
                      }
                      : story
                );
              }

              return [
                {
                  ...createdStory,
                  isOwner: true,
                },
                ...currentStories,
              ];
            }
          );
        }
      } catch (
      uploadError
      ) {
        console.error(
          "CREATE STORY ERROR:",
          uploadError.response
            ?.data ||
          uploadError.message
        );

        setError(
          uploadError.userMessage ||
          uploadError.response
            ?.data?.message ||
          uploadError.message ||
          "Unable to upload story"
        );
      } finally {
        setUploading(false);
      }
    };

  /* =========================
     DELETE STORY
  ========================= */

  const handleDeleteStory =
    async () => {
      const storyId =
        normalizeId(
          activeStory
        );

      if (
        !storyId ||
        !activeStory
          ?.isOwner ||
        deleting
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Delete this story?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeleting(true);
        setStoryPaused(true);

        await deleteStory(
          storyId
        );

        setStories(
          (
            currentStories
          ) =>
            currentStories.filter(
              (story) =>
                normalizeId(
                  story
                ) !== storyId
            )
        );

        closeViewer();
      } catch (
      deleteError
      ) {
        console.error(
          "DELETE STORY ERROR:",
          deleteError.response
            ?.data ||
          deleteError.message
        );

        alert(
          deleteError.userMessage ||
          deleteError.response
            ?.data?.message ||
          "Unable to delete story"
        );

        setStoryPaused(false);
      } finally {
        setDeleting(false);
      }
    };

  /* =========================
     YOUR STORY ACTIONS
  ========================= */

  const handleOwnStoryClick =
    () => {
      if (
        currentUserGroupIndex >=
        0
      ) {
        openStoryGroup(
          currentUserGroupIndex
        );

        return;
      }

      fileInputRef.current
        ?.click();
    };

  const handleAddStoryClick =
    (event) => {
      event.stopPropagation();

      if (uploading) {
        return;
      }

      fileInputRef.current
        ?.click();
    };

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <section
        className={
          styles.container
        }
        aria-label="Stories"
        aria-busy="true"
      >
        {Array.from({
          length: 6,
        }).map(
          (_, index) => (
            <div
              key={index}
              className={
                styles.skeletonItem
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
              />
            </div>
          )
        )}
      </section>
    );
  }

  return (
    <>
      <section
        className={
          styles.container
        }
        aria-label="Stories"
      >
        <div
          className={
            styles.ownStoryItem
          }
        >
          <button
            type="button"
            className={`${styles.story} ${styles.ownStory}`}
            onClick={
              handleOwnStoryClick
            }
            disabled={
              uploading
            }
          >
            <div
              className={
                styles.imageWrapper
              }
            >
              <img
                src={
                  currentUserAvatar
                }
                alt="Your profile"
                onError={(
                  event
                ) => {
                  event.currentTarget.onerror =
                    null;

                  event.currentTarget.src =
                    DefaultAvatar;
                }}
              />

              {uploading && (
                <span
                  className={
                    styles.uploadOverlay
                  }
                  role="status"
                  aria-label="Uploading story"
                >
                  <span
                    className={
                      styles.spinner
                    }
                    aria-hidden="true"
                  />
                </span>
              )}
            </div>

            <p
              className={
                styles.storyName
              }
            >
              Your Story
            </p>
          </button>

          <button
            type="button"
            className={
              styles.addBadge
            }
            onClick={
              handleAddStoryClick
            }
            disabled={
              uploading
            }
            aria-label="Add story"
            title="Add story"
          >
            <Plus />
          </button>
        </div>

        {storyGroups
          .filter(
            (group) =>
              group.userId !==
              currentUserId
          )
          .map((group) => {
            const originalIndex =
              storyGroups.findIndex(
                (item) =>
                  item.userId ===
                  group.userId
              );

            const displayName =
              group.user?.name ||
              group.user
                ?.username ||
              "User";

            return (
              <button
                type="button"
                key={
                  group.userId
                }
                className={`${styles.story} ${group.hasUnviewed
                    ? ""
                    : styles.viewed
                  }`}
                onClick={() =>
                  openStoryGroup(
                    originalIndex
                  )
                }
                aria-label={`View ${displayName} story`}
              >
                <div
                  className={
                    styles.imageWrapper
                  }
                >
                  <img
                    src={getUserAvatar(
                      group.user
                    )}
                    alt={`${displayName} profile`}
                    loading="lazy"
                    onError={(
                      event
                    ) => {
                      event.currentTarget.onerror =
                        null;

                      event.currentTarget.src =
                        DefaultAvatar;
                    }}
                  />
                </div>

                <p
                  className={
                    styles.storyName
                  }
                >
                  {displayName}
                </p>
              </button>
            );
          })}

        <input
          ref={
            fileInputRef
          }
          className={
            styles.fileInput
          }
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={
            handleStoryUpload
          }
        />
      </section>

      {error && (
        <div
          className={
            styles.errorState
          }
          role="alert"
        >
          <span>
            {error}
          </span>

          <button
            type="button"
            className={
              styles.retryButton
            }
            onClick={() => {
              void loadStories({
                showLoading:
                  true,
              });
            }}
          >
            Retry
          </button>
        </div>
      )}

      {activeStory && (
        <div
          className={
            styles.viewerBackdrop
          }
          role="dialog"
          aria-modal="true"
          aria-label="Story viewer"
          onClick={
            closeViewer
          }
        >
          <div
            className={
              styles.viewer
            }
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
            onMouseEnter={() =>
              setStoryPaused(
                true
              )
            }
            onMouseLeave={() =>
              setStoryPaused(
                false
              )
            }
            onPointerDown={() =>
              setStoryPaused(
                true
              )
            }
            onPointerUp={() =>
              setStoryPaused(
                false
              )
            }
            onPointerCancel={() =>
              setStoryPaused(
                false
              )
            }
          >
            <div
              className={
                styles.progressContainer
              }
              aria-hidden="true"
            >
              {activeGroup.stories.map(
                (
                  story,
                  index
                ) => {
                  const storyId =
                    normalizeId(
                      story
                    );

                  const isCompleted =
                    index <
                    activeStoryIndex;

                  const isActive =
                    index ===
                    activeStoryIndex;

                  return (
                    <span
                      key={
                        storyId
                      }
                      className={
                        styles.progressTrack
                      }
                    >
                      <span
                        key={
                          isActive
                            ? `${storyId}-${progressKey}`
                            : storyId
                        }
                        className={`${styles.progressFill} ${isCompleted
                            ? styles.progressCompleted
                            : ""
                          } ${isActive
                            ? styles.progressActive
                            : ""
                          } ${isActive &&
                            storyPaused
                            ? styles.progressPaused
                            : ""
                          }`}
                      />
                    </span>
                  );
                }
              )}
            </div>

            <div
              className={
                styles.viewerHeader
              }
            >
              <button
                type="button"
                className={
                  styles.viewerUser
                }
                onClick={
                  handleViewerProfileClick
                }
                aria-label={`Open ${activeGroup?.user
                    ?.name ||
                  activeGroup?.user
                    ?.username ||
                  "user"
                  } profile`}
              >
                <img
                  src={getUserAvatar(
                    activeGroup?.user
                  )}
                  alt=""
                  onError={(
                    event
                  ) => {
                    event.currentTarget.onerror =
                      null;

                    event.currentTarget.src =
                      DefaultAvatar;
                  }}
                />

                <div>
                  <strong>
                    {activeGroup
                      ?.user
                      ?.name ||
                      activeGroup
                        ?.user
                        ?.username ||
                      "User"}
                  </strong>

                  <span>
                    {formatStoryTime(
                      activeStory.createdAt
                    )}
                  </span>
                </div>
              </button>

              <div
                className={
                  styles.viewerActions
                }
              >
                {activeStory.isOwner && (
                  <button
                    type="button"
                    onClick={
                      handleDeleteStory
                    }
                    disabled={
                      deleting
                    }
                    aria-label="Delete story"
                    title="Delete story"
                  >
                    <Trash2 />
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    closeViewer
                  }
                  aria-label="Close story"
                  title="Close"
                >
                  <X />
                </button>
              </div>
            </div>

            <img
              className={
                styles.viewerImage
              }
              src={
                activeStory.image
              }
              alt="Story"
            />

            {(
              activeStoryIndex >
              0 ||
              activeGroupIndex >
              0
            ) && (
                <button
                  type="button"
                  className={`${styles.viewerNavigation} ${styles.previousButton}`}
                  onClick={
                    showPreviousStory
                  }
                  aria-label="Previous story"
                >
                  <ChevronLeft />
                </button>
              )}

            {(
              activeStoryIndex <
              activeGroup
                .stories
                .length -
              1 ||
              activeGroupIndex <
              storyGroups.length -
              1
            ) && (
                <button
                  type="button"
                  className={`${styles.viewerNavigation} ${styles.nextButton}`}
                  onClick={
                    showNextStory
                  }
                  aria-label="Next story"
                >
                  <ChevronRight />
                </button>
              )}
          </div>
        </div>
      )}
    </>
  );
};

export default memo(
  Stories
);
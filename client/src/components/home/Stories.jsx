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
  Eye,
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
  getStoryViewers,
  viewStory,
} from "../../services/storyService";

import socket from "../../socket/socket";

import DefaultAvatar from "../../assets/default-avatar.png";

import styles from "./Stories.module.css";

import StoryUploadPreview from "../stories/StoryUploadPreview";

import StoryDeleteModal from "../stories/StoryDeleteModal";

import StoryToast from "../stories/StoryToast";

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

const formatViewerTime = (
  value
) => {
  if (!value) {
    return "";
  }

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
    pendingStoryFile,
    setPendingStoryFile,
  ] = useState(null);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    deleteModalOpen,
    setDeleteModalOpen,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] = useState(null);

  const [
    storyPaused,
    setStoryPaused,
  ] = useState(false);

  const [
    progressKey,
    setProgressKey,
  ] = useState(0);

  const [
    loadedStoryId,
    setLoadedStoryId,
  ] = useState("");

  const [
    viewersOpen,
    setViewersOpen,
  ] = useState(false);

  const [
    viewersLoading,
    setViewersLoading,
  ] = useState(false);

  const [
    storyViewers,
    setStoryViewers,
  ] = useState([]);

  const [
    viewersError,
    setViewersError,
  ] = useState("");

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


  const showToast =
    useCallback(
      ({
        type = "info",
        title = "",
        message,
        duration = 3500,
      }) => {
        if (!message) {
          return;
        }

        setToast({
          id: Date.now(),
          type,
          title,
          message,
          duration,
        });
      },
      []
    );

  const closeToast =
    useCallback(() => {
      setToast(null);
    }, []);

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

  const activeStoryId =
    normalizeId(activeStory);

  const storyImageReady =
    Boolean(
      activeStoryId &&
      loadedStoryId === activeStoryId
    );

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

    const handleStoryViewed = (
      payload = {}
    ) => {
      const viewedStoryId =
        normalizeId(
          payload?.storyId
        );

      const viewersCount =
        Number(
          payload?.viewersCount
        );

      if (
        !viewedStoryId ||
        !Number.isFinite(
          viewersCount
        )
      ) {
        return;
      }

      setStories(
        (currentStories) =>
          currentStories.map(
            (story) =>
              normalizeId(
                story
              ) ===
                viewedStoryId
                ? {
                  ...story,
                  viewersCount,
                }
                : story
          )
      );
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
      "storyViewed",
      handleStoryViewed
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
        "storyViewed",
        handleStoryViewed
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
      setViewersOpen(false);
      setStoryViewers([]);
      setViewersError("");
      setDeleteModalOpen(false);
      setDeleting(false);
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

  useEffect(() => {
    if (!activeStory || !activeGroup) {
      return undefined;
    }

    let nextStory = null;

    if (
      activeStoryIndex <
      activeGroup.stories.length - 1
    ) {
      nextStory =
        activeGroup.stories[
        activeStoryIndex + 1
        ];
    } else if (
      activeGroupIndex <
      storyGroups.length - 1
    ) {
      nextStory =
        storyGroups[
          activeGroupIndex + 1
        ]?.stories?.[0];
    }

    if (!nextStory?.image) {
      return undefined;
    }

    const preloadImage =
      new Image();

    preloadImage.src =
      nextStory.image;

    return () => {
      preloadImage.onload = null;
      preloadImage.onerror = null;
    };
  }, [
    activeStory,
    activeGroup,
    activeStoryIndex,
    activeGroupIndex,
    storyGroups,
  ]);

  /* =========================
     RESET PROGRESS
  ========================= */

  useEffect(() => {
    if (!activeStoryId) {
      setStoryPaused(false);
      return;
    }

    setStoryPaused(false);

    setProgressKey(
      (currentKey) =>
        currentKey + 1
    );
  }, [activeStoryId]);

  /* =========================
     AUTO NEXT
  ========================= */

  useEffect(() => {
    if (
      !activeStoryId ||
      storyPaused ||
      deleting
    ) {
      return undefined;
    }

    storyTimerRef.current =
      window.setTimeout(() => {
        showNextStory();
      }, STORY_DURATION_MS);

    return () => {
      if (storyTimerRef.current) {
        window.clearTimeout(
          storyTimerRef.current
        );

        storyTimerRef.current =
          null;
      }
    };
  }, [
    activeStoryId,
    storyPaused,
    deleting,
    showNextStory,
  ]);

  /* =========================
     KEYBOARD CONTROLS
  ========================= */

  useEffect(() => {
    if (
      !activeStory ||
      deleteModalOpen ||
      viewersOpen
    ) {
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
    deleteModalOpen,
    viewersOpen,
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
     STORY VIEWERS
  ========================= */

  const loadStoryViewers =
    useCallback(
      async (
        storyId,
        {
          silent = false,
        } = {}
      ) => {
        const normalizedStoryId =
          normalizeId(
            storyId
          );

        if (!normalizedStoryId) {
          return;
        }

        if (!silent) {
          setViewersLoading(true);
        }

        try {
          setViewersError("");

          const response =
            await getStoryViewers(
              normalizedStoryId
            );

          setStoryViewers(
            Array.isArray(
              response?.viewers
            )
              ? response.viewers
              : []
          );
        } catch (
        viewersLoadError
        ) {
          console.error(
            "LOAD STORY VIEWERS ERROR:",
            viewersLoadError.response
              ?.data ||
            viewersLoadError.message
          );

          setViewersError(
            viewersLoadError.userMessage ||
            viewersLoadError.response
              ?.data?.message ||
            "Unable to load story viewers"
          );
        } finally {
          if (!silent) {
            setViewersLoading(false);
          }
        }
      },
      []
    );

  const openStoryViewers =
    useCallback(
      (event) => {
        event?.stopPropagation?.();

        if (
          !activeStoryId ||
          !activeStory?.isOwner
        ) {
          return;
        }

        setStoryPaused(true);
        setViewersOpen(true);

        void loadStoryViewers(
          activeStoryId
        );
      },
      [
        activeStoryId,
        activeStory,
        loadStoryViewers,
      ]
    );

  const closeStoryViewers =
    useCallback(() => {
      setViewersOpen(false);
      setStoryPaused(false);
      setViewersError("");
    }, []);

  const handleViewerRowClick =
    useCallback(
      (viewer) => {
        const viewerId =
          normalizeId(viewer);

        closeStoryViewers();
        closeViewer();

        if (
          viewerId ===
          currentUserId
        ) {
          navigate("/profile");
          return;
        }

        const username =
          String(
            viewer?.username ||
            ""
          ).trim();

        if (username) {
          navigate(
            `/user/${encodeURIComponent(
              username
            )}`
          );
        }
      },
      [
        closeStoryViewers,
        closeViewer,
        currentUserId,
        navigate,
      ]
    );

  /* =========================
     STORY UPLOAD PREVIEW
  ========================= */

  const handleStoryUpload =
    (event) => {
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

      setError("");
      setPendingStoryFile(
        file
      );
    };

  const handleCancelStoryPreview =
    useCallback(() => {
      if (uploading) {
        return;
      }

      setPendingStoryFile(
        null
      );
    }, [uploading]);

  const handleConfirmStoryUpload =
    useCallback(
      async (preparedFile) => {
        if (
          !preparedFile ||
          uploading
        ) {
          return;
        }

        try {
          setUploading(true);
          setError("");

          const response =
            await createStory(
              preparedFile
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

          setPendingStoryFile(
            null
          );
          showToast({
            type: "success",
            title:
              "Story shared",
            message:
              "Your story is now live for 24 hours.",
          });
        } catch (
        uploadError
        ) {
          console.error(
            "CREATE STORY ERROR:",
            uploadError.response
              ?.data ||
            uploadError.message
          );

          const uploadMessage =
            uploadError.userMessage ||
            uploadError.response
              ?.data?.message ||
            uploadError.message ||
            "Unable to upload story";

          setError(
            uploadMessage
          );

          showToast({
            type: "error",
            title:
              "Upload failed",
            message:
              uploadMessage,
            duration: 4500,
          });
        } finally {
          setUploading(false);
        }
      },
      [
        currentUserId,
        uploading,
        showToast,
      ]
    );

  /* =========================
     DELETE STORY
  ========================= */

  const requestDeleteStory =
    useCallback(() => {
      if (
        !activeStoryId ||
        !activeStory?.isOwner ||
        deleting
      ) {
        return;
      }

      setStoryPaused(true);
      setDeleteModalOpen(true);
    }, [
      activeStory,
      activeStoryId,
      deleting,
    ]);

  const cancelDeleteStory =
    useCallback(() => {
      if (deleting) {
        return;
      }

      setDeleteModalOpen(false);
      setStoryPaused(false);
    }, [deleting]);

  const confirmDeleteStory =
    useCallback(async () => {
      const storyId =
        normalizeId(
          activeStory
        );

      if (
        !storyId ||
        !activeStory?.isOwner ||
        deleting
      ) {
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

        setDeleteModalOpen(
          false
        );

        closeViewer();

        showToast({
          type: "success",
          title:
            "Story deleted",
          message:
            "Your story was removed successfully.",
        });
      } catch (
      deleteError
      ) {
        console.error(
          "DELETE STORY ERROR:",
          deleteError.response
            ?.data ||
          deleteError.message
        );

        setDeleteModalOpen(
          false
        );

        setStoryPaused(
          false
        );

        showToast({
          type: "error",
          title:
            "Delete failed",
          message:
            deleteError.userMessage ||
            deleteError.response
              ?.data?.message ||
            "Unable to delete story.",
          duration: 4500,
        });
      } finally {
        setDeleting(false);
      }
    }, [
      activeStory,
      closeViewer,
      deleting,
      showToast,
    ]);

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
      <StoryToast
        key={
          toast?.id ||
          "story-toast"
        }
        toast={
          toast
        }
        onClose={
          closeToast
        }
      />
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

      <StoryDeleteModal
        open={
          deleteModalOpen
        }
        deleting={
          deleting
        }
        onCancel={
          cancelDeleteStory
        }
        onConfirm={
          confirmDeleteStory
        }
      />

      {pendingStoryFile && (
        <StoryUploadPreview
          file={
            pendingStoryFile
          }
          uploading={
            uploading
          }
          onCancel={
            handleCancelStoryPreview
          }
          onConfirm={
            handleConfirmStoryUpload
          }
        />
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
            className={styles.viewer}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onPointerDown={(event) => {
              if (
                event.pointerType === "touch" ||
                event.pointerType === "pen"
              ) {
                setStoryPaused(true);
              }
            }}
            onPointerUp={() => {
              setStoryPaused(false);
            }}
            onPointerCancel={() => {
              setStoryPaused(false);
            }}
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
                      requestDeleteStory
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

            <div
              className={
                styles.viewerImageContainer
              }
            >
              {!storyImageReady && (
                <div
                  className={
                    styles.viewerImageLoader
                  }
                  role="status"
                  aria-label="Loading story"
                >
                  <span
                    className={
                      styles.viewerSpinner
                    }
                  />
                </div>
              )}

              <img
                key={activeStoryId}
                className={`${styles.viewerImage} ${storyImageReady
                  ? styles.viewerImageReady
                  : ""
                  }`}
                src={activeStory.image}
                alt="Story"
                onLoad={() => {
                  setLoadedStoryId(
                    activeStoryId
                  );
                }}
                onError={() => {
                  setLoadedStoryId(
                    activeStoryId
                  );
                }}
              />
            </div>

            {activeStory.isOwner && (
              <button
                type="button"
                className={
                  styles.seenByButton
                }
                onClick={
                  openStoryViewers
                }
                aria-label={`Seen by ${Number(
                  activeStory.viewersCount
                ) || 0
                  }`}
              >
                <Eye />

                <span>
                  {Number(
                    activeStory.viewersCount
                  ) > 0
                    ? `Seen by ${Number(
                      activeStory.viewersCount
                    )}`
                    : "No views yet"}
                </span>
              </button>
            )}

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

            {viewersOpen && (
              <div
                className={
                  styles.viewersBackdrop
                }
                onClick={
                  closeStoryViewers
                }
              >
                <section
                  className={
                    styles.viewersSheet
                  }
                  role="dialog"
                  aria-modal="true"
                  aria-label="Story viewers"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <div
                    className={
                      styles.viewersSheetHeader
                    }
                  >
                    <div>
                      <strong>
                        Viewers
                      </strong>

                      <span>
                        {Number(
                          activeStory.viewersCount
                        ) || 0}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={
                        closeStoryViewers
                      }
                      aria-label="Close viewers"
                    >
                      <X />
                    </button>
                  </div>

                  <div
                    className={
                      styles.viewersSheetContent
                    }
                  >
                    {viewersLoading && (
                      <div
                        className={
                          styles.viewersLoading
                        }
                      >
                        <span
                          className={
                            styles.viewerSpinner
                          }
                        />

                        <span>
                          Loading viewers...
                        </span>
                      </div>
                    )}

                    {!viewersLoading &&
                      viewersError && (
                        <div
                          className={
                            styles.viewersEmpty
                          }
                          role="alert"
                        >
                          <span>
                            {viewersError}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              void loadStoryViewers(
                                activeStoryId
                              )
                            }
                          >
                            Retry
                          </button>
                        </div>
                      )}

                    {!viewersLoading &&
                      !viewersError &&
                      storyViewers.length ===
                      0 && (
                        <div
                          className={
                            styles.viewersEmpty
                          }
                        >
                          <Eye />

                          <strong>
                            No views yet
                          </strong>

                          <span>
                            People who view this story will appear here.
                          </span>
                        </div>
                      )}

                    {!viewersLoading &&
                      !viewersError &&
                      storyViewers.map(
                        (viewer) => {
                          const viewerId =
                            normalizeId(
                              viewer
                            );

                          const viewerName =
                            viewer?.name ||
                            viewer?.username ||
                            "User";

                          return (
                            <button
                              type="button"
                              key={
                                viewerId
                              }
                              className={
                                styles.viewerRow
                              }
                              onClick={() =>
                                handleViewerRowClick(
                                  viewer
                                )
                              }
                            >
                              <img
                                src={getUserAvatar(
                                  viewer
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

                              <div
                                className={
                                  styles.viewerRowText
                                }
                              >
                                <strong>
                                  {viewerName}
                                </strong>

                                <span>
                                  {viewer?.username
                                    ? `@${viewer.username}`
                                    : "View profile"}
                                </span>
                              </div>

                              {viewer?.viewedAt && (
                                <time
                                  dateTime={
                                    viewer.viewedAt
                                  }
                                >
                                  {formatViewerTime(
                                    viewer.viewedAt
                                  )}
                                </time>
                              )}
                            </button>
                          );
                        }
                      )}
                  </div>
                </section>
              </div>
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
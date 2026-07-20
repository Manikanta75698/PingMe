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

import { useAuth } from "../../context/AuthContext";

import {
  createStory,
  deleteStory,
  getStories,
  viewStory,
} from "../../services/storyService";

import DefaultAvatar from "../../assets/default-avatar.png";

import styles from "./Stories.module.css";

const normalizeId = (value) =>
  String(
    value?._id ??
    value?.id ??
    value ??
    ""
  ).trim();

const getStoryUserId = (story) =>
  normalizeId(story?.user);

const getUserAvatar = (user) =>
  user?.profilePic || DefaultAvatar;

const groupStoriesByUser = (
  stories,
  currentUserId
) => {
  const groupsMap = new Map();

  stories.forEach((story) => {
    const userId =
      getStoryUserId(story);

    if (!userId) return;

    if (!groupsMap.has(userId)) {
      groupsMap.set(userId, {
        userId,
        user: story.user,
        stories: [],
      });
    }

    groupsMap
      .get(userId)
      .stories.push(story);
  });

  const groups = Array.from(
    groupsMap.values()
  ).map((group) => {
    const orderedStories = [
      ...group.stories,
    ].sort(
      (firstStory, secondStory) =>
        new Date(
          firstStory.createdAt
        ).getTime() -
        new Date(
          secondStory.createdAt
        ).getTime()
    );

    return {
      ...group,
      stories: orderedStories,
      hasUnviewed:
        orderedStories.some(
          (story) =>
            !story.isViewed &&
            !story.isOwner
        ),
    };
  });

  return groups.sort(
    (firstGroup, secondGroup) => {
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

const Stories = () => {
  const { user } = useAuth();

  const currentUserId =
    normalizeId(user);

  const fileInputRef =
    useRef(null);

  const [stories, setStories] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    activeGroupIndex,
    setActiveGroupIndex,
  ] = useState(-1);

  const [
    activeStoryIndex,
    setActiveStoryIndex,
  ] = useState(0);

  const [deleting, setDeleting] =
    useState(false);

  const storyGroups = useMemo(
    () =>
      groupStoriesByUser(
        stories,
        currentUserId
      ),
    [stories, currentUserId]
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

  const loadStories =
    useCallback(async () => {
      try {
        setError("");

        const response =
          await getStories();

        setStories(
          Array.isArray(
            response?.stories
          )
            ? response.stories
            : []
        );
      } catch (loadError) {
        console.error(
          "LOAD STORIES ERROR:",
          loadError.response?.data ||
          loadError.message
        );

        setError(
          loadError.userMessage ||
          loadError.response?.data
            ?.message ||
          "Unable to load stories"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const markStoryViewed =
    useCallback(
      async (story) => {
        const storyId =
          normalizeId(story);

        if (
          !storyId ||
          story.isViewed ||
          story.isOwner
        ) {
          return;
        }

        setStories(
          (currentStories) =>
            currentStories.map(
              (currentStory) =>
                normalizeId(
                  currentStory
                ) === storyId
                  ? {
                    ...currentStory,
                    isViewed: true,
                  }
                  : currentStory
            )
        );

        try {
          await viewStory(storyId);
        } catch (viewError) {
          console.error(
            "VIEW STORY ERROR:",
            viewError.response?.data ||
            viewError.message
          );
        }
      },
      []
    );

  const openStoryGroup =
    useCallback(
      (groupIndex) => {
        const group =
          storyGroups[groupIndex];

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

  const closeViewer =
    useCallback(() => {
      setActiveGroupIndex(-1);
      setActiveStoryIndex(0);
    }, []);

  const showStory = useCallback(
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

      void markStoryViewed(story);
    },
    [
      storyGroups,
      markStoryViewed,
    ]
  );

  const showPreviousStory =
    useCallback(() => {
      if (!activeGroup) return;

      if (activeStoryIndex > 0) {
        showStory(
          activeGroupIndex,
          activeStoryIndex - 1
        );

        return;
      }

      if (activeGroupIndex > 0) {
        const previousGroupIndex =
          activeGroupIndex - 1;

        const previousGroup =
          storyGroups[
          previousGroupIndex
          ];

        showStory(
          previousGroupIndex,
          previousGroup.stories
            .length - 1
        );
      }
    }, [
      activeGroup,
      activeGroupIndex,
      activeStoryIndex,
      storyGroups,
      showStory,
    ]);

  const showNextStory =
    useCallback(() => {
      if (!activeGroup) return;

      if (
        activeStoryIndex <
        activeGroup.stories
          .length -
        1
      ) {
        showStory(
          activeGroupIndex,
          activeStoryIndex + 1
        );

        return;
      }

      if (
        activeGroupIndex <
        storyGroups.length - 1
      ) {
        showStory(
          activeGroupIndex + 1,
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
    if (!activeStory) return;

    const handleKeyDown = (
      event
    ) => {
      if (event.key === "Escape") {
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

  const handleStoryUpload =
    async (event) => {
      const file =
        event.target.files?.[0];

      event.target.value = "";

      if (!file || uploading) {
        return;
      }

      try {
        setUploading(true);
        setError("");

        const response =
          await createStory(file);

        if (response?.story) {
          setStories(
            (currentStories) => [
              response.story,
              ...currentStories,
            ]
          );
        }
      } catch (uploadError) {
        console.error(
          "CREATE STORY ERROR:",
          uploadError.response?.data ||
          uploadError.message
        );

        setError(
          uploadError.userMessage ||
          uploadError.response?.data
            ?.message ||
          uploadError.message ||
          "Unable to upload story"
        );
      } finally {
        setUploading(false);
      }
    };

  const handleDeleteStory =
    async () => {
      const storyId =
        normalizeId(activeStory);

      if (
        !storyId ||
        !activeStory?.isOwner ||
        deleting
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Delete this story?"
        );

      if (!confirmed) return;

      try {
        setDeleting(true);

        await deleteStory(
          storyId
        );

        setStories(
          (currentStories) =>
            currentStories.filter(
              (story) =>
                normalizeId(
                  story
                ) !== storyId
            )
        );

        closeViewer();
      } catch (deleteError) {
        console.error(
          "DELETE STORY ERROR:",
          deleteError.response?.data ||
          deleteError.message
        );

        alert(
          deleteError.userMessage ||
          deleteError.response?.data
            ?.message ||
          "Unable to delete story"
        );
      } finally {
        setDeleting(false);
      }
    };

  const currentUserGroupIndex =
    storyGroups.findIndex(
      (group) =>
        group.userId ===
        currentUserId
    );

  const handleOwnStoryClick =
    () => {
      if (
        currentUserGroupIndex >= 0
      ) {
        openStoryGroup(
          currentUserGroupIndex
        );

        return;
      }

      fileInputRef.current?.click();
    };

  if (loading) {
    return (
      <section
        className={
          styles.container
        }
        aria-label="Stories"
      >
        {Array.from({
          length: 6,
        }).map((_, index) => (
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
        ))}
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
        <button
          type="button"
          className={`${styles.story} ${styles.ownStory}`}
          onClick={
            handleOwnStoryClick
          }
          disabled={uploading}
        >
          <div
            className={
              styles.imageWrapper
            }
          >
            <img
              src={getUserAvatar(
                activeGroup?.user
              )}
              alt=""
              onError={(event) => {
                event.currentTarget.onerror =
                  null;

                event.currentTarget.src =
                  DefaultAvatar;
              }}
            />

            <span
              className={
                styles.addBadge
              }
              aria-hidden="true"
              onClick={(event) => {
                if (
                  currentUserGroupIndex >=
                  0
                ) {
                  event.stopPropagation();

                  fileInputRef.current?.click();
                }
              }}
            >
              <Plus />
            </span>

            {uploading && (
              <span
                className={
                  styles.uploadOverlay
                }
              >
                <span
                  className={
                    styles.spinner
                  }
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

            return (
              <button
                type="button"
                key={group.userId}
                className={`${styles.story} ${group.hasUnviewed
                  ? ""
                  : styles.viewed
                  }`}
                onClick={() =>
                  openStoryGroup(
                    originalIndex
                  )
                }
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
                    alt=""
                    loading="lazy"
                    onError={(
                      event
                    ) => {
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
                  {group.user
                    ?.name ||
                    group.user
                      ?.username ||
                    "User"}
                </p>
              </button>
            );
          })}

        <input
          ref={fileInputRef}
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
          <span>{error}</span>

          <button
            type="button"
            className={
              styles.retryButton
            }
            onClick={() => {
              setLoading(true);
              void loadStories();
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
          onClick={closeViewer}
        >
          <div
            className={
              styles.viewer
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.viewerHeader
              }
            >
              <div
                className={
                  styles.viewerUser
                }
              >
                <img
                  src={getUserAvatar(
                    activeGroup?.user
                  )}
                  alt=""
                />

                <div>
                  <strong>
                    {activeGroup?.user
                      ?.name ||
                      "User"}
                  </strong>

                  <span>
                    {new Date(
                      activeStory.createdAt
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

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
                    disabled={deleting}
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
              activeStoryIndex > 0 ||
              activeGroupIndex > 0
            ) && (
                <button
                  type="button"
                  className={`${styles.viewerNavigation} ${styles.previousButton}`}
                  onClick={showPreviousStory}
                  aria-label="Previous story"
                >
                  <ChevronLeft />
                </button>
              )}

            {(
              activeStoryIndex <
              activeGroup.stories.length - 1 ||
              activeGroupIndex <
              storyGroups.length - 1
            ) && (
                <button
                  type="button"
                  className={`${styles.viewerNavigation} ${styles.nextButton}`}
                  onClick={showNextStory}
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

export default memo(Stories);
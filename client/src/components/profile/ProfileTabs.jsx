import {
  useCallback,
  useRef,
  useState,
} from "react";

import {
  Bookmark,
  Grid3X3,
} from "lucide-react";

import PostGrid from "./PostGrid";

import styles from "./ProfileTabs.module.css";

const TABS = [
  {
    id: "posts",
    label: "Posts",
    icon: Grid3X3,
  },
  {
    id: "saved",
    label: "Saved",
    icon: Bookmark,
  },
];

const ProfileTabs = () => {
  const [
    activeTab,
    setActiveTab,
  ] = useState("posts");

  const tabRefs =
    useRef([]);

  const selectTab =
    useCallback(
      (tabId) => {
        setActiveTab(tabId);
      },
      []
    );

  const handleKeyDown = (
    event,
    currentIndex
  ) => {
    const supportedKeys = [
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];

    if (
      !supportedKeys.includes(
        event.key
      )
    ) {
      return;
    }

    event.preventDefault();

    let nextIndex =
      currentIndex;

    if (
      event.key ===
      "ArrowRight"
    ) {
      nextIndex =
        (currentIndex + 1) %
        TABS.length;
    }

    if (
      event.key ===
      "ArrowLeft"
    ) {
      nextIndex =
        (
          currentIndex -
          1 +
          TABS.length
        ) %
        TABS.length;
    }

    if (
      event.key === "Home"
    ) {
      nextIndex = 0;
    }

    if (
      event.key === "End"
    ) {
      nextIndex =
        TABS.length - 1;
    }

    const nextTab =
      TABS[nextIndex];

    setActiveTab(
      nextTab.id
    );

    tabRefs.current[
      nextIndex
    ]?.focus();
  };

  return (
    <section
      className={
        styles.tabsSection
      }
      aria-label="Profile content"
    >
      <div
        className={
          styles.tabsShell
        }
      >
        <div
          className={
            styles.tabs
          }
          role="tablist"
          aria-label="Profile tabs"
        >
          {TABS.map(
            (
              {
                id,
                label,
                icon: Icon,
              },
              index
            ) => {
              const isActive =
                activeTab === id;

              return (
                <button
                  key={id}
                  ref={(element) => {
                    tabRefs.current[
                      index
                    ] = element;
                  }}
                  id={`profile-tab-${id}`}
                  type="button"
                  role="tab"
                  className={`${styles.tabButton} ${isActive
                      ? styles.active
                      : ""
                    }`}
                  aria-selected={
                    isActive
                  }
                  aria-controls={`profile-panel-${id}`}
                  tabIndex={
                    isActive
                      ? 0
                      : -1
                  }
                  onClick={() =>
                    selectTab(id)
                  }
                  onKeyDown={(
                    event
                  ) =>
                    handleKeyDown(
                      event,
                      index
                    )
                  }
                >
                  <Icon
                    size={18}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />

                  <span>
                    {label}
                  </span>
                </button>
              );
            }
          )}

          <span
            className={
              styles.activeIndicator
            }
            data-active-tab={
              activeTab
            }
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        id={`profile-panel-${activeTab}`}
        className={
          styles.tabPanel
        }
        role="tabpanel"
        aria-labelledby={`profile-tab-${activeTab}`}
        tabIndex={0}
      >
        <PostGrid
          type={activeTab}
        />
      </div>
    </section>
  );
};

export default ProfileTabs;
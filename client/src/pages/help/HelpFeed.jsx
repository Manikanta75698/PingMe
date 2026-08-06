import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock3,
  Droplets,
  HandHeart,
  HeartPulse,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import Header from "../../components/home/Header";

import {
  getHelpRequests,
} from "../../services/helpRequestService";

import styles from "./HelpFeed.module.css";

/* =========================
   CONSTANTS
========================= */

const CATEGORIES = [
  {
    value: "all",
    label: "All",
    icon: HandHeart,
  },
  {
    value: "emergency",
    label: "Emergency",
    icon: AlertCircle,
  },
  {
    value: "blood",
    label: "Blood",
    icon: Droplets,
  },
  {
    value: "medical",
    label: "Medical",
    icon: HeartPulse,
  },
  {
    value: "education",
    label: "Education",
    icon: BookOpen,
  },
  {
    value: "volunteer",
    label: "Volunteer",
    icon: Users,
  },
  {
    value: "other",
    label: "Other",
    icon: HandHeart,
  },
];

const SORT_OPTIONS = [
  {
    value: "latest",
    label: "Latest",
  },
  {
    value: "urgent",
    label: "Most urgent",
  },
  {
    value: "expiring",
    label: "Expiring soon",
  },
  {
    value: "oldest",
    label: "Oldest",
  },
];

const URGENCY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/* =========================
   HELPERS
========================= */

const getUserDisplayName = (
  creator
) => {
  return (
    creator?.name ||
    creator?.username ||
    "Community member"
  );
};

const getInitial = (
  creator
) => {
  return getUserDisplayName(
    creator
  )
    .charAt(0)
    .toUpperCase();
};

const formatRelativeTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const createdAt =
    new Date(value);

  const difference =
    Date.now() -
    createdAt.getTime();

  const minute =
    60 * 1000;

  const hour =
    60 * minute;

  const day =
    24 * hour;

  if (difference < minute) {
    return "Just now";
  }

  if (difference < hour) {
    const minutes =
      Math.floor(
        difference / minute
      );

    return `${minutes}m ago`;
  }

  if (difference < day) {
    const hours =
      Math.floor(
        difference / hour
      );

    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      difference / day
    );

  if (days < 7) {
    return `${days}d ago`;
  }

  return createdAt.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
    }
  );
};

const getExpiryText = (
  value
) => {
  if (!value) {
    return "";
  }

  const expiresAt =
    new Date(value);

  const difference =
    expiresAt.getTime() -
    Date.now();

  if (difference <= 0) {
    return "Expired";
  }

  const totalHours =
    Math.ceil(
      difference /
      (60 * 60 * 1000)
    );

  if (totalHours < 24) {
    return `Expires in ${totalHours}h`;
  }

  const totalDays =
    Math.ceil(
      totalHours / 24
    );

  return `Expires in ${totalDays}d`;
};

const getLocationText = (
  location
) => {
  const values = [
    location?.area,
    location?.city,
  ].filter(Boolean);

  return (
    values.join(", ") ||
    "Location not specified"
  );
};

const getCategoryLabel = (
  category
) => {
  const categoryItem =
    CATEGORIES.find(
      (item) =>
        item.value === category
    );

  return (
    categoryItem?.label ||
    "Other"
  );
};

const mergeUniqueRequests = (
  currentRequests,
  newRequests
) => {
  const requestMap =
    new Map();

  [
    ...currentRequests,
    ...newRequests,
  ].forEach((request) => {
    if (request?._id) {
      requestMap.set(
        request._id,
        request
      );
    }
  });

  return Array.from(
    requestMap.values()
  );
};

/* =========================
   COMPONENT
========================= */

const HelpFeed = () => {
  const navigate =
    useNavigate();

  const [
    helpRequests,
    setHelpRequests,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("all");

  const [
    selectedUrgency,
    setSelectedUrgency,
  ] = useState("all");

  const [
    selectedSort,
    setSelectedSort,
  ] = useState("latest");

  const [
    city,
    setCity,
  ] = useState("");

  const [
    showFilters,
    setShowFilters,
  ] = useState(false);

  const [
    pagination,
    setPagination,
  ] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const loadHelpRequests =
    useCallback(
      async ({
        page = 1,
        append = false,
        isRefresh = false,
      } = {}) => {
        try {
          setError("");

          if (isRefresh) {
            setRefreshing(true);
          } else if (append) {
            setLoadingMore(true);
          } else {
            setLoading(true);
          }

          const response =
            await getHelpRequests({
              page,
              limit: 10,
              category:
                selectedCategory,
              urgency:
                selectedUrgency,
              status: "open",
              city,
              search:
                searchQuery,
              sort: selectedSort,
            });

          const receivedRequests =
            Array.isArray(
              response?.helpRequests
            )
              ? response.helpRequests
              : [];

          setHelpRequests(
            (currentRequests) =>
              append
                ? mergeUniqueRequests(
                  currentRequests,
                  receivedRequests
                )
                : receivedRequests
          );

          setPagination(
            response?.pagination || {
              currentPage: page,
              totalPages: 1,
              totalItems:
                receivedRequests.length,
              hasNextPage: false,
              hasPreviousPage:
                page > 1,
            }
          );
        } catch (requestError) {
          setError(
            requestError?.message ||
            "Unable to load community requests"
          );

          if (!append) {
            setHelpRequests([]);
          }
        } finally {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      },
      [
        selectedCategory,
        selectedUrgency,
        selectedSort,
        city,
        searchQuery,
      ]
    );

  useEffect(() => {
    loadHelpRequests({
      page: 1,
    });
  }, [loadHelpRequests]);

  const handleSearchSubmit = (
    event
  ) => {
    event.preventDefault();

    setSearchQuery(
      searchInput.trim()
    );
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const handleResetFilters = () => {
    setSelectedUrgency("all");
    setSelectedSort("latest");
    setCity("");
    setShowFilters(false);
  };

  const handleRefresh = () => {
    loadHelpRequests({
      page: 1,
      isRefresh: true,
    });
  };

  const handleLoadMore = () => {
    if (
      loadingMore ||
      !pagination.hasNextPage
    ) {
      return;
    }

    loadHelpRequests({
      page:
        pagination.currentPage +
        1,
      append: true,
    });
  };

  const handleOpenRequest = (
    requestId
  ) => {
    navigate(
      `/help/${requestId}`
    );
  };

  const handleCreateRequest =
    () => {
      navigate(
        "/help/create"
      );
    };

  const hasActiveFilters =
    selectedUrgency !== "all" ||
    selectedSort !== "latest" ||
    city.trim() !== "";

  return (
    <div
      className={
        styles.helpPage
      }
    >
      <div className={styles.desktopHeader}>
        <Header />
      </div>

      <main
        className={
          styles.pageContent
        }
      >
        <section
          className={
            styles.heroSection
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Community support
            </span>

            <h1>
              Nearby Help
            </h1>

            <p>
              Ask for help, support
              someone nearby, and
              make your community
              stronger.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.createButton
            }
            onClick={
              handleCreateRequest
            }
          >
            <Plus
              size={19}
              strokeWidth={2.4}
            />

            <span>
              Create request
            </span>
          </button>
        </section>

        <section
          className={
            styles.controlsSection
          }
        >
          <form
            className={
              styles.searchForm
            }
            onSubmit={
              handleSearchSubmit
            }
          >
            <Search
              className={
                styles.searchIcon
              }
              size={19}
            />

            <input
              type="search"
              value={
                searchInput
              }
              onChange={(
                event
              ) =>
                setSearchInput(
                  event.target
                    .value
                )
              }
              placeholder="Search help requests"
              aria-label="Search help requests"
            />

            {searchInput && (
              <button
                type="button"
                className={
                  styles.clearSearchButton
                }
                onClick={
                  handleClearSearch
                }
                aria-label="Clear search"
              >
                <X
                  size={17}
                />
              </button>
            )}

            <button
              type="submit"
              className={
                styles.searchButton
              }
            >
              Search
            </button>
          </form>

          <button
            type="button"
            className={`${styles.filterButton} ${hasActiveFilters
              ? styles.filterButtonActive
              : ""
              }`}
            onClick={() =>
              setShowFilters(
                (currentValue) =>
                  !currentValue
              )
            }
          >
            <SlidersHorizontal
              size={18}
            />

            <span>
              Filters
            </span>

            {hasActiveFilters && (
              <span
                className={
                  styles.filterIndicator
                }
              />
            )}
          </button>

          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={
              handleRefresh
            }
            disabled={
              refreshing
            }
            aria-label="Refresh requests"
          >
            <RefreshCw
              size={18}
              className={
                refreshing
                  ? styles.spinning
                  : ""
              }
            />
          </button>
        </section>

        {showFilters && (
          <section
            className={
              styles.filtersPanel
            }
          >
            <div
              className={
                styles.filterField
              }
            >
              <label
                htmlFor="help-urgency"
              >
                Urgency
              </label>

              <select
                id="help-urgency"
                value={
                  selectedUrgency
                }
                onChange={(
                  event
                ) =>
                  setSelectedUrgency(
                    event.target
                      .value
                  )
                }
              >
                <option value="all">
                  All urgency
                </option>

                <option value="critical">
                  Critical
                </option>

                <option value="high">
                  High
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="low">
                  Low
                </option>
              </select>
            </div>

            <div
              className={
                styles.filterField
              }
            >
              <label
                htmlFor="help-sort"
              >
                Sort by
              </label>

              <select
                id="help-sort"
                value={
                  selectedSort
                }
                onChange={(
                  event
                ) =>
                  setSelectedSort(
                    event.target
                      .value
                  )
                }
              >
                {SORT_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div
              className={
                styles.filterField
              }
            >
              <label
                htmlFor="help-city"
              >
                City
              </label>

              <input
                id="help-city"
                type="text"
                value={city}
                onChange={(
                  event
                ) =>
                  setCity(
                    event.target
                      .value
                  )
                }
                placeholder="Enter city"
                maxLength={100}
              />
            </div>

            <button
              type="button"
              className={
                styles.resetButton
              }
              onClick={
                handleResetFilters
              }
              disabled={
                !hasActiveFilters
              }
            >
              Reset
            </button>
          </section>
        )}

        <section
          className={
            styles.categoriesSection
          }
          aria-label="Help categories"
        >
          {CATEGORIES.map(
            (category) => {
              const Icon =
                category.icon;

              const isActive =
                selectedCategory ===
                category.value;

              return (
                <button
                  key={
                    category.value
                  }
                  type="button"
                  className={`${styles.categoryButton} ${isActive
                    ? styles.categoryButtonActive
                    : ""
                    }`}
                  onClick={() =>
                    setSelectedCategory(
                      category.value
                    )
                  }
                >
                  <Icon
                    size={17}
                  />

                  <span>
                    {
                      category.label
                    }
                  </span>
                </button>
              );
            }
          )}
        </section>

        <section
          className={
            styles.feedHeader
          }
        >
          <div>
            <h2>
              Open requests
            </h2>

            <p>
              {pagination.totalItems ||
                0}{" "}
              active community
              requests
            </p>
          </div>
        </section>

        {loading ? (
          <div
            className={
              styles.stateContainer
            }
          >
            <LoaderCircle
              size={30}
              className={
                styles.spinning
              }
            />

            <p>
              Loading nearby
              requests...
            </p>
          </div>
        ) : error ? (
          <div
            className={
              styles.errorState
            }
          >
            <AlertCircle
              size={32}
            />

            <h3>
              Could not load
              requests
            </h3>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadHelpRequests({
                  page: 1,
                })
              }
            >
              Try again
            </button>
          </div>
        ) : helpRequests.length ===
          0 ? (
          <div
            className={
              styles.emptyState
            }
          >
            <div
              className={
                styles.emptyIcon
              }
            >
              <HandHeart
                size={34}
              />
            </div>

            <h3>
              No open requests
              found
            </h3>

            <p>
              Try changing the
              filters or create a
              new request for your
              community.
            </p>

            <button
              type="button"
              onClick={
                handleCreateRequest
              }
            >
              <Plus
                size={18}
              />

              Create request
            </button>
          </div>
        ) : (
          <>
            <div
              className={
                styles.requestsGrid
              }
            >
              {helpRequests.map(
                (request) => (
                  <article
                    key={
                      request._id
                    }
                    className={
                      styles.requestCard
                    }
                    onClick={() =>
                      handleOpenRequest(
                        request._id
                      )
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                        "Enter" ||
                        event.key ===
                        " "
                      ) {
                        event.preventDefault();

                        handleOpenRequest(
                          request._id
                        );
                      }
                    }}
                  >
                    <div
                      className={
                        styles.cardTopRow
                      }
                    >
                      <span
                        className={`${styles.urgencyBadge} ${styles[
                          `urgency${request.urgency
                            ?.charAt(0)
                            .toUpperCase()}${request.urgency?.slice(
                              1
                            )}`
                        ] || ""
                          }`}
                      >
                        {
                          URGENCY_LABELS[
                          request
                            .urgency
                          ] ||
                          "Medium"
                        }
                      </span>

                      <span
                        className={
                          styles.categoryBadge
                        }
                      >
                        {getCategoryLabel(
                          request.category
                        )}
                      </span>
                    </div>

                    <div
                      className={
                        styles.creatorRow
                      }
                    >
                      {request
                        .creator
                        ?.profilePic ? (
                        <img
                          src={
                            request
                              .creator
                              .profilePic
                          }
                          alt=""
                          className={
                            styles.avatar
                          }
                        />
                      ) : (
                        <div
                          className={
                            styles.avatarFallback
                          }
                          aria-hidden="true"
                        >
                          {getInitial(
                            request.creator
                          )}
                        </div>
                      )}

                      <div
                        className={
                          styles.creatorDetails
                        }
                      >
                        <strong>
                          {getUserDisplayName(
                            request.creator
                          )}
                        </strong>

                        <span>
                          {formatRelativeTime(
                            request.createdAt
                          )}
                        </span>
                      </div>
                    </div>

                    <div
                      className={
                        styles.cardContent
                      }
                    >
                      <h3>
                        {
                          request.title
                        }
                      </h3>

                      <p>
                        {
                          request.description
                        }
                      </p>
                    </div>

                    <div
                      className={
                        styles.locationRow
                      }
                    >
                      <MapPin
                        size={16}
                      />

                      <span>
                        {getLocationText(
                          request.location
                        )}
                      </span>
                    </div>

                    <div
                      className={
                        styles.cardFooter
                      }
                    >
                      <div
                        className={
                          styles.metaGroup
                        }
                      >
                        <span
                          className={
                            styles.metaItem
                          }
                        >
                          <Users
                            size={16}
                          />

                          {request.helperCount ||
                            request
                              .helpers
                              ?.length ||
                            0}{" "}
                          offers
                        </span>

                        <span
                          className={
                            styles.metaItem
                          }
                        >
                          <Clock3
                            size={16}
                          />

                          {getExpiryText(
                            request.expiresAt
                          )}
                        </span>
                      </div>

                      <span
                        className={
                          styles.openRequestIcon
                        }
                        aria-hidden="true"
                      >
                        <ArrowRight
                          size={18}
                        />
                      </span>
                    </div>
                  </article>
                )
              )}
            </div>

            {pagination.hasNextPage && (
              <div
                className={
                  styles.loadMoreContainer
                }
              >
                <button
                  type="button"
                  className={
                    styles.loadMoreButton
                  }
                  onClick={
                    handleLoadMore
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
                          styles.spinning
                        }
                      />

                      Loading...
                    </>
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <button
        type="button"
        className={
          styles.mobileCreateButton
        }
        onClick={
          handleCreateRequest
        }
        aria-label="Create help request"
      >
        <Plus
          size={24}
          strokeWidth={2.4}
        />
      </button>
    </div>
  );
};

export default HelpFeed;
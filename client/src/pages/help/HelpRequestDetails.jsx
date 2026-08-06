import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Flag,
  HandHeart,
  LoaderCircle,
  MapPin,
  MessageCircle,
  MoreVertical,
  Navigation,
  Phone,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import Header from "../../components/home/Header";

import {
  acceptHelper,
  cancelHelpRequest,
  deleteHelpRequest,
  getHelpRequestById,
  offerHelp,
  reportHelpRequest,
  resolveHelpRequest,
  withdrawHelpOffer,
} from "../../services/helpRequestService";

import styles from "./HelpRequestDetails.module.css";

/* =========================
   CONSTANTS
========================= */

const REPORT_REASONS = [
  {
    value: "spam",
    label: "Spam",
  },
  {
    value: "fake",
    label: "Fake request",
  },
  {
    value: "unsafe",
    label: "Unsafe activity",
  },
  {
    value: "inappropriate",
    label: "Inappropriate",
  },
  {
    value: "misleading",
    label: "Misleading",
  },
  {
    value: "other",
    label: "Other",
  },
];

const STATUS_LABELS = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved",
  expired: "Expired",
  cancelled: "Cancelled",
};

const URGENCY_LABELS = {
  low: "Low urgency",
  medium: "Medium urgency",
  high: "High urgency",
  critical: "Critical",
};

/* =========================
   HELPERS
========================= */

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch {
    return null;
  }
};

const getId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return (
    value._id ||
    value.id ||
    ""
  ).toString();
};

const getDisplayName = (user) => {
  return (
    user?.name ||
    user?.username ||
    "Community member"
  );
};

const getUsername = (user) => {
  if (!user?.username) {
    return "";
  }

  return user.username.startsWith("@")
    ? user.username
    : `@${user.username}`;
};

const getInitial = (user) => {
  return getDisplayName(user)
    .charAt(0)
    .toUpperCase();
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

const formatExpiry = (value) => {
  if (!value) {
    return "";
  }

  const expiryDate =
    new Date(value);

  const difference =
    expiryDate.getTime() -
    Date.now();

  if (difference <= 0) {
    return "Expired";
  }

  const totalHours = Math.ceil(
    difference /
    (60 * 60 * 1000)
  );

  if (totalHours < 24) {
    return `Expires in ${totalHours} hour${totalHours === 1
      ? ""
      : "s"
      }`;
  }

  const days = Math.ceil(
    totalHours / 24
  );

  return `Expires in ${days} day${days === 1
    ? ""
    : "s"
    }`;
};

const getLocation = (request) => {
  return [
    request?.location?.area,
    request?.location?.city,
  ]
    .filter(Boolean)
    .join(", ");
};

const hasUserOffered = (
  request,
  userId
) => {
  return request?.helpers?.some(
    (helper) =>
      getId(helper.user) ===
      userId
  );
};

const getCurrentUserOffer = (
  request,
  userId
) => {
  return request?.helpers?.find(
    (helper) =>
      getId(helper.user) ===
      userId
  );
};

/* =========================
   COMPONENT
========================= */

const HelpRequestDetails = () => {
  const navigate =
    useNavigate();

  const {
    requestId,
  } = useParams();

  const currentUser =
    useMemo(
      () => getStoredUser(),
      []
    );

  const currentUserId =
    getId(currentUser);

  const [
    helpRequest,
    setHelpRequest,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    processingAction,
    setProcessingAction,
  ] = useState("");

  const [
    offerMessage,
    setOfferMessage,
  ] = useState("");

  const [
    showOfferForm,
    setShowOfferForm,
  ] = useState(false);

  const [
    showOwnerMenu,
    setShowOwnerMenu,
  ] = useState(false);

  const [
    showDeleteDialog,
    setShowDeleteDialog,
  ] = useState(false);

  const [
    showCancelDialog,
    setShowCancelDialog,
  ] = useState(false);

  const [
    showResolveDialog,
    setShowResolveDialog,
  ] = useState(false);

  const [
    showReportDialog,
    setShowReportDialog,
  ] = useState(false);

  const [
    reportReason,
    setReportReason,
  ] = useState("spam");

  const loadRequest =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getHelpRequestById(
            requestId
          );

        setHelpRequest(
          response?.helpRequest ||
          null
        );
      } catch (requestError) {
        setError(
          requestError?.message ||
          "Unable to load help request"
        );
      } finally {
        setLoading(false);
      }
    }, [requestId]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  useEffect(() => {
    if (
      !successMessage &&
      !actionError
    ) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => {
        setSuccessMessage("");
        setActionError("");
      },
      4500
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    successMessage,
    actionError,
  ]);

  const creatorId =
    getId(
      helpRequest?.creator
    );

  const isOwner =
    Boolean(
      currentUserId &&
      creatorId === currentUserId
    );

  const acceptedHelperId =
    getId(
      helpRequest?.acceptedHelper
    );

  const isAcceptedHelper =
    Boolean(
      currentUserId &&
      acceptedHelperId === currentUserId
    );

  const canViewPrivateDetails =
    Boolean(
      helpRequest?.canViewPrivateDetails ||
      isOwner ||
      isAcceptedHelper
    );

  const exactAddress =
    helpRequest?.location?.exactAddress ||
    "";

  const googleMapsUrl =
    helpRequest?.googleMapsUrl ||
    (() => {
      const latitude =
        helpRequest?.location?.coordinates
          ?.latitude;

      const longitude =
        helpRequest?.location?.coordinates
          ?.longitude;

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return "";
      }

      return (
        "https://www.google.com/maps/dir/" +
        `?api=1&destination=${latitude},${longitude}`
      );
    })();

  const userAlreadyOffered =
    hasUserOffered(
      helpRequest,
      currentUserId
    );

  const currentOffer =
    getCurrentUserOffer(
      helpRequest,
      currentUserId
    );

  const canOfferHelp =
    !isOwner &&
    helpRequest?.status ===
    "open" &&
    !userAlreadyOffered;

  const canWithdraw =
    !isOwner &&
    userAlreadyOffered &&
    currentOffer?.status ===
    "offered";

  const canOwnerClose =
    isOwner &&
    ["open", "in-progress"].includes(
      helpRequest?.status
    );

  const runAction = async (
    actionName,
    action
  ) => {
    if (processingAction) {
      return;
    }

    try {
      setProcessingAction(
        actionName
      );

      setActionError("");
      setSuccessMessage("");

      const response =
        await action();

      setSuccessMessage(
        response?.message ||
        "Action completed successfully"
      );

      return response;
    } catch (requestError) {
      setActionError(
        requestError?.message ||
        "Unable to complete action"
      );

      return null;
    } finally {
      setProcessingAction("");
    }
  };

  const handleOfferHelp =
    async (event) => {
      event.preventDefault();

      if (
        offerMessage.trim()
          .length > 300
      ) {
        setActionError(
          "Message cannot exceed 300 characters"
        );

        return;
      }

      const response =
        await runAction(
          "offer",
          () =>
            offerHelp(
              requestId,
              offerMessage
            )
        );

      if (!response) {
        return;
      }

      setOfferMessage("");
      setShowOfferForm(false);

      if (response.helpRequest) {
        setHelpRequest(
          response.helpRequest
        );
      } else {
        await loadRequest();
      }
    };

  const handleWithdrawOffer =
    async () => {
      const response =
        await runAction(
          "withdraw",
          () =>
            withdrawHelpOffer(
              requestId
            )
        );

      if (response) {
        if (response.helpRequest) {
          setHelpRequest(
            response.helpRequest
          );
        } else {
          await loadRequest();
        }
      }
    };

  const handleAcceptHelper =
    async (helperId) => {
      const response =
        await runAction(
          `accept-${helperId}`,
          () =>
            acceptHelper(
              requestId,
              helperId
            )
        );

      if (response) {
        if (response.helpRequest) {
          setHelpRequest(
            response.helpRequest
          );
        } else {
          await loadRequest();
        }
      }
    };

  const handleResolve =
    async () => {
      const response =
        await runAction(
          "resolve",
          () =>
            resolveHelpRequest(
              requestId
            )
        );

      if (response) {
        setShowResolveDialog(
          false
        );

        setShowOwnerMenu(false);

        if (response.helpRequest) {
          setHelpRequest(
            response.helpRequest
          );
        } else {
          await loadRequest();
        }
      }
    };

  const handleCancel =
    async () => {
      const response =
        await runAction(
          "cancel",
          () =>
            cancelHelpRequest(
              requestId
            )
        );

      if (response) {
        setShowCancelDialog(
          false
        );

        setShowOwnerMenu(false);

        if (response.helpRequest) {
          setHelpRequest(
            response.helpRequest
          );
        } else {
          await loadRequest();
        }
      }
    };

  const handleDelete =
    async () => {
      const response =
        await runAction(
          "delete",
          () =>
            deleteHelpRequest(
              requestId
            )
        );

      if (response) {
        navigate(
          "/help",
          {
            replace: true,
          }
        );
      }
    };

  const handleReport =
    async () => {
      const response =
        await runAction(
          "report",
          () =>
            reportHelpRequest(
              requestId,
              reportReason
            )
        );

      if (response) {
        setShowReportDialog(
          false
        );
      }
    };

  const handleOpenChat = (
    user
  ) => {
    const userId =
      getId(user);

    if (!userId) {
      return;
    }

    navigate(
      `/chat/${userId}`
    );
  };

  const handleOpenProfile = (
    user
  ) => {
    const username =
      user?.username;

    if (!username) {
      return;
    }

    const cleanUsername =
      username.startsWith("@")
        ? username.slice(1)
        : username;

    navigate(
      `/user/${cleanUsername}`
    );
  };

  const handleOpenMaps = () => {
    if (!googleMapsUrl) {
      setActionError(
        "Exact map location is not available"
      );
      return;
    }

    window.open(
      googleMapsUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleCopyPhone = async () => {
    if (!helpRequest?.contactPhone) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        helpRequest.contactPhone
      );

      setSuccessMessage(
        "Phone number copied"
      );
    } catch {
      setActionError(
        "Unable to copy phone number"
      );
    }
  };

  if (loading) {
    return (
      <div
        className={
          styles.page
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
          <div
            className={
              styles.loadingState
            }
          >
            <LoaderCircle
              size={31}
              className={
                styles.spinning
              }
            />

            <p>
              Loading help request...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (
    error ||
    !helpRequest
  ) {
    return (
      <div
        className={
          styles.page
        }
      >
        <div
          className={
            styles.desktopHeader
          }
        >
          <Header />
        </div>

        <main
          className={
            styles.pageContent
          }
        >
          <div
            className={
              styles.errorState
            }
          >
            <AlertCircle
              size={34}
            />

            <h2>
              Request unavailable
            </h2>

            <p>
              {error ||
                "This help request could not be found."}
            </p>

            <div
              className={
                styles.stateActions
              }
            >
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/help"
                  )
                }
              >
                <ArrowLeft
                  size={18}
                />

                Back to help
              </button>

              <button
                type="button"
                onClick={
                  loadRequest
                }
              >
                <RefreshCw
                  size={18}
                />

                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const locationText =
    getLocation(helpRequest);

  const acceptedHelper =
    helpRequest.acceptedHelper;

  return (
    <div
      className={
        styles.page
      }
    >
      <div
        className={
          styles.desktopHeader
        }
      >
        <Header />
      </div>

      <main
        className={
          styles.pageContent
        }
      >
        <div
          className={
            styles.topBar
          }
        >
          <button
            type="button"
            className={
              styles.backButton
            }
            onClick={() =>
              navigate("/help")
            }
            aria-label="Back to help feed"
          >
            <ArrowLeft
              size={21}
            />
          </button>

          <div
            className={
              styles.topBarText
            }
          >
            <span>
              Community request
            </span>

            <strong>
              Request details
            </strong>
          </div>

          {isOwner ? (
            <div
              className={
                styles.ownerMenuWrapper
              }
            >
              <button
                type="button"
                className={
                  styles.moreButton
                }
                onClick={() =>
                  setShowOwnerMenu(
                    (current) =>
                      !current
                  )
                }
                aria-label="Request options"
              >
                <MoreVertical
                  size={21}
                />
              </button>

              {showOwnerMenu && (
                <>
                  <button
                    type="button"
                    className={
                      styles.menuBackdrop
                    }
                    onClick={() =>
                      setShowOwnerMenu(
                        false
                      )
                    }
                    aria-label="Close menu"
                  />

                  <div
                    className={
                      styles.ownerMenu
                    }
                  >
                    {canOwnerClose && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setShowResolveDialog(
                              true
                            );

                            setShowOwnerMenu(
                              false
                            );
                          }}
                        >
                          <CheckCircle2
                            size={18}
                          />

                          Mark resolved
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowCancelDialog(
                              true
                            );

                            setShowOwnerMenu(
                              false
                            );
                          }}
                        >
                          <XCircle
                            size={18}
                          />

                          Cancel request
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className={
                        styles.deleteMenuItem
                      }
                      onClick={() => {
                        setShowDeleteDialog(
                          true
                        );

                        setShowOwnerMenu(
                          false
                        );
                      }}
                    >
                      <Trash2
                        size={18}
                      />

                      Delete request
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={
                styles.moreButton
              }
              onClick={() =>
                setShowReportDialog(
                  true
                )
              }
              aria-label="Report request"
            >
              <Flag
                size={19}
              />
            </button>
          )}
        </div>

        {actionError && (
          <div
            className={
              styles.errorBanner
            }
            role="alert"
          >
            <AlertCircle
              size={19}
            />

            <span>
              {actionError}
            </span>

            <button
              type="button"
              onClick={() =>
                setActionError("")
              }
              aria-label="Close error"
            >
              <X
                size={17}
              />
            </button>
          </div>
        )}

        {successMessage && (
          <div
            className={
              styles.successBanner
            }
          >
            <CheckCircle2
              size={19}
            />

            <span>
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              aria-label="Close message"
            >
              <X
                size={17}
              />
            </button>
          </div>
        )}

        <div
          className={
            styles.layout
          }
        >
          <div
            className={
              styles.mainColumn
            }
          >
            <article
              className={
                styles.requestCard
              }
            >
              <div
                className={
                  styles.badgesRow
                }
              >
                <span
                  className={`${styles.statusBadge} ${styles[
                    `status${helpRequest.status
                      ?.replace(
                        "-",
                        ""
                      )
                      .charAt(0)
                      .toUpperCase()}${helpRequest.status
                        ?.replace(
                          "-",
                          ""
                        )
                        .slice(1)}`
                  ] || ""
                    }`}
                >
                  {STATUS_LABELS[
                    helpRequest.status
                  ] ||
                    helpRequest.status}
                </span>

                <span
                  className={`${styles.urgencyBadge} ${styles[
                    `urgency${helpRequest.urgency
                      ?.charAt(0)
                      .toUpperCase()}${helpRequest.urgency?.slice(
                        1
                      )}`
                  ] || ""
                    }`}
                >
                  {URGENCY_LABELS[
                    helpRequest.urgency
                  ] ||
                    "Medium urgency"}
                </span>

                <span
                  className={
                    styles.categoryBadge
                  }
                >
                  {helpRequest.category
                    ?.replace(
                      "-",
                      " "
                    )}
                </span>
              </div>

              <h1>
                {helpRequest.title}
              </h1>

              <p
                className={
                  styles.description
                }
              >
                {
                  helpRequest.description
                }
              </p>

              <div
                className={
                  styles.metaGrid
                }
              >
                {locationText && (
                  <div
                    className={
                      styles.metaItem
                    }
                  >
                    <MapPin
                      size={19}
                    />

                    <div>
                      <span>
                        Location
                      </span>

                      <strong>
                        {locationText}
                      </strong>
                    </div>
                  </div>
                )}

                <div
                  className={
                    styles.metaItem
                  }
                >
                  <CalendarDays
                    size={19}
                  />

                  <div>
                    <span>
                      Published
                    </span>

                    <strong>
                      {formatDate(
                        helpRequest.createdAt
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.metaItem
                  }
                >
                  <Clock3
                    size={19}
                  />

                  <div>
                    <span>
                      Expiry
                    </span>

                    <strong>
                      {formatExpiry(
                        helpRequest.expiresAt
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.metaItem
                  }
                >
                  <Users
                    size={19}
                  />

                  <div>
                    <span>
                      Help offers
                    </span>

                    <strong>
                      {helpRequest.helperCount ||
                        helpRequest.helpers
                          ?.length ||
                        0}
                    </strong>
                  </div>
                </div>
              </div>
            </article>

            {acceptedHelper && (
              <section
                className={
                  styles.acceptedHelperCard
                }
              >
                <div
                  className={
                    styles.acceptedIcon
                  }
                >
                  <UserCheck
                    size={23}
                  />
                </div>

                <div
                  className={
                    styles.acceptedContent
                  }
                >
                  <span>
                    Accepted helper
                  </span>

                  <strong>
                    {getDisplayName(
                      acceptedHelper
                    )}
                  </strong>

                  <small>
                    This request is
                    currently being
                    handled.
                  </small>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleOpenChat(
                      acceptedHelper
                    )
                  }
                >
                  <MessageCircle
                    size={18}
                  />

                  Chat
                </button>
              </section>
            )}

            {isOwner && (
              <section
                className={
                  styles.helpersSection
                }
              >
                <div
                  className={
                    styles.sectionTitle
                  }
                >
                  <div>
                    <h2>
                      Help offers
                    </h2>

                    <p>
                      Review community
                      members who
                      offered support.
                    </p>
                  </div>

                  <span>
                    {helpRequest.helpers
                      ?.length || 0}
                  </span>
                </div>

                {!helpRequest.helpers
                  ?.length ? (
                  <div
                    className={
                      styles.noHelpers
                    }
                  >
                    <HandHeart
                      size={30}
                    />

                    <h3>
                      No offers yet
                    </h3>

                    <p>
                      Community help
                      offers will
                      appear here.
                    </p>
                  </div>
                ) : (
                  <div
                    className={
                      styles.helpersList
                    }
                  >
                    {helpRequest.helpers.map(
                      (helper) => {
                        const helperUser =
                          helper.user;

                        const helperId =
                          getId(
                            helperUser
                          );

                        const isAccepted =
                          helper.status ===
                          "accepted" ||
                          getId(
                            acceptedHelper
                          ) ===
                          helperId;

                        return (
                          <article
                            key={
                              helper._id ||
                              helperId
                            }
                            className={`${styles.helperCard} ${isAccepted
                              ? styles.helperCardAccepted
                              : ""
                              }`}
                          >
                            <button
                              type="button"
                              className={
                                styles.helperProfile
                              }
                              onClick={() =>
                                handleOpenProfile(
                                  helperUser
                                )
                              }
                            >
                              {helperUser?.profilePic ? (
                                <img
                                  src={
                                    helperUser.profilePic
                                  }
                                  alt=""
                                />
                              ) : (
                                <span
                                  className={
                                    styles.avatarFallback
                                  }
                                >
                                  {getInitial(
                                    helperUser
                                  )}
                                </span>
                              )}

                              <span>
                                <strong>
                                  {getDisplayName(
                                    helperUser
                                  )}
                                </strong>

                                <small>
                                  {getUsername(
                                    helperUser
                                  )}
                                </small>
                              </span>
                            </button>

                            {helper.message && (
                              <p
                                className={
                                  styles.helperMessage
                                }
                              >
                                “
                                {
                                  helper.message
                                }
                                ”
                              </p>
                            )}

                            <div
                              className={
                                styles.helperFooter
                              }
                            >
                              <span
                                className={`${styles.offerStatus} ${isAccepted
                                  ? styles.offerAccepted
                                  : helper.status ===
                                    "declined"
                                    ? styles.offerDeclined
                                    : ""
                                  }`}
                              >
                                {isAccepted
                                  ? "Accepted"
                                  : helper.status ===
                                    "declined"
                                    ? "Not selected"
                                    : helper.status ===
                                      "completed"
                                      ? "Completed"
                                      : "Offered help"}
                              </span>

                              <div
                                className={
                                  styles.helperActions
                                }
                              >
                                <button
                                  type="button"
                                  className={
                                    styles.chatButton
                                  }
                                  onClick={() =>
                                    handleOpenChat(
                                      helperUser
                                    )
                                  }
                                >
                                  <MessageCircle
                                    size={17}
                                  />

                                  Chat
                                </button>

                                {helpRequest.status ===
                                  "open" &&
                                  helper.status ===
                                  "offered" && (
                                    <button
                                      type="button"
                                      className={
                                        styles.acceptButton
                                      }
                                      onClick={() =>
                                        handleAcceptHelper(
                                          helperId
                                        )
                                      }
                                      disabled={
                                        processingAction ===
                                        `accept-${helperId}`
                                      }
                                    >
                                      {processingAction ===
                                        `accept-${helperId}` ? (
                                        <LoaderCircle
                                          size={17}
                                          className={
                                            styles.spinning
                                          }
                                        />
                                      ) : (
                                        <Check
                                          size={17}
                                        />
                                      )}

                                      Accept
                                    </button>
                                  )}
                              </div>
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>
                )}
              </section>
            )}

            {!isOwner && (
              <section
                className={
                  styles.offerSection
                }
              >
                {canOfferHelp && (
                  <>
                    {!showOfferForm ? (
                      <div
                        className={
                          styles.offerPrompt
                        }
                      >
                        <div>
                          <span
                            className={
                              styles.offerIcon
                            }
                          >
                            <HandHeart
                              size={24}
                            />
                          </span>

                          <div>
                            <h2>
                              Can you help?
                            </h2>

                            <p>
                              Send a help
                              offer to the
                              request owner.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setShowOfferForm(
                              true
                            )
                          }
                        >
                          Offer help
                        </button>
                      </div>
                    ) : (
                      <form
                        className={
                          styles.offerForm
                        }
                        onSubmit={
                          handleOfferHelp
                        }
                      >
                        <div
                          className={
                            styles.offerFormHeader
                          }
                        >
                          <div>
                            <h2>
                              Offer help
                            </h2>

                            <p>
                              Add a short
                              message for the
                              request owner.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setShowOfferForm(
                                false
                              )
                            }
                            aria-label="Close offer form"
                          >
                            <X
                              size={19}
                            />
                          </button>
                        </div>

                        <textarea
                          value={
                            offerMessage
                          }
                          onChange={(
                            event
                          ) =>
                            setOfferMessage(
                              event.target
                                .value
                            )
                          }
                          placeholder="Example: I am available nearby and can help."
                          maxLength={300}
                          rows={4}
                        />

                        <div
                          className={
                            styles.offerFormFooter
                          }
                        >
                          <span>
                            {
                              offerMessage.length
                            }
                            /300
                          </span>

                          <button
                            type="submit"
                            disabled={
                              processingAction ===
                              "offer"
                            }
                          >
                            {processingAction ===
                              "offer" ? (
                              <LoaderCircle
                                size={18}
                                className={
                                  styles.spinning
                                }
                              />
                            ) : (
                              <HandHeart
                                size={18}
                              />
                            )}

                            Send offer
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}

                {userAlreadyOffered && (
                  <div
                    className={
                      styles.sentOfferCard
                    }
                  >
                    <span
                      className={
                        styles.sentOfferIcon
                      }
                    >
                      <CheckCircle2
                        size={24}
                      />
                    </span>

                    <div>
                      <h2>
                        Help offer sent
                      </h2>

                      <p>
                        Status:{" "}
                        <strong>
                          {currentOffer?.status ||
                            "offered"}
                        </strong>
                      </p>
                    </div>

                    {canWithdraw && (
                      <button
                        type="button"
                        onClick={
                          handleWithdrawOffer
                        }
                        disabled={
                          processingAction ===
                          "withdraw"
                        }
                      >
                        {processingAction ===
                          "withdraw" ? (
                          <LoaderCircle
                            size={17}
                            className={
                              styles.spinning
                            }
                          />
                        ) : (
                          <X
                            size={17}
                          />
                        )}

                        Withdraw
                      </button>
                    )}
                  </div>
                )}

                {!canOfferHelp &&
                  !userAlreadyOffered &&
                  helpRequest.status !==
                  "open" && (
                    <div
                      className={
                        styles.closedNotice
                      }
                    >
                      <ShieldAlert
                        size={22}
                      />

                      <div>
                        <strong>
                          Request closed
                        </strong>

                        <p>
                          This request is
                          no longer
                          accepting help
                          offers.
                        </p>
                      </div>
                    </div>
                  )}
              </section>
            )}
          </div>

          <aside
            className={
              styles.sideColumn
            }
          >
            <section
              className={
                styles.creatorCard
              }
            >
              <span
                className={
                  styles.sideLabel
                }
              >
                Requested by
              </span>

              <button
                type="button"
                className={
                  styles.creatorProfile
                }
                onClick={() =>
                  handleOpenProfile(
                    helpRequest.creator
                  )
                }
              >
                {helpRequest.creator
                  ?.profilePic ? (
                  <img
                    src={
                      helpRequest
                        .creator
                        .profilePic
                    }
                    alt=""
                  />
                ) : (
                  <span
                    className={
                      styles.largeAvatarFallback
                    }
                  >
                    {getInitial(
                      helpRequest.creator
                    )}
                  </span>
                )}

                <span>
                  <strong>
                    {getDisplayName(
                      helpRequest.creator
                    )}
                  </strong>

                  <small>
                    {getUsername(
                      helpRequest.creator
                    )}
                  </small>
                </span>
              </button>

              {isAcceptedHelper && (
                <button
                  type="button"
                  className={
                    styles.creatorChatButton
                  }
                  onClick={() =>
                    handleOpenChat(
                      helpRequest.creator
                    )
                  }
                >
                  <MessageCircle
                    size={18}
                  />

                  Send message
                </button>
              )}

              {isOwner && (
                <span
                  className={
                    styles.ownerLabel
                  }
                >
                  <CheckCircle2
                    size={16}
                  />

                  Your request
                </span>
              )}
            </section>

            <section
              className={
                styles.contactCard
              }
            >
              <span
                className={
                  styles.sideLabel
                }
              >
                Contact preference
              </span>

              <div
                className={
                  styles.contactMethod
                }
              >
                {helpRequest.contactPreference ===
                  "phone" ? (
                  <Phone
                    size={20}
                  />
                ) : (
                  <MessageCircle
                    size={20}
                  />
                )}

                <div>
                  <strong>
                    {helpRequest.contactPreference ===
                      "both"
                      ? "Chat and phone"
                      : helpRequest.contactPreference ===
                        "phone"
                        ? "Phone"
                        : "PingMe chat"}
                  </strong>

                  <span>
                    Preferred contact
                    method
                  </span>
                </div>
              </div>

              {canViewPrivateDetails ? (
                <div
                  className={
                    styles.privateContactBlock
                  }
                >
                  {helpRequest.contactPhone && (
                    <div
                      className={
                        styles.privatePhoneRow
                      }
                    >
                      <a
                        href={`tel:${helpRequest.contactPhone}`}
                        className={
                          styles.phoneLink
                        }
                      >
                        <Phone size={17} />
                        {
                          helpRequest.contactPhone
                        }
                      </a>

                      <button
                        type="button"
                        className={
                          styles.copyButton
                        }
                        onClick={
                          handleCopyPhone
                        }
                        aria-label="Copy phone number"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  )}

                  {(exactAddress ||
                    googleMapsUrl) && (
                    <div
                      className={
                        styles.privateLocation
                      }
                    >
                      <div>
                        <MapPin size={18} />

                        <span>
                          <small>
                            Exact location
                          </small>

                          <strong>
                            {exactAddress ||
                              getLocation(
                                helpRequest
                              )}
                          </strong>
                        </span>
                      </div>

                      {googleMapsUrl && (
                        <button
                          type="button"
                          className={
                            styles.mapButton
                          }
                          onClick={
                            handleOpenMaps
                          }
                        >
                          <Navigation
                            size={17}
                          />
                          Open map
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p
                  className={
                    styles.privateLockedText
                  }
                >
                  Phone and exact location
                  unlock after the requester
                  accepts your help offer.
                </p>
              )}
            </section>

            <section
              className={
                styles.safetyCard
              }
            >
              <ShieldAlert
                size={22}
              />

              <div>
                <strong>
                  Stay safe
                </strong>

                <p>
                  Never share OTPs,
                  passwords, banking
                  details or sensitive
                  personal information.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </main>

      {showDeleteDialog && (
        <div
          className={
            styles.modalBackdrop
          }
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowDeleteDialog(
                false
              );
            }
          }}
        >
          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-request-title"
          >
            <span
              className={`${styles.modalIcon} ${styles.modalIconDanger}`}
            >
              <Trash2
                size={25}
              />
            </span>

            <h2
              id="delete-request-title"
            >
              Delete request?
            </h2>

            <p>
              This action is permanent
              and the request cannot be
              recovered.
            </p>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                onClick={() =>
                  setShowDeleteDialog(
                    false
                  )
                }
                disabled={
                  processingAction ===
                  "delete"
                }
              >
                Keep request
              </button>

              <button
                type="button"
                className={
                  styles.dangerButton
                }
                onClick={
                  handleDelete
                }
                disabled={
                  processingAction ===
                  "delete"
                }
              >
                {processingAction ===
                  "delete" ? (
                  <LoaderCircle
                    size={18}
                    className={
                      styles.spinning
                    }
                  />
                ) : (
                  <Trash2
                    size={18}
                  />
                )}

                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelDialog && (
        <div
          className={
            styles.modalBackdrop
          }
        >
          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
          >
            <span
              className={`${styles.modalIcon} ${styles.modalIconWarning}`}
            >
              <XCircle
                size={25}
              />
            </span>

            <h2>
              Cancel request?
            </h2>

            <p>
              New help offers will stop
              and accepted help will be
              cleared.
            </p>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                onClick={() =>
                  setShowCancelDialog(
                    false
                  )
                }
              >
                Go back
              </button>

              <button
                type="button"
                className={
                  styles.warningButton
                }
                onClick={
                  handleCancel
                }
                disabled={
                  processingAction ===
                  "cancel"
                }
              >
                {processingAction ===
                  "cancel" ? (
                  <LoaderCircle
                    size={18}
                    className={
                      styles.spinning
                    }
                  />
                ) : (
                  <XCircle
                    size={18}
                  />
                )}

                Cancel request
              </button>
            </div>
          </div>
        </div>
      )}

      {showResolveDialog && (
        <div
          className={
            styles.modalBackdrop
          }
        >
          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
          >
            <span
              className={`${styles.modalIcon} ${styles.modalIconSuccess}`}
            >
              <CheckCircle2
                size={25}
              />
            </span>

            <h2>
              Mark as resolved?
            </h2>

            <p>
              Confirm that the required
              help was completed.
            </p>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                onClick={() =>
                  setShowResolveDialog(
                    false
                  )
                }
              >
                Not yet
              </button>

              <button
                type="button"
                className={
                  styles.successButton
                }
                onClick={
                  handleResolve
                }
                disabled={
                  processingAction ===
                  "resolve"
                }
              >
                {processingAction ===
                  "resolve" ? (
                  <LoaderCircle
                    size={18}
                    className={
                      styles.spinning
                    }
                  />
                ) : (
                  <CheckCircle2
                    size={18}
                  />
                )}

                Mark resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportDialog && (
        <div
          className={
            styles.modalBackdrop
          }
        >
          <div
            className={
              styles.modal
            }
            role="dialog"
            aria-modal="true"
          >
            <span
              className={`${styles.modalIcon} ${styles.modalIconWarning}`}
            >
              <Flag
                size={24}
              />
            </span>

            <h2>
              Report request
            </h2>

            <p>
              Select the reason that
              best explains the issue.
            </p>

            <div
              className={
                styles.reportOptions
              }
            >
              {REPORT_REASONS.map(
                (reason) => (
                  <label
                    key={
                      reason.value
                    }
                    className={`${styles.reportOption} ${reportReason ===
                      reason.value
                      ? styles.reportOptionSelected
                      : ""
                      }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={
                        reason.value
                      }
                      checked={
                        reportReason ===
                        reason.value
                      }
                      onChange={() =>
                        setReportReason(
                          reason.value
                        )
                      }
                    />

                    <span>
                      {reason.label}
                    </span>

                    {reportReason ===
                      reason.value && (
                        <Check
                          size={17}
                        />
                      )}
                  </label>
                )
              )}
            </div>

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                onClick={() =>
                  setShowReportDialog(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  styles.warningButton
                }
                onClick={
                  handleReport
                }
                disabled={
                  processingAction ===
                  "report"
                }
              >
                {processingAction ===
                  "report" ? (
                  <LoaderCircle
                    size={18}
                    className={
                      styles.spinning
                    }
                  />
                ) : (
                  <Flag
                    size={18}
                  />
                )}

                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpRequestDetails;
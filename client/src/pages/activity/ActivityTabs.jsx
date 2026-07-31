import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  UserPlus,
  Heart,
  Bell,
  Check,
  X,
  LoaderCircle,
  MessageCircle,
  UserRoundPlus,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  getReceivedFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
} from "../../services/authService";

import {
  getNotifications,
  markNotificationAsRead,
} from "../../services/notificationService";

import {
  useToastContext,
} from "../../components/ui/toast/ToastProvider";

import {
  useChat,
} from "../../context/ChatContext";

import styles from "./ActivityTabs.module.css";

/* =========================
   SAFE RESPONSE HELPERS
========================= */

const getRequestsFromResponse = (
  response
) => {
  const requests =
    response?.data?.requests ||
    response?.requests;

  return Array.isArray(requests)
    ? requests
    : [];
};

const getNotificationsFromResponse = (
  response
) => {
  const notifications =
    response?.data?.notifications ||
    response?.notifications;

  return Array.isArray(notifications)
    ? notifications
    : [];
};

const normalizeId = (
  value
) => {
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

const getNotificationRequestId = (
  notification
) =>
  normalizeId(
    notification?.followRequest
  );

const formatActivityTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const createdAt =
    new Date(value);

  if (
    Number.isNaN(
      createdAt.getTime()
    )
  ) {
    return "";
  }

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
    return `${Math.floor(
      difference / minute
    )}m`;
  }

  if (difference < day) {
    return `${Math.floor(
      difference / hour
    )}h`;
  }

  if (
    difference <
    7 * day
  ) {
    return `${Math.floor(
      difference / day
    )}d`;
  }

  return createdAt.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  );
};

const getNotificationText = (
  notification
) => {
  switch (
  notification?.type
  ) {
    case "like":
      return "liked your post";

    case "comment":
      return "commented on your post";

    case "follow":
      return "started following you";

    case "follow_request":
      return "sent you a follow request";

    default:
      return "interacted with your account";
  }
};

/* =========================
   ACTIVITY TABS
========================= */

const ActivityTabs = () => {
  const toast =
    useToastContext();

  const navigate =
    useNavigate();

  const {
    socket,

    setNotificationUnreadCount,
    loadNotifications:
    syncNotificationBadge,
  } = useChat();

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "follow-requests"
  );

  /* =========================
     FOLLOW REQUEST STATE
  ========================= */

  const [
    followRequests,
    setFollowRequests,
  ] = useState([]);

  const [
    requestsLoading,
    setRequestsLoading,
  ] = useState(true);

  const [
    requestError,
    setRequestError,
  ] = useState("");

  const [
    processingRequestId,
    setProcessingRequestId,
  ] = useState("");

  /* =========================
     NOTIFICATION STATE
  ========================= */

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(true);

  const [
    notificationError,
    setNotificationError,
  ] = useState("");

  const [
    readingNotificationId,
    setReadingNotificationId,
  ] = useState("");

  const notificationIdsRef =
    useRef(new Set());

  /* =========================
     LOAD FOLLOW REQUESTS
  ========================= */

  const loadFollowRequests =
    useCallback(async () => {
      try {
        setRequestsLoading(
          true
        );

        setRequestError("");

        const response =
          await getReceivedFollowRequests();

        const requests =
          getRequestsFromResponse(
            response
          );

        setFollowRequests(
          requests.filter(
            (request) =>
              request?.status ===
              "pending"
          )
        );
      } catch (error) {
        console.error(
          "LOAD FOLLOW REQUESTS ERROR:",
          error?.response?.data ||
          error?.message
        );

        setRequestError(
          error?.response?.data
            ?.message ||
          "Unable to load follow requests"
        );
      } finally {
        setRequestsLoading(
          false
        );
      }
    }, []);

  /* =========================
     LOAD NOTIFICATIONS
  ========================= */

  const loadActivityNotifications =
    useCallback(async () => {
      try {
        setNotificationsLoading(
          true
        );

        setNotificationError(
          ""
        );

        const response =
          await getNotifications();

        const loadedNotifications =
          getNotificationsFromResponse(
            response
          );

        const notificationIds =
          loadedNotifications
            .map((notification) =>
              normalizeId(
                notification
              )
            )
            .filter(Boolean);

        notificationIdsRef.current =
          new Set(
            notificationIds
          );

        setNotifications(
          loadedNotifications
        );

        setNotificationUnreadCount(
          Math.max(
            0,
            Number(
              response?.data
                ?.unreadCount
            ) || 0
          )
        );
      } catch (error) {
        console.error(
          "LOAD NOTIFICATIONS ERROR:",
          error?.response?.data ||
          error?.message
        );

        setNotificationError(
          error?.response?.data
            ?.message ||
          "Unable to load notifications"
        );
      } finally {
        setNotificationsLoading(
          false
        );
      }
    }, [
      setNotificationUnreadCount,
    ]);

  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {
    Promise.all([
      loadFollowRequests(),
      loadActivityNotifications(),
    ]).catch((error) => {
      console.error(
        "LOAD ACTIVITY DATA ERROR:",
        error
      );
    });
  }, [
    loadFollowRequests,
    loadActivityNotifications,
  ]);

  /* =========================
     LOCAL REQUEST HELPERS
  ========================= */

  const removeRequest =
    useCallback(
      (requestId) => {
        const normalizedRequestId =
          normalizeId(
            requestId
          );

        if (
          !normalizedRequestId
        ) {
          return;
        }

        setFollowRequests(
          (previous) =>
            previous.filter(
              (request) =>
                normalizeId(
                  request
                ) !==
                normalizedRequestId
            )
        );
      },
      []
    );

  const removeNotification =
    useCallback(
      ({
        notificationId,
        requestId,
      }) => {
        const safeNotificationId =
          normalizeId(
            notificationId
          );

        const safeRequestId =
          normalizeId(
            requestId
          );

        if (
          safeNotificationId
        ) {
          notificationIdsRef
            .current
            .delete(
              safeNotificationId
            );
        }

        setNotifications(
          (previous) =>
            previous.filter(
              (notification) => {
                const currentNotificationId =
                  normalizeId(
                    notification
                  );

                const currentRequestId =
                  getNotificationRequestId(
                    notification
                  );

                if (
                  safeNotificationId &&
                  currentNotificationId ===
                  safeNotificationId
                ) {
                  return false;
                }

                if (
                  safeRequestId &&
                  currentRequestId ===
                  safeRequestId
                ) {
                  return false;
                }

                return true;
              }
            )
        );
      },
      []
    );

  /* =========================
     ACCEPT REQUEST
  ========================= */

  const handleAccept =
    async (
      requestId
    ) => {
      const normalizedRequestId =
        normalizeId(
          requestId
        );

      if (
        !normalizedRequestId ||
        processingRequestId
      ) {
        return;
      }

      try {
        setProcessingRequestId(
          normalizedRequestId
        );

        await acceptFollowRequest(
          normalizedRequestId
        );

        removeRequest(
          normalizedRequestId
        );

        removeNotification({
          requestId:
            normalizedRequestId,
        });

        await syncNotificationBadge();

        toast.success(
          "Follow request accepted"
        );
      } catch (error) {
        console.error(
          "ACCEPT FOLLOW REQUEST ERROR:",
          error?.response?.data ||
          error?.message
        );

        toast.error(
          error?.response?.data
            ?.message ||
          "Unable to accept follow request"
        );
      } finally {
        setProcessingRequestId(
          ""
        );
      }
    };

  /* =========================
     DECLINE REQUEST
  ========================= */

  const handleDecline =
    async (
      requestId
    ) => {
      const normalizedRequestId =
        normalizeId(
          requestId
        );

      if (
        !normalizedRequestId ||
        processingRequestId
      ) {
        return;
      }

      try {
        setProcessingRequestId(
          normalizedRequestId
        );

        await declineFollowRequest(
          normalizedRequestId
        );

        removeRequest(
          normalizedRequestId
        );

        removeNotification({
          requestId:
            normalizedRequestId,
        });

        await syncNotificationBadge();

        toast.success(
          "Follow request declined"
        );
      } catch (error) {
        console.error(
          "DECLINE FOLLOW REQUEST ERROR:",
          error?.response?.data ||
          error?.message
        );

        toast.error(
          error?.response?.data
            ?.message ||
          "Unable to decline follow request"
        );
      } finally {
        setProcessingRequestId(
          ""
        );
      }
    };

  /* =========================
     MARK ONE NOTIFICATION READ
  ========================= */

  const markOneAsRead =
    useCallback(
      async (
        notification
      ) => {
        const notificationId =
          normalizeId(
            notification
          );

        if (
          !notificationId ||
          notification?.isRead ||
          readingNotificationId
        ) {
          return;
        }

        try {
          setReadingNotificationId(
            notificationId
          );

          /*
           * Backend exact remaining
           * unreadCount return chesthundi.
           */
          const response =
            await markNotificationAsRead(
              notificationId
            );

          /*
           * Selected notification ni
           * local list lo read ga mark.
           */
          setNotifications(
            (previous) =>
              previous.map(
                (item) =>
                  normalizeId(
                    item
                  ) ===
                    notificationId
                    ? {
                      ...item,
                      isRead:
                        true,
                    }
                    : item
              )
          );

          /*
           * Manual previous - 1 vaddu.
           * Backend DB source-of-truth
           * unreadCount directly set.
           */
          setNotificationUnreadCount(
            Math.max(
              0,
              Number(
                response?.data
                  ?.unreadCount
              ) || 0
            )
          );
        } catch (error) {
          console.error(
            "MARK NOTIFICATION READ ERROR:",
            error?.response?.data ||
            error?.message
          );
        } finally {
          setReadingNotificationId(
            ""
          );
        }
      },
      [
        readingNotificationId,
        setNotificationUnreadCount,
      ]
    );

  /* =========================
     NOTIFICATION CLICK
  ========================= */

  const handleNotificationClick =
    async (
      notification
    ) => {
      await markOneAsRead(
        notification
      );

      const senderId =
        normalizeId(
          notification?.sender
        );

      const postId =
        normalizeId(
          notification?.post
        );

      if (
        notification?.type ===
        "like" ||
        notification?.type ===
        "comment"
      ) {
        if (postId) {
          navigate(
            `/post/${postId}`
          );
        }

        return;
      }

      if (senderId) {
        navigate(
          `/profile/${senderId}`
        );
      }
    };

  /* =========================
     SOCKET EVENTS
  ========================= */

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleFollowRequestReceived =
      (payload = {}) => {
        const requestId =
          normalizeId(
            payload?.requestId ||
            payload?._id
          );

        if (!requestId) {
          return;
        }

        setFollowRequests(
          (previous) => {
            const alreadyExists =
              previous.some(
                (request) =>
                  normalizeId(
                    request
                  ) === requestId
              );

            if (alreadyExists) {
              return previous;
            }

            return [
              {
                _id:
                  requestId,

                sender:
                  payload?.sender ||
                  {},

                status:
                  payload?.status ||
                  "pending",

                createdAt:
                  payload?.createdAt ||
                  new Date()
                    .toISOString(),
              },

              ...previous,
            ];
          }
        );
      };

    const handleFollowRequestRemoved =
      (payload = {}) => {
        removeRequest(
          payload?.requestId
        );
      };

    const handleNotificationReceived =
      (payload = {}) => {
        const notification =
          payload?.notification &&
            typeof payload
              .notification ===
            "object"
            ? payload.notification
            : payload;

        const notificationId =
          normalizeId(
            notification
          );

        if (!notificationId) {
          return;
        }

        if (
          notificationIdsRef
            .current
            .has(
              notificationId
            )
        ) {
          return;
        }

        notificationIdsRef
          .current
          .add(
            notificationId
          );

        setNotifications(
          (previous) => [
            notification,
            ...previous,
          ]
        );
      };

    const handleNotificationRemoved =
      (payload = {}) => {
        removeNotification({
          notificationId:
            payload
              ?.notificationId,

          requestId:
            payload?.requestId,
        });
      };

    const handleNotificationRead =
      (payload = {}) => {
        const notificationId =
          normalizeId(
            payload?.notificationId
          );

        if (!notificationId) {
          return;
        }

        setNotifications(
          (previous) =>
            previous.map(
              (notification) =>
                normalizeId(
                  notification
                ) ===
                  notificationId
                  ? {
                    ...notification,
                    isRead: true,
                  }
                  : notification
            )
        );

        /*
         * Backend exact unread count
         * pampisthe direct ga set.
         */
        if (
          payload?.unreadCount !==
          undefined
        ) {
          setNotificationUnreadCount(
            Math.max(
              0,
              Number(
                payload.unreadCount
              ) || 0
            )
          );
        }
      };

    const handleSocketConnect =
      () => {
        Promise.all([
          loadFollowRequests(),
          loadActivityNotifications(),
        ]).catch((error) => {
          console.error(
            "ACTIVITY RECONNECT SYNC ERROR:",
            error
          );
        });
      };

    socket.on(
      "followRequestReceived",
      handleFollowRequestReceived
    );

    socket.on(
      "followRequestRemoved",
      handleFollowRequestRemoved
    );

    socket.on(
      "notificationReceived",
      handleNotificationReceived
    );

    socket.on(
      "notificationRemoved",
      handleNotificationRemoved
    );

    socket.on(
      "notificationRead",
      handleNotificationRead
    );

    socket.on(
      "connect",
      handleSocketConnect
    );

    return () => {
      socket.off(
        "followRequestReceived",
        handleFollowRequestReceived
      );

      socket.off(
        "followRequestRemoved",
        handleFollowRequestRemoved
      );

      socket.off(
        "notificationReceived",
        handleNotificationReceived
      );

      socket.off(
        "notificationRemoved",
        handleNotificationRemoved
      );

      socket.off(
        "notificationRead",
        handleNotificationRead
      );

      socket.off(
        "connect",
        handleSocketConnect
      );
    };
  }, [
    socket,
    removeRequest,
    removeNotification,
    loadFollowRequests,
    loadActivityNotifications,
  ]);

  /* =========================
     FILTERED NOTIFICATIONS
  ========================= */

  const likeNotifications =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            notification?.type ===
            "like"
        ),
      [notifications]
    );

  const generalNotifications =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            notification?.type !==
            "like"
        ),
      [notifications]
    );

  const unreadLikeCount =
    useMemo(
      () =>
        likeNotifications.filter(
          (notification) =>
            !notification?.isRead
        ).length,
      [likeNotifications]
    );

  const unreadGeneralCount =
    useMemo(
      () =>
        generalNotifications.filter(
          (notification) =>
            !notification?.isRead
        ).length,
      [generalNotifications]
    );

  /* =========================
     FOLLOW REQUEST CONTENT
  ========================= */

  const renderFollowRequests =
    () => {
      if (requestsLoading) {
        return (
          <div
            className={
              styles.empty
            }
          >
            <LoaderCircle
              size={30}
              className={
                styles.spinner
              }
            />

            <h3>
              Loading requests
            </h3>

            <p>
              Please wait a moment.
            </p>
          </div>
        );
      }

      if (requestError) {
        return (
          <div
            className={
              styles.empty
            }
          >
            <UserPlus
              size={30}
            />

            <h3>
              Unable to load requests
            </h3>

            <p>
              {requestError}
            </p>

            <button
              type="button"
              className={
                styles.retryButton
              }
              onClick={
                loadFollowRequests
              }
            >
              Try Again
            </button>
          </div>
        );
      }

      if (
        followRequests.length ===
        0
      ) {
        return (
          <div
            className={
              styles.empty
            }
          >
            <UserPlus
              size={30}
            />

            <h3>
              No follow requests
            </h3>

            <p>
              New follow requests will
              appear here.
            </p>
          </div>
        );
      }

      return (
        <div
          className={
            styles.requestList
          }
        >
          {followRequests.map(
            (request) => {
              const requestId =
                normalizeId(
                  request
                );

              const sender =
                request?.sender ||
                {};

              const isProcessing =
                processingRequestId ===
                requestId;

              return (
                <article
                  key={
                    requestId
                  }
                  className={
                    styles.requestCard
                  }
                >
                  <button
                    type="button"
                    className={
                      styles.requestUser
                    }
                    onClick={() => {
                      const senderId =
                        normalizeId(
                          sender
                        );

                      if (
                        senderId
                      ) {
                        navigate(
                          `/profile/${senderId}`
                        );
                      }
                    }}
                  >
                    <img
                      src={
                        sender
                          ?.profilePic ||
                        DefaultAvatar
                      }
                      alt={
                        sender?.name ||
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

                    <div
                      className={
                        styles.userDetails
                      }
                    >
                      <strong>
                        {sender?.name ||
                          "User"}
                      </strong>

                      <span>
                        @
                        {sender?.username ||
                          "user"}
                      </span>

                      <p>
                        Wants to follow
                        you
                      </p>
                    </div>
                  </button>

                  <div
                    className={
                      styles.requestActions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.acceptButton
                      }
                      onClick={() =>
                        handleAccept(
                          requestId
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      {isProcessing ? (
                        <LoaderCircle
                          size={17}
                          className={
                            styles.spinner
                          }
                        />
                      ) : (
                        <Check
                          size={17}
                        />
                      )}

                      <span>
                        Accept
                      </span>
                    </button>

                    <button
                      type="button"
                      className={
                        styles.declineButton
                      }
                      onClick={() =>
                        handleDecline(
                          requestId
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      <X
                        size={17}
                      />

                      <span>
                        Decline
                      </span>
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </div>
      );
    };

  /* =========================
     NOTIFICATION CONTENT
  ========================= */

  const renderNotifications =
    (
      items,
      emptyType
    ) => {
      if (
        notificationsLoading
      ) {
        return (
          <div
            className={
              styles.empty
            }
          >
            <LoaderCircle
              size={30}
              className={
                styles.spinner
              }
            />

            <h3>
              Loading activity
            </h3>

            <p>
              Please wait a moment.
            </p>
          </div>
        );
      }

      if (
        notificationError
      ) {
        return (
          <div
            className={
              styles.empty
            }
          >
            <Bell size={30} />

            <h3>
              Unable to load activity
            </h3>

            <p>
              {notificationError}
            </p>

            <button
              type="button"
              className={
                styles.retryButton
              }
              onClick={
                loadActivityNotifications
              }
            >
              Try Again
            </button>
          </div>
        );
      }

      if (
        items.length === 0
      ) {
        return (
          <div
            className={
              styles.empty
            }
          >
            {emptyType ===
              "likes" ? (
              <Heart size={30} />
            ) : (
              <Bell size={30} />
            )}

            <h3>
              {emptyType ===
                "likes"
                ? "No likes yet"
                : "No notifications yet"}
            </h3>

            <p>
              {emptyType ===
                "likes"
                ? "Likes on your posts will appear here."
                : "Your notifications will appear here."}
            </p>
          </div>
        );
      }

      return (
        <div
          className={
            styles.requestList
          }
        >
          {items.map(
            (notification) => {
              const notificationId =
                normalizeId(
                  notification
                );

              const sender =
                notification
                  ?.sender || {};

              const isReading =
                readingNotificationId ===
                notificationId;

              return (
                <button
                  type="button"
                  key={
                    notificationId
                  }
                  className={`${styles.requestCard} ${!notification?.isRead
                    ? styles.unreadCard ||
                    ""
                    : ""
                    }`}
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                  disabled={
                    isReading
                  }
                >
                  <div
                    className={
                      styles.requestUser
                    }
                  >
                    <img
                      src={
                        sender
                          ?.profilePic ||
                        DefaultAvatar
                      }
                      alt={
                        sender?.name ||
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

                    <div
                      className={
                        styles.userDetails
                      }
                    >
                      <strong>
                        {sender?.name ||
                          sender?.username ||
                          "Someone"}
                      </strong>

                      <p>
                        {getNotificationText(
                          notification
                        )}
                      </p>

                      <span>
                        {formatActivityTime(
                          notification
                            ?.createdAt
                        )}
                      </span>
                    </div>
                  </div>

                  <div
                    className={
                      styles.notificationTypeIcon ||
                      styles.requestActions
                    }
                  >
                    {isReading ? (
                      <LoaderCircle
                        size={18}
                        className={
                          styles.spinner
                        }
                      />
                    ) : notification?.type ===
                      "like" ? (
                      <Heart
                        size={19}
                      />
                    ) : notification?.type ===
                      "comment" ? (
                      <MessageCircle
                        size={19}
                      />
                    ) : notification?.type ===
                      "follow_request" ? (
                      <UserRoundPlus
                        size={19}
                      />
                    ) : (
                      <UserPlus
                        size={19}
                      />
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>
      );
    };

  return (
    <div
      className={
        styles.wrapper
      }
    >
      <div
        className={
          styles.tabs
        }
        role="tablist"
        aria-label="Activity sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            activeTab ===
            "follow-requests"
          }
          className={`${styles.tab} ${activeTab ===
            "follow-requests"
            ? styles.active
            : ""
            }`}
          onClick={() =>
            setActiveTab(
              "follow-requests"
            )
          }
        >
          <UserPlus
            size={18}
          />

          <span>
            Follow Requests
          </span>

          {followRequests.length >
            0 && (
              <span
                className={
                  styles.badge
                }
              >
                {
                  followRequests.length
                }
              </span>
            )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            activeTab ===
            "likes"
          }
          className={`${styles.tab} ${activeTab === "likes"
            ? styles.active
            : ""
            }`}
          onClick={() =>
            setActiveTab(
              "likes"
            )
          }
        >
          <Heart size={18} />

          <span>
            Likes
          </span>

          {unreadLikeCount >
            0 && (
              <span
                className={
                  styles.badge
                }
              >
                {unreadLikeCount >
                  99
                  ? "99+"
                  : unreadLikeCount}
              </span>
            )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            activeTab ===
            "notifications"
          }
          className={`${styles.tab} ${activeTab ===
            "notifications"
            ? styles.active
            : ""
            }`}
          onClick={() =>
            setActiveTab(
              "notifications"
            )
          }
        >
          <Bell size={18} />

          <span>
            Notifications
          </span>

          {unreadGeneralCount >
            0 && (
              <span
                className={
                  styles.badge
                }
              >
                {unreadGeneralCount >
                  99
                  ? "99+"
                  : unreadGeneralCount}
              </span>
            )}
        </button>
      </div>

      <div
        className={
          styles.content
        }
      >
        {activeTab ===
          "follow-requests" &&
          renderFollowRequests()}

        {activeTab ===
          "likes" &&
          renderNotifications(
            likeNotifications,
            "likes"
          )}

        {activeTab ===
          "notifications" &&
          renderNotifications(
            generalNotifications,
            "notifications"
          )}
      </div>
    </div>
  );
};

export default ActivityTabs;
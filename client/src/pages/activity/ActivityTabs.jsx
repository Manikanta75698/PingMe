import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  UserPlus,
  Heart,
  Bell,
  Check,
  X,
  LoaderCircle,
} from "lucide-react";

import DefaultAvatar from "../../assets/default-avatar.png";

import {
  getReceivedFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
} from "../../services/authService";

import {
  useToastContext,
} from "../../components/ui/toast/ToastProvider";

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

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(
    value?._id ||
    value?.id ||
    ""
  );
};

/* =========================
   ACTIVITY TABS
========================= */

const ActivityTabs = () => {
  const toast =
    useToastContext();

  const [activeTab, setActiveTab] =
    useState("follow-requests");

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
     LOAD FOLLOW REQUESTS
  ========================= */

  const loadFollowRequests =
    useCallback(async () => {
      try {
        setRequestsLoading(true);
        setRequestError("");

        const response =
          await getReceivedFollowRequests();

        setFollowRequests(
          getRequestsFromResponse(
            response
          )
        );
      } catch (error) {
        console.error(
          "Load Follow Requests Error:",
          error?.response?.data ||
          error?.message
        );

        setRequestError(
          error?.response?.data
            ?.message ||
          "Unable to load follow requests"
        );
      } finally {
        setRequestsLoading(false);
      }
    }, []);

  useEffect(() => {
    loadFollowRequests();
  }, [loadFollowRequests]);

  useEffect(() => {
    const handleFollowRequestReceived = (
      event
    ) => {
      const payload =
        event?.detail;

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
                  request?._id
                ) === requestId
            );

          if (alreadyExists) {
            return previous;
          }

          return [
            {
              _id: requestId,
              sender:
                payload?.sender || {},
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

    const handleFollowRequestRemoved = (
      event
    ) => {
      const requestId =
        normalizeId(
          event?.detail
            ?.requestId
        );

      if (!requestId) {
        return;
      }

      removeRequest(requestId);
    };

    const handleSocketReconnect =
      () => {
        void loadFollowRequests();
      };

    window.addEventListener(
      "follow-request:received",
      handleFollowRequestReceived
    );

    window.addEventListener(
      "follow-request:removed",
      handleFollowRequestRemoved
    );

    window.addEventListener(
      "socket:reconnected",
      handleSocketReconnect
    );

    return () => {
      window.removeEventListener(
        "follow-request:received",
        handleFollowRequestReceived
      );

      window.removeEventListener(
        "follow-request:removed",
        handleFollowRequestRemoved
      );

      window.removeEventListener(
        "socket:reconnected",
        handleSocketReconnect
      );
    };
  }, [loadFollowRequests]);

  /* =========================
     REMOVE REQUEST LOCALLY
  ========================= */

  const removeRequest = (
    requestId
  ) => {
    const normalizedRequestId =
      normalizeId(requestId);

    setFollowRequests(
      (previous) =>
        previous.filter(
          (request) =>
            normalizeId(
              request?._id
            ) !==
            normalizedRequestId
        )
    );
  };

  /* =========================
     ACCEPT REQUEST
  ========================= */

  const handleAccept = async (
    requestId
  ) => {
    const normalizedRequestId =
      normalizeId(requestId);

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

      toast.success(
        "Follow request accepted"
      );
    } catch (error) {
      console.error(
        "Accept Follow Request Error:",
        error?.response?.data ||
        error?.message
      );

      toast.error(
        error?.response?.data
          ?.message ||
        "Unable to accept follow request"
      );
    } finally {
      setProcessingRequestId("");
    }
  };

  /* =========================
     DECLINE REQUEST
  ========================= */

  const handleDecline = async (
    requestId
  ) => {
    const normalizedRequestId =
      normalizeId(requestId);

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

      toast.success(
        "Follow request declined"
      );
    } catch (error) {
      console.error(
        "Decline Follow Request Error:",
        error?.response?.data ||
        error?.message
      );

      toast.error(
        error?.response?.data
          ?.message ||
        "Unable to decline follow request"
      );
    } finally {
      setProcessingRequestId("");
    }
  };

  /* =========================
     FOLLOW REQUEST CONTENT
  ========================= */

  const renderFollowRequests =
    () => {
      if (requestsLoading) {
        return (
          <div
            className={styles.empty}
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
            className={styles.empty}
          >
            <UserPlus size={30} />

            <h3>
              Unable to load requests
            </h3>

            <p>{requestError}</p>

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
        followRequests.length === 0
      ) {
        return (
          <div
            className={styles.empty}
          >
            <UserPlus size={30} />

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
                  request?._id
                );

              const sender =
                request?.sender || {};

              const isProcessing =
                processingRequestId ===
                requestId;

              return (
                <article
                  key={requestId}
                  className={
                    styles.requestCard
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
                        event
                          .currentTarget
                          .onerror =
                          null;

                        event
                          .currentTarget
                          .src =
                          DefaultAvatar;
                      }}
                    />

                    <div
                      className={
                        styles
                          .userDetails
                      }
                    >
                      <strong>
                        {sender?.name ||
                          "User"}
                      </strong>

                      <span>
                        @
                        {sender
                          ?.username ||
                          "user"}
                      </span>

                      <p>
                        Wants to follow
                        you
                      </p>
                    </div>
                  </div>

                  <div
                    className={
                      styles
                        .requestActions
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles
                          .acceptButton
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
                            styles
                              .spinner
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
                        styles
                          .declineButton
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
                      <X size={17} />

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

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.tabs}
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
          <UserPlus size={18} />

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
            activeTab === "likes"
          }
          className={`${styles.tab} ${activeTab === "likes"
            ? styles.active
            : ""
            }`}
          onClick={() =>
            setActiveTab("likes")
          }
        >
          <Heart size={18} />
          <span>Likes</span>
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
          <span>Notifications</span>
        </button>
      </div>

      <div
        className={styles.content}
      >
        {activeTab ===
          "follow-requests" &&
          renderFollowRequests()}

        {activeTab === "likes" && (
          <div
            className={styles.empty}
          >
            <Heart size={30} />

            <h3>No likes yet</h3>

            <p>
              Likes on your posts will
              appear here.
            </p>
          </div>
        )}

        {activeTab ===
          "notifications" && (
            <div
              className={styles.empty}
            >
              <Bell size={30} />

              <h3>
                No notifications yet
              </h3>

              <p>
                Your notifications will
                appear here.
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default ActivityTabs;
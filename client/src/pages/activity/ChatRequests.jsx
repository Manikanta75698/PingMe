import { useState } from "react";

import DefaultAvatar from "../../assets/default-avatar.png";

import { useChat } from "../../context/ChatContext";

import {
  acceptChatRequest,
  declineChatRequest,
} from "../../services/chatRequestService";

import styles from "./ChatRequests.module.css";

const ChatRequests = () => {
  const {
    receivedRequests,
    setReceivedRequests,
    loadRequests,
  } = useChat();

  const [loadingId, setLoadingId] =
    useState(null);

  const requests = Array.isArray(receivedRequests)
    ? receivedRequests.filter(
      (request) => request.status === "pending"
    )
    : [];

  const handleAccept = async (id) => {
    if (loadingId) return;

    try {
      setLoadingId(id);

      await acceptChatRequest(id);
      await loadRequests();
    } catch (error) {
      console.error(
        "Accept request error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
        "Unable to accept request"
      );
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (id) => {
    if (loadingId) return;

    try {
      setLoadingId(id);

      await declineChatRequest(id);
      await loadRequests();
    } catch (error) {
      console.error(
        "Decline request error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
        "Unable to decline request"
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <div>
          <h2>Chat Requests</h2>

          <p>
            People who want to start a conversation
            with you.
          </p>
        </div>

        {requests.length > 0 && (
          <span className={styles.count}>
            {requests.length}
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className={styles.empty}>
          <h3>No pending requests</h3>

          <p>
            New chat requests will appear here.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {requests.map((request) => {
            const sender = request.sender || {};
            const isLoading =
              loadingId === request._id;

            return (
              <article
                key={request._id}
                className={styles.request}
              >
                <div className={styles.user}>
                  <img
                    src={
                      sender.profilePic ||
                      DefaultAvatar
                    }
                    alt={sender.name || "User"}
                    className={styles.avatar}
                    onError={(event) => {
                      event.currentTarget.src =
                        DefaultAvatar;
                    }}
                  />

                  <div className={styles.userInfo}>
                    <strong>
                      {sender.name || "PingMe User"}
                    </strong>

                    <span>
                      @{sender.username || "user"}
                    </span>

                    <p>
                      Wants to chat with you.
                    </p>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.acceptBtn}
                    onClick={() =>
                      handleAccept(request._id)
                    }
                    disabled={isLoading}
                  >
                    {isLoading
                      ? "Please wait..."
                      : "Accept"}
                  </button>

                  <button
                    type="button"
                    className={styles.declineBtn}
                    onClick={() =>
                      handleDecline(request._id)
                    }
                    disabled={isLoading}
                  >
                    Decline
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ChatRequests;
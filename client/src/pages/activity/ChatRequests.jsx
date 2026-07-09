import { useChat } from "../../context/ChatContext";

import {
  acceptChatRequest,
  declineChatRequest,
} from "../../services/chatRequestService";

const ChatRequests = () => {

  const {
    receivedRequests,
    loadRequests,
  } = useChat();


  const handleAccept = async (id) => {
    try {
      await acceptChatRequest(id);

      await loadRequests();

    } catch (error) {
      console.log(error);
    }
  };

  const handleDecline = async (id) => {
    try {
      await declineChatRequest(id);

      await loadRequests();

    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat Requests</h2>

      {receivedRequests.length === 0 && (
        <p>No pending requests.</p>
      )}

      {receivedRequests.map((request) => (
        <div
          key={request._id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px",
            borderBottom: "1px solid #eee",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <img
              src={
                request.sender.profilePic ||
                "https://ui-avatars.com/api/?name=" +
                request.sender.name
              }
              alt=""
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />

            <div>
              <strong>{request.sender.name}</strong>

              <p style={{ margin: 0 }}>
                wants to chat with you.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button onClick={() => handleAccept(request._id)}>
              Accept
            </button>

            <button onClick={() => handleDecline(request._id)}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatRequests;
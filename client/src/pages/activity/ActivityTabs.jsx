import { useState } from "react";

import ChatRequests from "./ChatRequests";

const ActivityTabs = () => {
  const [tab, setTab] = useState("requests");

  return (
    <>
      <div style={{ display: "flex", gap: 15, marginBottom: 20 }}>
        <button onClick={() => setTab("requests")}>
          Chat Requests
        </button>

        <button onClick={() => setTab("likes")}>
          Likes
        </button>

        <button onClick={() => setTab("notifications")}>
          Notifications
        </button>
      </div>

      {tab === "requests" && <ChatRequests />}

      {tab === "likes" && (
        <h3>Coming Soon...</h3>
      )}

      {tab === "notifications" && (
        <h3>Coming Soon...</h3>
      )}
    </>
  );
};

export default ActivityTabs;
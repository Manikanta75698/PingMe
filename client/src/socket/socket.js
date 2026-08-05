import {
  io,
} from "socket.io-client";

const isDevelopment =
  import.meta.env.MODE ===
  "development";

const FALLBACK_SOCKET_URL =
  isDevelopment
    ? "http://localhost:5000"
    : "https://pingme-m8y1.onrender.com";

const SOCKET_URL = String(
  import.meta.env
    .VITE_SOCKET_URL ||
  FALLBACK_SOCKET_URL
)
  .trim()
  .replace(/\/+$/, "");

/* =========================
   TOKEN HELPER
========================= */

const getStoredToken = () => {
  try {
    return (
      localStorage
        .getItem("token")
        ?.trim() || ""
    );
  } catch (error) {
    console.error(
      "Unable to read socket token:",
      error
    );

    return "";
  }
};

/* =========================
   SOCKET INSTANCE
========================= */

const socket = io(
  SOCKET_URL,
  {
    autoConnect: false,

    transports: [
      "polling",
      "websocket",
    ],

    upgrade: true,

    auth: {
      token: getStoredToken(),
    },

    reconnection: true,

    reconnectionAttempts:
      Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax:
      5000,

    randomizationFactor:
      0.5,

    timeout: 20000,
  }
);

/* =========================
   WINDOW EVENT BRIDGE
========================= */

/*
 * Socket events ni React components
 * direct socket dependency lekunda
 * window CustomEvent dwara receive
 * chesukovachu.
 */
const dispatchAppEvent = (
  eventName,
  detail = null
) => {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      eventName,
      {
        detail,
      }
    )
  );
};

/* =========================
   AUTH HELPERS
========================= */

export const refreshSocketAuth =
  () => {
    const token =
      getStoredToken();

    socket.auth = {
      token,
    };

    return token;
  };

export const connectSocket =
  () => {
    const token =
      refreshSocketAuth();

    if (!token) {
      if (isDevelopment) {
        console.warn(
          "Socket connection skipped: token missing"
        );
      }

      return false;
    }

    if (!socket.connected) {
      socket.connect();
    }

    return true;
  };

export const disconnectSocket =
  () => {
    if (
      socket.connected ||
      socket.active
    ) {
      socket.disconnect();
    }

    socket.auth = {
      token: "",
    };
  };

/* =========================
   CONNECTION EVENTS
========================= */

socket.on(
  "connect",
  () => {
    if (isDevelopment) {
      console.log(
        "GLOBAL SOCKET CONNECTED:",
        socket.id
      );
    }

    /*
     * Reconnect / fresh connect tarvatha
     * components server data ni
     * re-sync chesukovachu.
     */
    dispatchAppEvent(
      "socket:connected",
      {
        socketId: socket.id,
      }
    );
  }
);

socket.on(
  "disconnect",
  (reason) => {
    if (isDevelopment) {
      console.log(
        "GLOBAL SOCKET DISCONNECTED:",
        reason
      );
    }

    dispatchAppEvent(
      "socket:disconnected",
      {
        reason,
      }
    );
  }
);

socket.on(
  "connect_error",
  (error) => {
    const errorCode =
      error?.data?.code ||
      error?.code ||
      "";

    if (isDevelopment) {
      console.error(
        "GLOBAL SOCKET CONNECTION ERROR:",
        error?.message ||
        "Unknown socket error",
        errorCode
          ? `(${errorCode})`
          : ""
      );
    }

    const authenticationErrors =
      new Set([
        "AUTH_TOKEN_MISSING",
        "AUTH_TOKEN_INVALID",
        "AUTH_TOKEN_EXPIRED",
        "UNAUTHORIZED",
      ]);

    if (
      authenticationErrors.has(
        String(errorCode)
      )
    ) {
      socket.disconnect();
    }
  }
);

/* =========================
   FOLLOW REQUEST EVENTS
========================= */

/*
 * Private account owner ki
 * new request vachinappudu.
 */
socket.on(
  "followRequestReceived",
  (payload) => {
    if (isDevelopment) {
      console.log(
        "FOLLOW REQUEST RECEIVED:",
        payload
      );
    }

    dispatchAppEvent(
      "follow-request:received",
      payload
    );
  }
);

/*
 * Request sender ki:
 * owner request accept chesadu.
 */
socket.on(
  "followRequestAccepted",
  (payload) => {
    if (isDevelopment) {
      console.log(
        "FOLLOW REQUEST ACCEPTED:",
        payload
      );
    }

    dispatchAppEvent(
      "follow-request:accepted",
      payload
    );
  }
);

/*
 * Request sender ki:
 * owner request decline chesadu.
 */
socket.on(
  "followRequestDeclined",
  (payload) => {
    if (isDevelopment) {
      console.log(
        "FOLLOW REQUEST DECLINED:",
        payload
      );
    }

    dispatchAppEvent(
      "follow-request:declined",
      payload
    );
  }
);

/*
 * Owner Activity list nundi
 * handled request remove cheyyadaniki.
 */
socket.on(
  "followRequestRemoved",
  (payload) => {
    if (isDevelopment) {
      console.log(
        "FOLLOW REQUEST REMOVED:",
        payload
      );
    }

    dispatchAppEvent(
      "follow-request:removed",
      payload
    );
  }
);

/* =========================
   FOLLOW STATUS EVENTS
========================= */

/*
 * Public follow / unfollow,
 * accepted request tarvatha other
 * components state sync kosam.
 */
socket.on(
  "userFollowStatusUpdated",
  (payload) => {
    if (isDevelopment) {
      console.log(
        "FOLLOW STATUS UPDATED:",
        payload
      );
    }

    dispatchAppEvent(
      "follow-status:updated",
      payload
    );
  }
);

/* =========================
   BLOCK STATUS EVENTS
========================= */

socket.on(
  "userBlockStatusUpdated",
  (payload) => {
    dispatchAppEvent(
      "user-block:updated",
      payload
    );
  }
);



/* =========================
   FIND SOMEONE NOW EVENTS
========================= */

socket.on(
  "userIntentUpdated",
  (payload) => {
    if (isDevelopment) {
      console.log(
        "USER INTENT UPDATED:",
        payload
      );
    }

    dispatchAppEvent(
      "user-intent:updated",
      payload
    );
  }
);

/* =========================
   RECONNECTION EVENTS
========================= */

socket.io.on(
  "reconnect_attempt",
  (attemptNumber) => {

    refreshSocketAuth();

    if (isDevelopment) {
      console.log(
        "GLOBAL SOCKET RECONNECT ATTEMPT:",
        attemptNumber
      );
    }
  }
);

socket.io.on(
  "reconnect",
  (attemptNumber) => {
    if (isDevelopment) {
      console.log(
        "GLOBAL SOCKET RECONNECTED:",
        attemptNumber,
        socket.id
      );
    }

    dispatchAppEvent(
      "socket:reconnected",
      {
        attemptNumber,
        socketId: socket.id,
      }
    );
  }
);

socket.io.on(
  "reconnect_error",
  (error) => {
    if (isDevelopment) {
      console.error(
        "GLOBAL SOCKET RECONNECT ERROR:",
        error?.message ||
        "Unknown reconnect error"
      );
    }
  }
);

socket.io.on(
  "reconnect_failed",
  () => {
    if (isDevelopment) {
      console.error(
        "GLOBAL SOCKET RECONNECT FAILED"
      );
    }
  }
);

export default socket;
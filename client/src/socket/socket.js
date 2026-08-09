import {
  io,
} from "socket.io-client";

/* =========================
   ENVIRONMENT
========================= */

const isDevelopment =
  import.meta.env.DEV;

const LOCAL_SOCKET_URL =
  "http://localhost:5000";

const PRODUCTION_SOCKET_FALLBACK =
  "https://pingme-m8y1.onrender.com";

const normalizeSocketUrl = (
  value
) =>
  String(
    value || ""
  )
    .trim()
    .replace(/\/+$/, "");

const SOCKET_URL =
  isDevelopment
    ? LOCAL_SOCKET_URL
    : normalizeSocketUrl(
      import.meta.env
        .VITE_SOCKET_URL ||
      PRODUCTION_SOCKET_FALLBACK
    );

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
   WINDOW EVENT BRIDGE
========================= */

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
   SOCKET INSTANCE
========================= */

const socket = io(
  SOCKET_URL,
  {
    autoConnect: false,

    /*
     * WebSocket first.
     * Unsupported/network restricted ayithe
     * polling fallback use avuthundi.
     */
    transports: [
      "websocket",
      "polling",
    ],

    upgrade: true,

    auth: {
      token:
        getStoredToken(),
    },

    reconnection: true,

    reconnectionAttempts:
      Infinity,

    reconnectionDelay:
      800,

    reconnectionDelayMax:
      5000,

    randomizationFactor:
      0.4,

    timeout:
      15000,
  }
);

/* =========================
   CONNECTION STATE
========================= */

let manualDisconnect = false;

let lastAuthToken =
  getStoredToken();

/* =========================
   AUTH HELPERS
========================= */

export const refreshSocketAuth =
  () => {
    const token =
      getStoredToken();

    lastAuthToken = token;

    socket.auth = {
      token,
    };

    return token;
  };

/* =========================
   CONNECT SOCKET
========================= */

export const connectSocket = () => {
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

  manualDisconnect = false;

  /*
   * Already connected ayithe
   * reconnect unnecessary.
   */
  if (socket.connected) {
    return true;
  }

  /*
   * Previous auth failure/reconnect manager
   * stale state lo unna fresh connection
   * start cheyyadaniki connect call.
   */
  try {
    socket.connect();

    return true;
  } catch (error) {
    console.error(
      "Unable to connect socket:",
      error
    );

    return false;
  }
};

/* =========================
   DISCONNECT SOCKET
========================= */

export const disconnectSocket =
  () => {
    manualDisconnect = true;

    if (
      socket.connected ||
      socket.active
    ) {
      socket.disconnect();
    }

    lastAuthToken = "";

    socket.auth = {
      token: "",
    };
  };

/* =========================
   RECONNECT WITH FRESH AUTH
========================= */

export const reconnectSocket =
  () => {
    const token =
      refreshSocketAuth();

    if (!token) {
      disconnectSocket();

      return false;
    }

    manualDisconnect = false;

    /*
     * Existing socket old token tho
     * connected unte fresh handshake kosam
     * disconnect + connect.
     */
    if (socket.connected) {
      socket.disconnect();
    }

    socket.connect();

    return true;
  };

/* =========================
   CONNECTION EVENTS
========================= */

socket.on(
  "connect",
  () => {
    manualDisconnect = false;

    if (isDevelopment) {
      console.log(
        "GLOBAL SOCKET CONNECTED:",
        socket.id
      );
    }

    dispatchAppEvent(
      "socket:connected",
      {
        socketId:
          socket.id,

        connectedAt:
          Date.now(),
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

        manual:
          manualDisconnect,

        disconnectedAt:
          Date.now(),
      }
    );
  }
);

socket.on(
  "connect_error",
  (error) => {
    const errorCode =
      String(
        error?.data?.code ||
        error?.code ||
        ""
      );

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

    dispatchAppEvent(
      "socket:connection-error",
      {
        code:
          errorCode,

        message:
          error?.message ||
          "Socket connection failed",
      }
    );

    const authenticationErrors =
      new Set([
        "AUTH_TOKEN_MISSING",
        "AUTH_TOKEN_INVALID",
        "AUTH_TOKEN_EXPIRED",
        "UNAUTHORIZED",
      ]);

    if (
      authenticationErrors.has(
        errorCode
      )
    ) {
      manualDisconnect = true;

      socket.disconnect();

      return;
    }

    /*
     * Non-auth errors ki Socket.IO
     * automatic reconnect continue chesthundi.
     */
    manualDisconnect = false;
  }
);

/* =========================
   FOLLOW REQUEST EVENTS
========================= */

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
    const currentToken =
      refreshSocketAuth();

    /*
     * Logout tarvatha reconnect
     * attempt continue kakudadhu.
     */
    if (
      !currentToken ||
      manualDisconnect
    ) {
      socket.disconnect();

      return;
    }

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

        socketId:
          socket.id,

        reconnectedAt:
          Date.now(),
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

    dispatchAppEvent(
      "socket:reconnect-error",
      {
        message:
          error?.message ||
          "Socket reconnect failed",
      }
    );
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

    dispatchAppEvent(
      "socket:reconnect-failed"
    );
  }
);

/* =========================
   BROWSER NETWORK EVENTS
========================= */

if (
  typeof window !==
  "undefined"
) {
  window.addEventListener(
    "online",
    () => {
      const token =
        getStoredToken();

      if (
        token &&
        !manualDisconnect &&
        !socket.connected
      ) {
        refreshSocketAuth();
        socket.connect();
      }

      dispatchAppEvent(
        "network:online"
      );
    }
  );

  window.addEventListener(
    "offline",
    () => {
      dispatchAppEvent(
        "network:offline"
      );
    }
  );

  window.addEventListener(
    "focus",
    () => {
      const currentToken =
        getStoredToken();

      if (
        !currentToken ||
        manualDisconnect
      ) {
        return;
      }

      /*
       * Login user/token changed kani
       * old auth socket lo undipothe
       * fresh handshake start chestham.
       */
      if (
        currentToken !==
        lastAuthToken
      ) {
        reconnectSocket();

        return;
      }

      if (!socket.connected) {
        refreshSocketAuth();
        socket.connect();
      }
    }
  );
}

export default socket;
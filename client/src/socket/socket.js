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

const socket = io(
  SOCKET_URL,
  {
    autoConnect: false,

    /*
     * Initial authentication payload.
     * connectSocket() every connection mundu
     * latest token malli set chesthundi.
     */
    auth: {
      token: getStoredToken(),
    },

    /*
     * Default polling -> WebSocket upgrade
     * Render/Vercel environment ki reliable.
     */
    reconnection: true,
    reconnectionAttempts:
      Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,

    timeout: 20000,
  }
);

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
      console.warn(
        "Socket connection skipped: token missing"
      );

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

socket.on("connect", () => {
  if (isDevelopment) {
    console.log(
      "GLOBAL SOCKET CONNECTED:",
      socket.id
    );
  }
});

socket.on(
  "disconnect",
  (reason) => {
    if (isDevelopment) {
      console.log(
        "GLOBAL SOCKET DISCONNECTED:",
        reason
      );
    }
  }
);

socket.on(
  "connect_error",
  (error) => {
    const errorCode =
      error?.data?.code ||
      error?.code ||
      "";

    console.error(
      "GLOBAL SOCKET CONNECTION ERROR:",
      error?.message ||
      "Unknown socket error",
      errorCode
        ? `(${errorCode})`
        : ""
    );

    /*
     * Backend authentication reject chesthe
     * endless reconnect loop stop chesthundi.
     */
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
   RECONNECTION EVENTS
========================= */

socket.io.on(
  "reconnect_attempt",
  (attemptNumber) => {
    /*
     * Token refresh/login jarigina tarvata
     * latest token use chesthundi.
     */
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
  }
);

socket.io.on(
  "reconnect_error",
  (error) => {
    console.error(
      "GLOBAL SOCKET RECONNECT ERROR:",
      error?.message ||
      "Unknown reconnect error"
    );
  }
);

socket.io.on(
  "reconnect_failed",
  () => {
    console.error(
      "GLOBAL SOCKET RECONNECT FAILED"
    );
  }
);

export default socket;
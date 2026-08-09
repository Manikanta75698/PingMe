import axios from "axios";

/* =========================
   API BASE URL
========================= */

const LOCAL_API_ORIGIN =
  "http://localhost:5000";

const normalizeOrigin = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .replace(/\/+$/, "");
};

const normalizeApiBaseUrl = (
  value
) => {
  const normalizedOrigin =
    normalizeOrigin(value);

  if (!normalizedOrigin) {
    return `${LOCAL_API_ORIGIN}/api`;
  }

  if (
    normalizedOrigin
      .toLowerCase()
      .endsWith("/api")
  ) {
    return normalizedOrigin;
  }

  return `${normalizedOrigin}/api`;
};

/*
 * Development:
 *   Always use local backend.
 *
 * Production:
 *   Use VITE_API_URL from Vercel.
 */
const API_ORIGIN =
  import.meta.env.DEV
    ? LOCAL_API_ORIGIN
    : normalizeOrigin(
        import.meta.env.VITE_API_URL
      );

const API_URL =
  normalizeApiBaseUrl(
    API_ORIGIN
  );

/* =========================
   AXIOS INSTANCE
========================= */

const api = axios.create({
  baseURL: API_URL,

  timeout: 45000,

  withCredentials: true,

  headers: {
    Accept: "application/json",
  },
});

/* =========================
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;

      sessionStorage.removeItem(
        "authRedirecting"
      );
    }

    /*
     * Browser/Axios should create
     * multipart boundaries itself.
     */
    if (
      config.data instanceof
      FormData
    ) {
      if (
        typeof config.headers
          ?.delete ===
        "function"
      ) {
        config.headers.delete(
          "Content-Type"
        );
      } else if (
        config.headers
      ) {
        delete config.headers[
          "Content-Type"
        ];

        delete config.headers[
          "content-type"
        ];
      }
    }

    if (
      import.meta.env.DEV
    ) {
      const method =
        config.method
          ?.toUpperCase() ||
        "GET";

      console.log(
        `[API REQUEST] ${method} ${config.baseURL}${config.url}`
      );
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */

api.interceptors.response.use(
  (response) =>
    response,

  (error) => {
    /*
     * Intentional cancellation.
     */
    if (
      axios.isCancel(error) ||
      error.code ===
        "ERR_CANCELED"
    ) {
      return Promise.reject(
        error
      );
    }

    const status =
      error.response?.status;

    const requestUrl =
      String(
        error.config?.url ||
          ""
      );

    const serverMessage =
      error.response?.data
        ?.message;

    const isTimeout =
      error.code ===
        "ECONNABORTED" ||
      String(
        error.message || ""
      )
        .toLowerCase()
        .includes(
          "timeout"
        );

    const publicAuthRoutes = [
      "/auth/login",
      "/auth/register",
      "/auth/google",
      "/auth/verify-otp",
      "/auth/resend-otp",
      "/auth/forgot-password",
      "/auth/verify-reset-otp",
      "/auth/reset-password",
    ];

    const isPublicAuthRequest =
      publicAuthRoutes.some(
        (route) =>
          requestUrl.includes(
            route
          )
      );

    if (
      import.meta.env.DEV
    ) {
      console.error(
        "[API ERROR]",
        {
          status:
            status ||
            "NETWORK",

          method:
            error.config
              ?.method
              ?.toUpperCase(),

          url:
            requestUrl,

          message:
            serverMessage ||
            error.message,
        }
      );
    }

    /* =========================
       UNAUTHORIZED SESSION
    ========================= */

    const storedToken =
      localStorage.getItem(
        "token"
      );

    if (
      status === 401 &&
      storedToken &&
      !isPublicAuthRequest
    ) {
      const alreadyRedirecting =
        sessionStorage.getItem(
          "authRedirecting"
        );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      if (
        !alreadyRedirecting
      ) {
        sessionStorage.setItem(
          "authRedirecting",
          "true"
        );

        const currentPath =
          window.location
            .pathname;

        if (
          currentPath !==
            "/" &&
          currentPath !==
            "/login"
        ) {
          window.location
            .replace("/");
        }
      }
    }

    /* =========================
       USER-FRIENDLY MESSAGE
    ========================= */

    if (
      !navigator.onLine
    ) {
      error.userMessage =
        "You appear to be offline. Check your internet connection.";
    } else if (
      isTimeout
    ) {
      error.userMessage =
        "The server took too long to respond. Please try again.";
    } else if (
      !error.response
    ) {
      error.userMessage =
        "Unable to connect to the server. Please try again.";
    } else if (
      status === 400
    ) {
      error.userMessage =
        serverMessage ||
        "Please check the information you entered.";
    } else if (
      status === 401
    ) {
      error.userMessage =
        serverMessage ||
        "Your session has expired. Please sign in again.";
    } else if (
      status === 403
    ) {
      error.userMessage =
        serverMessage ||
        "You do not have permission to perform this action.";
    } else if (
      status === 404
    ) {
      error.userMessage =
        serverMessage ||
        "The requested resource was not found.";
    } else if (
      status === 409
    ) {
      error.userMessage =
        serverMessage ||
        "This information already exists.";
    } else if (
      status === 429
    ) {
      error.userMessage =
        serverMessage ||
        "Too many requests. Please wait and try again.";
    } else if (
      status >= 500
    ) {
      error.userMessage =
        serverMessage ||
        "The server encountered an error. Please try again shortly.";
    } else {
      error.userMessage =
        serverMessage ||
        "Something went wrong. Please try again.";
    }

    return Promise.reject(
      error
    );
  }
);

/* =========================
   HELPERS
========================= */

export const clearAuthRedirectFlag =
  () => {
    sessionStorage.removeItem(
      "authRedirecting"
    );
  };

export const getApiBaseUrl =
  () => API_URL;

export default api;
import axios from "axios";


const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const API_URL = rawApiUrl.replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_URL,


  timeout: 30000,


  withCredentials: true,

  headers: {
    Accept: "application/json",
  },
});


api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }


    if (
      config.data instanceof FormData
    ) {
      delete config.headers[
        "Content-Type"
      ];
    }

    if (import.meta.env.DEV) {
      console.log(
        `[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
      );
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status =
      error.response?.status;

    const requestUrl =
      error.config?.url || "";

    const serverMessage =
      error.response?.data?.message;

    if (import.meta.env.DEV) {
      console.error(
        "[API ERROR]",
        {
          status,
          url: requestUrl,
          message:
            serverMessage ||
            error.message,
        }
      );
    }

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
      publicAuthRoutes.some((route) =>
        requestUrl.includes(route)
      );

    if (
      status === 401 &&
      !isPublicAuthRequest
    ) {
      const alreadyRedirecting =
        sessionStorage.getItem(
          "authRedirecting"
        );

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (!alreadyRedirecting) {
        sessionStorage.setItem(
          "authRedirecting",
          "true"
        );

        window.location.replace("/");
      }
    }

    if (!error.response) {
      error.userMessage =
        "Unable to connect to the server. Check your internet connection and try again.";
    } else if (status === 404) {
      error.userMessage =
        serverMessage ||
        "The requested resource was not found.";
    } else if (status === 403) {
      error.userMessage =
        serverMessage ||
        "You do not have permission to perform this action.";
    } else if (status >= 500) {
      error.userMessage =
        serverMessage ||
        "The server encountered an error. Please try again shortly.";
    } else {
      error.userMessage =
        serverMessage ||
        "Something went wrong. Please try again.";
    }

    return Promise.reject(error);
  }
);


export const clearAuthRedirectFlag =
  () => {
    sessionStorage.removeItem(
      "authRedirecting"
    );
  };

export const getApiBaseUrl =
  () => API_URL;

export default api;
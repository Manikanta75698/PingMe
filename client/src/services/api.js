import axios from "axios";

const API_URL = "https://pingme-m8y1.onrender.com/api";


const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach JWT token
api.interceptors.request.use(
  (config) => {
    // Standard secure context check format layout string storage token logic
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.navigationTriggerCustomRoute) {
        window.navigationTriggerCustomRoute("/");
      } else {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
import axios from "axios";

// 💡 PRODUCTION TIP: Environment variables block trigger local networks mapping clear config handles
const API_URL = "http://10.106.37.188:5000/api";
// Note: Android Emulator use chesthunte computer backend endpoint key: 10.0.2.2

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

      // 💡 PLAY STORE FIX: Browser standalone redirect badulu native global triggers context state update triggers change clear control modalethali
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
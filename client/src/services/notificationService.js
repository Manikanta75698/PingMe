import api from "./api";

/* =========================
   GET NOTIFICATIONS
========================= */

export const getNotifications =
  () =>
    api.get(
      "/notifications"
    );

/* =========================
   MARK NOTIFICATION AS READ
========================= */

export const markNotificationAsRead =
  (notificationId) =>
    api.put(
      `/notifications/read/${notificationId}`
    );
import api from "./api";

/* =========================
   GET NOTIFICATIONS
========================= */

export const getNotifications = () =>
  api.get("/notifications");


export const markLikesAsRead = () =>
  api.put("/notifications/read-likes");

/* =========================
   MARK NOTIFICATION AS READ
========================= */

export const markNotificationAsRead = (
  notificationId
) =>
  api.put(
    `/notifications/read/${notificationId}`
  );

/* =========================
   MARK ALL NOTIFICATIONS READ
========================= */

export const markAllNotificationsAsRead =
  () =>
    api.put(
      "/notifications/read-all"
    );
import api from "./api";

export const getConversation = (userId) =>
  api.get(`/messages/conversation/${userId}`);

export const sendMessage = (data) =>
  api.post("/messages/send", data);

export const getChatSummaries = () =>
  api.get("/messages/summaries");
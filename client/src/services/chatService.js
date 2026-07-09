import api from "./api";

export const getConversation = (userId) =>
  api.get(`/messages/conversation/${userId}`);

export const sendMessage = (data) =>
  api.post("/messages/send", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
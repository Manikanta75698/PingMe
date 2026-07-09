import api from "./api";

export const sendChatRequest = (receiver) =>
  api.post("/chat-requests/send", receiver);

export const getReceivedRequests = () =>
  api.get("/chat-requests/received");

export const getSentRequests = () =>
  api.get("/chat-requests/sent");

export const acceptChatRequest = (id) =>
  api.patch(`/chat-requests/accept/${id}`);

export const declineChatRequest = (id) =>
  api.patch(`/chat-requests/decline/${id}`);
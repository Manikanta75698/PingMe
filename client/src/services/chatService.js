import api from "./api";

export const getConversation = (
  userId,
  {
    limit = 30,
    before = null,
  } = {}
) => {
  const params = {
    limit,
  };

  if (before) {
    params.before = before;
  }

  return api.get(
    `/messages/conversation/${userId}`,
    {
      params,
    }
  );
};

export const sendMessage = (data) =>
  api.post("/messages/send", data);

export const getChatSummaries = () =>
  api.get("/messages/summaries");

export const deleteMessage = (
  messageId
) =>
  api.delete(
    `/messages/${messageId}`
  );
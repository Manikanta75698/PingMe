import api from "./api";

const normalizeId = (value) =>
  String(value || "").trim();

/* =========================
   GET CONVERSATION
========================= */

export const getConversation = (
  userId,
  {
    limit = 30,
    before = null,
  } = {}
) => {
  const safeUserId =
    normalizeId(userId);

  if (!safeUserId) {
    throw new Error(
      "User ID is required"
    );
  }

  const parsedLimit =
    Number.parseInt(limit, 10);

  const safeLimit = Math.min(
    Math.max(
      Number.isNaN(parsedLimit)
        ? 30
        : parsedLimit,
      1
    ),
    50
  );

  const params = {
    limit: safeLimit,
  };

  if (before) {
    params.before = before;
  }

  return api.get(
    `/messages/conversation/${safeUserId}`,
    {
      params,
    }
  );
};

/* =========================
   SEND MESSAGE
========================= */

export const sendMessage = (
  data
) => {
  if (!data) {
    throw new Error(
      "Message data is required"
    );
  }

  return api.post(
    "/messages/send",
    data
  );
};

/* =========================
   CHAT SUMMARIES
========================= */

export const getChatSummaries =
  () =>
    api.get(
      "/messages/summaries"
    );

/* =========================
   TOGGLE MESSAGE REACTION
========================= */

export const toggleMessageReaction =
  (
    messageId,
    emoji
  ) => {
    const safeMessageId =
      normalizeId(messageId);

    const safeEmoji =
      String(emoji || "").trim();

    if (!safeMessageId) {
      throw new Error(
        "Message ID is required"
      );
    }

    if (!safeEmoji) {
      throw new Error(
        "Reaction emoji is required"
      );
    }

    return api.patch(
      `/messages/${safeMessageId}/reaction`,
      {
        emoji: safeEmoji,
      }
    );
  };

/* =========================
   DELETE MESSAGE
========================= */

export const deleteMessage = (
  messageId
) => {
  const safeMessageId =
    normalizeId(messageId);

  if (!safeMessageId) {
    throw new Error(
      "Message ID is required"
    );
  }

  return api.delete(
    `/messages/${safeMessageId}`
  );
};

export const editMessage = async (
  messageId,
  text
) => {
  const normalizedMessageId =
    String(messageId || "").trim();

  const normalizedText =
    String(text || "").trim();

  if (!normalizedMessageId) {
    throw new Error(
      "Message ID is required"
    );
  }

  if (!normalizedText) {
    throw new Error(
      "Edited message cannot be empty"
    );
  }

  return api.patch(
    `/messages/${normalizedMessageId}`,
    {
      text: normalizedText,
    }
  );
};

export const forwardMessage = async (
  messageId,
  receiverId
) => {
  const normalizedMessageId =
    String(messageId || "").trim();

  const normalizedReceiverId =
    String(receiverId || "").trim();

  if (!normalizedMessageId) {
    throw new Error(
      "Message ID is required"
    );
  }

  if (!normalizedReceiverId) {
    throw new Error(
      "Receiver ID is required"
    );
  }

  return api.post(
    `/messages/${normalizedMessageId}/forward`,
    {
      receiver:
        normalizedReceiverId,
    }
  );
};


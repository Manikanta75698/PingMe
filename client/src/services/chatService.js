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

  const isFormData =
    typeof FormData !==
    "undefined" &&
    data instanceof FormData;

  return api.post(
    "/messages/send",
    data,
    isFormData
      ? undefined
      : {
        headers: {
          "Content-Type":
            "application/json",
        },
      }
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
  messageId,
  mode = "forMe"
) => {
  const safeMessageId =
    normalizeId(messageId);

  const safeMode =
    String(mode || "")
      .trim();

  if (!safeMessageId) {
    throw new Error(
      "Message ID is required"
    );
  }

  if (
    safeMode !== "forMe" &&
    safeMode !== "forEveryone"
  ) {
    throw new Error(
      "Delete mode must be forMe or forEveryone"
    );
  }

  return api.delete(
    `/messages/${safeMessageId}`,
    {
      data: {
        mode: safeMode,
      },
    }
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

export const togglePinMessage = async (
  messageId
) => {
  const normalizedMessageId =
    String(messageId || "").trim();

  if (!normalizedMessageId) {
    throw new Error(
      "Message ID is required"
    );
  }

  return api.patch(
    `/messages/${normalizedMessageId}/pin`
  );
};


export const getPinnedMessage = async (
  userId
) => {
  const normalizedUserId =
    String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error(
      "User ID is required"
    );
  }

  return api.get(
    `/messages/conversation/${normalizedUserId}/pinned`
  );
};

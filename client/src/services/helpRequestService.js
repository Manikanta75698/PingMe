import api from "./api";

const getResponseData = (response) => {
  return response?.data || {};
};

const getErrorMessage = (
  error,
  fallbackMessage = "Something went wrong"
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

const throwServiceError = (
  error,
  fallbackMessage
) => {
  const serviceError = new Error(
    getErrorMessage(error, fallbackMessage)
  );

  serviceError.status =
    error?.response?.status || 500;

  serviceError.data =
    error?.response?.data || null;

  throw serviceError;
};

const cleanText = (value) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const normalizeHelpRequestPayload = (
  requestData = {}
) => {
  return {
    title: cleanText(requestData.title),
    description: cleanText(
      requestData.description
    ),
    category:
      requestData.category || "other",
    urgency:
      requestData.urgency || "medium",
    city: cleanText(requestData.city),
    area: cleanText(requestData.area),

    exactAddress:
      cleanText(requestData.exactAddress) ||
      cleanText(requestData.locationName),

    locationName:
      cleanText(requestData.locationName),

    latitude:
      requestData.latitude ?? null,

    longitude:
      requestData.longitude ?? null,

    contactPreference:
      requestData.contactPreference ||
      "chat",

    contactPhone:
      cleanText(requestData.contactPhone),

    expiresInDays:
      Number(requestData.expiresInDays) ||
      7,

    image:
      cleanText(requestData.image),
  };
};

export const updateNearbyHelpLocation =
  async ({
    latitude,
    longitude,
    radiusKm = 3,
    notificationsEnabled = true,
  }) => {
    try {
      const response = await api.patch(
        "/help-requests/my/location",
        {
          latitude,
          longitude,
          radiusKm,
          notificationsEnabled,
        }
      );

      return getResponseData(response);
    } catch (error) {
      throwServiceError(
        error,
        "Unable to update Nearby Help location"
      );
    }
  };

export const createHelpRequest = async (
  requestData
) => {
  try {
    const payload =
      normalizeHelpRequestPayload(
        requestData
      );

    const response = await api.post(
      "/help-requests",
      payload
    );

    return getResponseData(response);
  } catch (error) {
    throwServiceError(
      error,
      "Unable to create help request"
    );
  }
};

export const getHelpRequests = async (
  filters = {}
) => {
  try {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 10,
      category:
        filters.category || "all",
      urgency:
        filters.urgency || "all",
      status:
        filters.status || "active",
      city:
        cleanText(filters.city),
      search:
        cleanText(filters.search),
      sort:
        filters.sort || "latest",
    };

    Object.keys(params).forEach((key) => {
      if (
        params[key] === "" ||
        params[key] === null ||
        params[key] === undefined
      ) {
        delete params[key];
      }
    });

    const response = await api.get(
      "/help-requests",
      {
        params,
      }
    );

    return getResponseData(response);
  } catch (error) {
    throwServiceError(
      error,
      "Unable to load help requests"
    );
  }
};

export const getHelpRequestById =
  async (requestId) => {
    try {
      if (!requestId) {
        throw new Error(
          "Help request ID is required"
        );
      }

      const response = await api.get(
        `/help-requests/${requestId}`
      );

      return getResponseData(response);
    } catch (error) {
      throwServiceError(
        error,
        "Unable to load help request"
      );
    }
  };

export const getMyHelpRequests = async (
  filters = {}
) => {
  try {
    const response = await api.get(
      "/help-requests/my/requests",
      {
        params: {
          page: filters.page || 1,
          limit: filters.limit || 10,
          status:
            filters.status || "all",
        },
      }
    );

    return getResponseData(response);
  } catch (error) {
    throwServiceError(
      error,
      "Unable to load your help requests"
    );
  }
};

export const getMyHelpHistory =
  async () => {
    try {
      const response = await api.get(
        "/help-requests/my/history"
      );

      return getResponseData(response);
    } catch (error) {
      throwServiceError(
        error,
        "Unable to load your help history"
      );
    }
  };

export const getCommunityImpact =
  async () => {
    try {
      const response = await api.get(
        "/help-requests/community/impact"
      );

      return getResponseData(response);
    } catch (error) {
      throwServiceError(
        error,
        "Unable to load community impact"
      );
    }
  };

export const updateHelpRequest = async (
  requestId,
  requestData
) => {
  try {
    if (!requestId) {
      throw new Error(
        "Help request ID is required"
      );
    }

    const payload =
      normalizeHelpRequestPayload(
        requestData
      );

    const response = await api.patch(
      `/help-requests/${requestId}`,
      payload
    );

    return getResponseData(response);
  } catch (error) {
    throwServiceError(
      error,
      "Unable to update help request"
    );
  }
};

export const offerHelp = async (
  requestId,
  message = ""
) => {
  try {
    const response = await api.post(
      `/help-requests/${requestId}/offer`,
      {
        message: cleanText(message),
      }
    );

    return getResponseData(response);
  } catch (error) {
    throwServiceError(
      error,
      "Unable to send help offer"
    );
  }
};

export const withdrawHelpOffer =
  async (requestId) => {
    try {
      const response = await api.delete(
        `/help-requests/${requestId}/offer`
      );

      return getResponseData(response);
    } catch (error) {
      throwServiceError(
        error,
        "Unable to withdraw help offer"
      );
    }
  };

export const acceptHelper = async (
  requestId,
  helperId
) => {
  try {
    const response = await api.patch(
      `/help-requests/${requestId}/helpers/${helperId}/accept`
    );

    return getResponseData(response);
  } catch (error) {
    throwServiceError(
      error,
      "Unable to accept helper"
    );
  }
};

export const resolveHelpRequest =
  async (requestId) => {
    try {
      const response = await api.patch(
        `/help-requests/${requestId}/resolve`
      );

      return getResponseData(response);
    } catch (error) {
      throwServiceError(
        error,
        "Unable to resolve help request"
      );
    }
  };

export const cancelHelpRequest =
  async (requestId) => {
    try {
      const response = await api.patch(
        `/help-requests/${requestId}/cancel`
      );

      return getResponseData(response);
    } catch (error) {
      throwServiceError(
        error,
        "Unable to cancel help request"
      );
    }
  };

export const reportHelpRequest = async (
  requestId,
  reason = "other"
) => {
  try {
    const response = await api.post(
      `/help-requests/${requestId}/report`,
      {
        reason,
      }
    );

    return getResponseData(response);
  } catch (error) {
    throwServiceError(
      error,
      "Unable to report help request"
    );
  }
};

export const deleteHelpRequest =
  async (requestId) => {
    try {
      const response = await api.delete(
        `/help-requests/${requestId}`
      );

      return getResponseData(response);
    } catch (error) {
      throwServiceError(
        error,
        "Unable to delete help request"
      );
    }
  };

const helpRequestService = {
  updateNearbyHelpLocation,
  createHelpRequest,
  getHelpRequests,
  getHelpRequestById,
  getMyHelpRequests,
  getMyHelpHistory,
  getCommunityImpact,
  updateHelpRequest,
  offerHelp,
  withdrawHelpOffer,
  acceptHelper,
  resolveHelpRequest,
  cancelHelpRequest,
  reportHelpRequest,
  deleteHelpRequest,
};

export default helpRequestService;

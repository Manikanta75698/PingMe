import api from "./api";

/* =========================
   RESPONSE HELPERS
========================= */

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
    getErrorMessage(
      error,
      fallbackMessage
    )
  );

  serviceError.status =
    error?.response?.status || 500;

  serviceError.data =
    error?.response?.data || null;

  throw serviceError;
};

/* =========================
   REQUEST NORMALIZER
========================= */

const normalizeHelpRequestPayload = (
  requestData = {}
) => {
  return {
    title:
      requestData.title?.trim() || "",

    description:
      requestData.description?.trim() ||
      "",

    category:
      requestData.category || "other",

    urgency:
      requestData.urgency || "medium",

    city:
      requestData.city?.trim() || "",

    area:
      requestData.area?.trim() || "",

    latitude:
      requestData.latitude ?? null,

    longitude:
      requestData.longitude ?? null,

    contactPreference:
      requestData.contactPreference ||
      "chat",

    contactPhone:
      requestData.contactPhone?.trim() ||
      "",

    expiresInDays:
      Number(
        requestData.expiresInDays
      ) || 7,

    image:
      requestData.image?.trim() || "",
  };
};

/* =========================
   CREATE REQUEST
========================= */

/**
 * Create a community help request.
 *
 * POST /api/help-requests
 */
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

/* =========================
   HELP REQUEST FEED
========================= */

/**
 * Load community help requests.
 *
 * Supported filters:
 * page
 * limit
 * category
 * urgency
 * status
 * city
 * search
 * sort
 *
 * GET /api/help-requests
 */
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
        filters.status || "open",
      city:
        filters.city?.trim() || "",
      search:
        filters.search?.trim() || "",
      sort:
        filters.sort || "latest",
    };

    Object.keys(params).forEach(
      (key) => {
        if (
          params[key] === "" ||
          params[key] === null ||
          params[key] === undefined
        ) {
          delete params[key];
        }
      }
    );

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

/* =========================
   SINGLE REQUEST
========================= */

/**
 * Load complete request details.
 *
 * GET /api/help-requests/:requestId
 */
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

/* =========================
   CURRENT USER REQUESTS
========================= */

/**
 * Load requests created by the current user.
 *
 * GET /api/help-requests/my/requests
 */
export const getMyHelpRequests = async (
  filters = {}
) => {
  try {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 10,
      status:
        filters.status || "all",
    };

    const response = await api.get(
      "/help-requests/my/requests",
      {
        params,
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

/* =========================
   UPDATE REQUEST
========================= */

/**
 * Update a help request owned by the user.
 *
 * PATCH /api/help-requests/:requestId
 */
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

    const payload = {};

    if (
      requestData.title !== undefined
    ) {
      payload.title =
        requestData.title.trim();
    }

    if (
      requestData.description !==
      undefined
    ) {
      payload.description =
        requestData.description.trim();
    }

    if (
      requestData.category !== undefined
    ) {
      payload.category =
        requestData.category;
    }

    if (
      requestData.urgency !== undefined
    ) {
      payload.urgency =
        requestData.urgency;
    }

    if (
      requestData.city !== undefined
    ) {
      payload.city =
        requestData.city.trim();
    }

    if (
      requestData.area !== undefined
    ) {
      payload.area =
        requestData.area.trim();
    }

    if (
      requestData.contactPreference !==
      undefined
    ) {
      payload.contactPreference =
        requestData.contactPreference;
    }

    if (
      requestData.contactPhone !==
      undefined
    ) {
      payload.contactPhone =
        requestData.contactPhone.trim();
    }

    if (
      requestData.image !== undefined
    ) {
      payload.image =
        requestData.image.trim();
    }

    if (
      requestData.expiresInDays !==
      undefined
    ) {
      payload.expiresInDays = Number(
        requestData.expiresInDays
      );
    }

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

/* =========================
   OFFER HELP
========================= */

/**
 * Offer help for a community request.
 *
 * POST /api/help-requests/:requestId/offer
 */
export const offerHelp = async (
  requestId,
  message = ""
) => {
  try {
    if (!requestId) {
      throw new Error(
        "Help request ID is required"
      );
    }

    const response = await api.post(
      `/help-requests/${requestId}/offer`,
      {
        message: message.trim(),
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

/**
 * Withdraw current user's help offer.
 *
 * DELETE /api/help-requests/:requestId/offer
 */
export const withdrawHelpOffer =
  async (requestId) => {
    try {
      if (!requestId) {
        throw new Error(
          "Help request ID is required"
        );
      }

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

/* =========================
   ACCEPT HELPER
========================= */

/**
 * Accept one helper.
 *
 * PATCH
 * /api/help-requests/:requestId/helpers/:helperId/accept
 */
export const acceptHelper = async (
  requestId,
  helperId
) => {
  try {
    if (!requestId || !helperId) {
      throw new Error(
        "Request ID and helper ID are required"
      );
    }

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

/* =========================
   REQUEST STATUS
========================= */

/**
 * Mark a request as resolved.
 *
 * PATCH /api/help-requests/:requestId/resolve
 */
export const resolveHelpRequest =
  async (requestId) => {
    try {
      if (!requestId) {
        throw new Error(
          "Help request ID is required"
        );
      }

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

/**
 * Cancel a request.
 *
 * PATCH /api/help-requests/:requestId/cancel
 */
export const cancelHelpRequest =
  async (requestId) => {
    try {
      if (!requestId) {
        throw new Error(
          "Help request ID is required"
        );
      }

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

/* =========================
   REPORT REQUEST
========================= */

/**
 * Report an unsafe or suspicious request.
 *
 * POST /api/help-requests/:requestId/report
 */
export const reportHelpRequest = async (
  requestId,
  reason = "other"
) => {
  try {
    if (!requestId) {
      throw new Error(
        "Help request ID is required"
      );
    }

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

/* =========================
   DELETE REQUEST
========================= */

/**
 * Permanently delete the current user's
 * help request.
 *
 * DELETE /api/help-requests/:requestId
 */
export const deleteHelpRequest =
  async (requestId) => {
    try {
      if (!requestId) {
        throw new Error(
          "Help request ID is required"
        );
      }

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

/* =========================
   DEFAULT EXPORT
========================= */

const helpRequestService = {
  createHelpRequest,
  getHelpRequests,
  getHelpRequestById,
  getMyHelpRequests,
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
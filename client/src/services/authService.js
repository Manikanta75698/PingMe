import api from "./api";

const AUTH_TIMEOUT = 90000;

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeRequiredId = (
  value,
  label = "ID"
) => {
  const normalizedValue =
    String(value || "").trim();

  if (!normalizedValue) {
    throw new Error(
      `${label} is required`
    );
  }

  return encodeURIComponent(
    normalizedValue
  );
};

// =========================
// LOGIN
// =========================
export const loginUser = async (
  data = {}
) => {
  const email = normalizeEmail(
    data.email
  );

  const password = String(
    data.password || ""
  );

  if (!email || !password) {
    throw new Error(
      "Email and password are required"
    );
  }

  const response = await api.post(
    "/auth/login",
    {
      email,
      password,
    },
    {
      timeout: AUTH_TIMEOUT,
    }
  );

  if (
    !response?.data ||
    typeof response.data !==
    "object"
  ) {
    throw new Error(
      "Invalid login response"
    );
  }

  return response.data;
};

// =========================
// REGISTER
// =========================
export const registerUser = async (
  data
) => {
  const response = await api.post(
    "/auth/register",
    data
  );

  return response.data;
};

// =========================
// VERIFY REGISTRATION OTP
// =========================
export const verifyOtp = async (
  data
) => {
  const response = await api.post(
    "/auth/verify-otp",
    data
  );

  return response.data;
};

// =========================
// RESEND REGISTRATION OTP
// =========================
export const resendOtp = async (
  data
) => {
  const response = await api.post(
    "/auth/resend-otp",
    data
  );

  return response.data;
};

// =========================
// FORGOT PASSWORD
// =========================
export const forgotPassword = async (
  data
) => {
  const response = await api.post(
    "/auth/forgot-password",
    data
  );

  return response.data;
};

// =========================
// VERIFY PASSWORD RESET OTP
// =========================
export const verifyPasswordResetOtp =
  async (
    data
  ) => {
    const response = await api.post(
      "/auth/verify-reset-otp",
      data
    );

    return response.data;
  };

// =========================
// RESET PASSWORD
// =========================
export const resetPassword = async (
  data
) => {
  const response = await api.post(
    "/auth/reset-password",
    data
  );

  return response.data;
};

// =========================
// SET PASSWORD
// =========================
export const setPassword = async (
  data
) => {
  const response = await api.post(
    "/auth/set-password",
    data
  );

  return response.data;
};

// =========================
// CHANGE PASSWORD
// =========================
export const changePassword = async (
  data
) => {
  const response = await api.put(
    "/auth/change-password",
    data
  );

  return response.data;
};

// =========================
// GOOGLE LOGIN
// =========================
export const googleLogin = async (
  credential
) => {
  const normalizedCredential =
    String(
      credential || ""
    ).trim();

  if (!normalizedCredential) {
    throw new Error(
      "Google credential is required"
    );
  }

  const response = await api.post(
    "/auth/google",
    {
      credential:
        normalizedCredential,
    },
    {
      timeout: AUTH_TIMEOUT,
    }
  );

  if (
    !response?.data ||
    typeof response.data !==
    "object"
  ) {
    throw new Error(
      "Invalid Google login response"
    );
  }

  return response.data;
};

// =========================
// GET LOGGED-IN PROFILE
// =========================
export const getProfile = async () => {
  const response = await api.get(
    "/auth/profile"
  );

  return response.data;
};


// =========================
// GET CURRENT MOOD
// =========================
export const getCurrentMood = async () => {
  const response = await api.get(
    "/auth/mood"
  );

  return response.data;
};

// =========================
// UPDATE CURRENT MOOD
// =========================
export const updateCurrentMood = async (
  mood
) => {
  const normalizedMood = String(
    mood || ""
  )
    .trim()
    .toLowerCase();

  const response = await api.patch(
    "/auth/mood",
    {
      mood: normalizedMood,
    }
  );

  return response.data;
};


export const getCurrentIntent = async () => {
  const response = await api.get(
    "/auth/intent"
  );

  return response.data;
};

export const updateCurrentIntent = async (
  intent
) => {
  const response = await api.patch(
    "/auth/intent",
    {
      intent,
    }
  );

  return response.data;
};

// =========================
// UPDATE PROFILE
// =========================
export const updateProfile = async (
  data
) => {
  const response = await api.put(
    "/auth/profile",
    data
  );

  return response.data;
};

// =========================
// UPLOAD PROFILE PICTURE
// =========================
export const uploadProfilePicture =
  async (
    formData
  ) => {
    const response = await api.put(
      "/auth/profile-picture",
      formData,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );

    return response.data;
  };


// =========================
// SEARCH USERS
// =========================
export const searchUsers = async (
  query
) => {
  const normalizedQuery =
    String(query || "").trim();

  if (!normalizedQuery) {
    return {
      success: true,
      count: 0,
      users: [],
    };
  }

  const response = await api.get(
    "/auth/search",
    {
      params: {
        query: normalizedQuery,
      },
    }
  );

  return response.data;
};

// =========================
// GET USER PROFILE
// =========================
export const getUserProfile = async (
  username
) => {
  const normalizedUsername =
    String(username || "")
      .trim()
      .replace(/^@/, "");

  if (!normalizedUsername) {
    throw new Error(
      "Username is required"
    );
  }

  const response = await api.get(
    `/auth/user/${encodeURIComponent(
      normalizedUsername
    )}`
  );

  return response.data;
};

// =========================
// FOLLOW USER
// Public account  → Following
// Private account → Requested
// =========================
export const followUser = async (
  userId
) => {
  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "User ID"
    );

  const response = await api.post(
    `/auth/follow/${normalizedUserId}`
  );

  return response.data;
};

// =========================
// UNFOLLOW USER
// =========================
export const unfollowUser = async (
  userId
) => {
  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "User ID"
    );

  const response = await api.delete(
    `/auth/follow/${normalizedUserId}`
  );

  return response.data;
};

// =========================
// GET RECEIVED FOLLOW REQUESTS
// =========================
export const getReceivedFollowRequests =
  async () => {
    const response = await api.get(
      "/auth/follow-requests/received"
    );

    return response.data;
  };

// =========================
// GET SENT FOLLOW REQUESTS
// =========================
export const getSentFollowRequests =
  async () => {
    const response = await api.get(
      "/auth/follow-requests/sent"
    );

    return response.data;
  };

// =========================
// ACCEPT FOLLOW REQUEST
// =========================
export const acceptFollowRequest =
  async (
    requestId
  ) => {
    const normalizedRequestId =
      normalizeRequiredId(
        requestId,
        "Follow request ID"
      );

    const response =
      await api.patch(
        `/auth/follow-requests/${normalizedRequestId}/accept`
      );

    return response.data;
  };

// =========================
// DECLINE FOLLOW REQUEST
// =========================
export const declineFollowRequest =
  async (
    requestId
  ) => {
    const normalizedRequestId =
      normalizeRequiredId(
        requestId,
        "Follow request ID"
      );

    const response =
      await api.patch(
        `/auth/follow-requests/${normalizedRequestId}/decline`
      );

    return response.data;
  };

// =========================
// CANCEL FOLLOW REQUEST
// =========================
export const cancelFollowRequest =
  async (
    requestId
  ) => {
    const normalizedRequestId =
      normalizeRequiredId(
        requestId,
        "Follow request ID"
      );

    const response =
      await api.delete(
        `/auth/follow-requests/${normalizedRequestId}`
      );

    return response.data;
  };

// =========================
// USERNAME AVAILABILITY
// =========================
export const checkUsernameAvailability =
  async (
    username
  ) => {
    const normalizedUsername =
      String(username || "").trim();

    const response = await api.get(
      "/auth/username-availability",
      {
        params: {
          username:
            normalizedUsername,
        },
      }
    );

    return response.data;
  };

// =========================
// GET BLOCK STATUS
// Axios response return chesthundi.
// Existing ChatHeader usage kosam.
// =========================
export const getBlockStatus = async (
  userId
) => {
  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "User ID"
    );

  return api.get(
    `/auth/users/${normalizedUserId}/block-status`
  );
};

// =========================
// BLOCK USER
// Axios response return chesthundi.
// Existing ChatHeader usage kosam.
// =========================
export const blockUser = async (
  userId
) => {
  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "User ID"
    );

  return api.post(
    `/auth/users/${normalizedUserId}/block`
  );
};

// =========================
// UNBLOCK USER
// Axios response return chesthundi.
// Existing ChatHeader usage kosam.
// =========================
export const unblockUser = async (
  userId
) => {
  const normalizedUserId =
    normalizeRequiredId(
      userId,
      "User ID"
    );

  return api.delete(
    `/auth/users/${normalizedUserId}/block`
  );
};

// =========================
// GET PRIVACY SETTINGS
// =========================
export const getPrivacySettings =
  async () => {
    const response = await api.get(
      "/auth/privacy-settings"
    );

    return response.data;
  };

// =========================
// UPDATE PRIVACY SETTINGS
// =========================
export const updatePrivacySettings =
  async (
    updates = {}
  ) => {
    const response = await api.patch(
      "/auth/privacy-settings",
      updates
    );

    return response.data;
  };
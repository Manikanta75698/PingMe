import api from "./api";

const AUTH_TIMEOUT = 90000;

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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
export const registerUser = async (data) => {
  const response = await api.post(
    "/auth/register",
    data
  );

  return response.data;
};

// =========================
// VERIFY REGISTRATION OTP
// =========================
export const verifyOtp = async (data) => {
  const response = await api.post(
    "/auth/verify-otp",
    data
  );

  return response.data;
};

// =========================
// RESEND REGISTRATION OTP
// =========================
export const resendOtp = async (data) => {
  const response = await api.post(
    "/auth/resend-otp",
    data
  );

  return response.data;
};

// =========================
// FORGOT PASSWORD
// =========================
export const forgotPassword = async (data) => {
  const response = await api.post(
    "/auth/forgot-password",
    data
  );

  return response.data;
};

// =========================
// VERIFY PASSWORD RESET OTP
// =========================
export const verifyPasswordResetOtp = async (
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
export const resetPassword = async (data) => {
  const response = await api.post(
    "/auth/reset-password",
    data
  );

  return response.data;
};

export const setPassword = async (data) => {
  const response = await api.post(
    "/auth/set-password",
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
// UPDATE PROFILE
// =========================
export const updateProfile = async (data) => {
  const response = await api.put(
    "/auth/profile",
    data
  );

  return response.data;
};

// =========================
// UPLOAD PROFILE PICTURE
// =========================
export const uploadProfilePicture = async (
  formData
) => {
  const response = await api.put(
    "/auth/profile-picture",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

// =========================
// UPLOAD COVER PHOTO
// =========================
export const uploadCoverPhoto = async (
  formData
) => {
  const response = await api.put(
    "/auth/cover-photo",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

// =========================
// SEARCH USERS
// =========================
export const searchUsers = async (query) => {
  const response = await api.get(
    "/auth/search",
    {
      params: {
        query: query.trim(),
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
  const response = await api.get(
    `/auth/user/${encodeURIComponent(username)}`
  );

  return response.data;
};

// =========================
// FOLLOW USER
// =========================
export const followUser = async (userId) => {
  const response = await api.put(
    `/auth/follow/${userId}`
  );

  return response.data;
};

// =========================
// UNFOLLOW USER
// =========================
export const unfollowUser = async (
  userId
) => {
  const response = await api.put(
    `/auth/unfollow/${userId}`
  );

  return response.data;
};


export const checkUsernameAvailability = async (
  username
) => {
  const response = await api.get(
    "/auth/username-availability",
    {
      params: {
        username,
      },
    }
  );

  return response.data;
};

export const changePassword = async (data) => {
  const response = await api.put(
    "/auth/change-password",
    data
  );

  return response.data;
};

export const getBlockStatus = async (
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
    `/auth/users/${normalizedUserId}/block-status`
  );
};

export const blockUser = async (
  userId
) => {
  const normalizedUserId =
    String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error(
      "User ID is required"
    );
  }

  return api.post(
    `/auth/users/${normalizedUserId}/block`
  );
};

export const unblockUser = async (
  userId
) => {
  const normalizedUserId =
    String(userId || "").trim();

  if (!normalizedUserId) {
    throw new Error(
      "User ID is required"
    );
  }

  return api.delete(
    `/auth/users/${normalizedUserId}/block`
  );
};
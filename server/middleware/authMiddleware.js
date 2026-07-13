const jwt = require("jsonwebtoken");

const User = require("../models/User");

class AuthError extends Error {
  constructor(
    message,
    code = "UNAUTHORIZED",
    statusCode = 401
  ) {
    super(message);

    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const getJwtSecret = () => {
  const secret = String(
    process.env.JWT_SECRET || ""
  ).trim();

  if (!secret) {
    throw new AuthError(
      "Authentication configuration error",
      "AUTH_CONFIG_ERROR",
      500
    );
  }

  return secret;
};

const extractBearerToken = (
  authorizationHeader
) => {
  if (
    typeof authorizationHeader !==
    "string"
  ) {
    return "";
  }

  const [
    scheme,
    token,
  ] = authorizationHeader
    .trim()
    .split(/\s+/);

  if (
    !scheme ||
    !token ||
    scheme.toLowerCase() !==
    "bearer"
  ) {
    return "";
  }

  return token.trim();
};

const getDecodedUserId = (
  decodedToken
) =>
  String(
    decodedToken?.id ||
    decodedToken?._id ||
    decodedToken?.userId ||
    ""
  ).trim();

const verifyAccessToken = (
  token
) => {
  if (!token) {
    throw new AuthError(
      "Authentication token is required",
      "AUTH_TOKEN_MISSING"
    );
  }

  try {
    const decoded = jwt.verify(
      token,
      getJwtSecret()
    );

    const userId =
      getDecodedUserId(decoded);

    if (!userId) {
      throw new AuthError(
        "Invalid authentication token",
        "AUTH_TOKEN_INVALID"
      );
    }

    return {
      decoded,
      userId,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    if (
      error?.name ===
      "TokenExpiredError"
    ) {
      throw new AuthError(
        "Your session has expired",
        "AUTH_TOKEN_EXPIRED"
      );
    }

    if (
      error?.name ===
      "JsonWebTokenError" ||
      error?.name ===
      "NotBeforeError"
    ) {
      throw new AuthError(
        "Invalid authentication token",
        "AUTH_TOKEN_INVALID"
      );
    }

    throw error;
  }
};

const findAuthenticatedUser =
  async (
    userId,
    selection =
      "-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires -__v"
  ) => {
    try {
      const user =
        await User.findById(
          userId
        ).select(selection);

      if (!user) {
        throw new AuthError(
          "Authenticated user was not found",
          "AUTH_USER_NOT_FOUND"
        );
      }

      return user;
    } catch (error) {
      if (
        error instanceof
        AuthError
      ) {
        throw error;
      }

      if (
        error?.name ===
        "CastError"
      ) {
        throw new AuthError(
          "Invalid authentication token",
          "AUTH_TOKEN_INVALID"
        );
      }

      throw error;
    }
  };

/* =========================
   HTTP AUTHENTICATION
========================= */

const protect = async (
  req,
  res,
  next
) => {
  try {
    const token =
      extractBearerToken(
        req.headers.authorization
      );

    const { userId } =
      verifyAccessToken(token);

    const user =
      await findAuthenticatedUser(
        userId
      );

    req.user = user;

    next();
  } catch (error) {
    const statusCode =
      Number(
        error?.statusCode
      ) || 500;

    const errorCode =
      error?.code ||
      "AUTHENTICATION_ERROR";

    if (statusCode >= 500) {
      console.error(
        "HTTP AUTH ERROR:",
        error
      );
    }

    return res
      .status(statusCode)
      .json({
        success: false,
        code: errorCode,
        message:
          statusCode >= 500
            ? "Authentication service unavailable"
            : error.message,
      });
  }
};

/* =========================
   SOCKET AUTHENTICATION
========================= */

const authenticateSocket =
  async (socket, next) => {
    try {
      const handshakeToken =
        String(
          socket.handshake?.auth
            ?.token || ""
        ).trim();

      const headerToken =
        extractBearerToken(
          socket.handshake
            ?.headers
            ?.authorization
        );

      const token =
        handshakeToken ||
        headerToken;

      const { userId } =
        verifyAccessToken(token);

      const user =
        await findAuthenticatedUser(
          userId,
          "_id name username profilePic"
        );

      socket.data.userId =
        String(user._id);

      socket.data.user = {
        _id: String(user._id),
        name: user.name || "",
        username:
          user.username || "",
        profilePic:
          user.profilePic || "",
      };

      next();
    } catch (error) {
      const statusCode =
        Number(
          error?.statusCode
        ) || 500;

      const errorCode =
        error?.code ||
        "AUTHENTICATION_ERROR";

      if (statusCode >= 500) {
        console.error(
          "SOCKET AUTH ERROR:",
          error
        );
      }

      const socketError =
        new Error(
          statusCode >= 500
            ? "Authentication service unavailable"
            : error.message
        );

      socketError.data = {
        code: errorCode,
        statusCode,
      };

      next(socketError);
    }
  };

module.exports = {
  protect,
  authenticateSocket,
};
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "helpdesk",
  "pingme",
  "pingmeapp",
  "official",
  "system",
  "security",
  "moderator",
  "mod",
  "api",
  "www",
  "mail",
  "email",
  "login",
  "register",
  "signup",
  "signin",
  "account",
  "accounts",
  "profile",
  "settings",
  "explore",
  "search",
  "notifications",
  "messages",
  "chat",
  "chats",
]);

const normalizeUsername = (username) => {
  return username
    ?.trim()
    .toLowerCase();
};

const validateUsername = (username) => {
  const normalized =
    normalizeUsername(username);

  if (!normalized) {
    return {
      valid: false,
      message: "Username is required",
    };
  }

  if (normalized.length < 3) {
    return {
      valid: false,
      message:
        "Username must be at least 3 characters",
    };
  }

  if (normalized.length > 30) {
    return {
      valid: false,
      message:
        "Username cannot exceed 30 characters",
    };
  }

  if (!/^[a-z0-9._]+$/.test(normalized)) {
    return {
      valid: false,
      message:
        "Username can only contain letters, numbers, dots and underscores",
    };
  }

  if (
    normalized.startsWith(".") ||
    normalized.startsWith("_") ||
    normalized.endsWith(".") ||
    normalized.endsWith("_")
  ) {
    return {
      valid: false,
      message:
        "Username cannot start or end with a dot or underscore",
    };
  }

  if (/[._]{2,}/.test(normalized)) {
    return {
      valid: false,
      message:
        "Username cannot contain consecutive dots or underscores",
    };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      valid: false,
      message: "This username is reserved",
    };
  }

  return {
    valid: true,
    username: normalized,
  };
};

module.exports = {
  normalizeUsername,
  validateUsername,
  RESERVED_USERNAMES,
};
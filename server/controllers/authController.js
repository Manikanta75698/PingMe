const crypto = require("crypto");
const mongoose = require(
  "mongoose"
);
const User = require("../models/User");

const FollowRequest = require(
  "../models/FollowRequest"
);

const {
  getIO,
} = require("../socket/socketInstance");
const Notification = require("../models/Notification");
const Post = require("../models/Post");
const uploadImage = require("../utils/cloudinaryUpload");
const generateToken = require("../utils/generateToken");
const client = require("../config/googleAuth");
const sendOtpEmail = require("../utils/sendOtpEmail");
const sendPasswordResetOtpEmail = require(
  "../utils/sendPasswordResetOtpEmail"
);
const bcrypt = require("bcryptjs");

const {
  normalizeUsername,
  validateUsername,
} = require("../utils/username");


const {
  generateOtp,
  hashOtp,
  compareOtp,
} = require("../utils/otp");

const {
  hashPassword,
  comparePassword,
} = require("../utils/hashPassword");

const normalizeUserId = (
  value
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value).trim();
  }

  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value.toHexString();
  }

  if (
    typeof value?.toHexString ===
    "function"
  ) {
    try {
      return String(
        value.toHexString()
      ).trim();
    } catch {
      return "";
    }
  }

  if (typeof value === "object") {
    if (
      value._id &&
      value._id !== value
    ) {
      return normalizeUserId(
        value._id
      );
    }

    if (
      value.userId &&
      value.userId !== value
    ) {
      return normalizeUserId(
        value.userId
      );
    }

    if (
      Object.prototype
        .hasOwnProperty.call(
          value,
          "id"
        ) &&
      value.id &&
      value.id !== value
    ) {
      return normalizeUserId(
        value.id
      );
    }

    return "";
  }

  return String(value).trim();
};


const emitBlockStatusUpdate = (
  currentUserId,
  targetUserId,
  currentUserPayload,
  targetUserPayload
) => {
  try {
    const io = getIO();

    io.to(
      normalizeUserId(currentUserId)
    ).emit(
      "userBlockStatusUpdated",
      currentUserPayload
    );

    io.to(
      normalizeUserId(targetUserId)
    ).emit(
      "userBlockStatusUpdated",
      targetUserPayload
    );
  } catch (error) {
    console.error(
      "BLOCK STATUS SOCKET ERROR:",
      error?.message || error
    );
  }
};

// Register User
const registerUser = async (req, res) => {
  let createdUser = null;

  try {
    const {
      name,
      email,
      username,
      password,
    } = req.body;

    const cleanName = name?.trim();

    const cleanEmail = email
      ?.trim()
      .toLowerCase();

    // =========================
    // REQUIRED FIELDS
    // =========================
    if (
      !cleanName ||
      !cleanEmail ||
      !username?.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // =========================
    // USERNAME VALIDATION
    // =========================
    const usernameCheck =
      validateUsername(username);

    if (!usernameCheck.valid) {
      return res.status(400).json({
        success: false,
        field: "username",
        message: usernameCheck.message,
      });
    }

    const cleanUsername =
      usernameCheck.username;

    // =========================
    // PASSWORD VALIDATION
    // =========================
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        field: "password",
        message:
          "Password must be at least 8 characters",
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message:
          "Password must contain at least one uppercase letter",
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message:
          "Password must contain at least one lowercase letter",
      });
    }

    if (!/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message:
          "Password must contain at least one number",
      });
    }

    // =========================
    // CHECK EMAIL / USERNAME
    // =========================
    const existingUser =
      await User.findOne({
        $or: [
          {
            email: cleanEmail,
          },
          {
            username: cleanUsername,
          },
        ],
      });

    if (existingUser) {
      if (
        existingUser.email === cleanEmail
      ) {
        return res.status(409).json({
          success: false,
          field: "email",
          message:
            "Email is already registered",
        });
      }

      return res.status(409).json({
        success: false,
        field: "username",
        message:
          "Username is already taken",
      });
    }

    // =========================
    // HASH PASSWORD
    // =========================
    const hashedPassword =
      await hashPassword(password);

    // =========================
    // GENERATE OTP
    // =========================
    const otp = generateOtp();

    const hashedOtp = hashOtp(otp);

    // =========================
    // CREATE UNVERIFIED USER
    // =========================
    createdUser = await User.create({
      name: cleanName,
      email: cleanEmail,
      username: cleanUsername,
      password: hashedPassword,

      isVerified: false,

      otp: hashedOtp,

      otpExpiry: new Date(
        Date.now() + 10 * 60 * 1000
      ),

      otpAttempts: 0,

      otpLastSentAt: new Date(),
    });

    // =========================
    // SEND OTP EMAIL
    // =========================
    await sendOtpEmail({
      email: createdUser.email,
      name: createdUser.name,
      otp,
    });

    // =========================
    // SUCCESS RESPONSE
    // =========================
    return res.status(201).json({
      success: true,
      requiresVerification: true,
      message:
        "Account created. Please verify your email.",

      user: {
        id: createdUser._id,
        name: createdUser.name,
        username: createdUser.username,
        email: createdUser.email,
        isVerified: false,
      },
    });
  } catch (error) {
    console.error(
      "Register Error:",
      error
    );

    // =========================
    // DUPLICATE KEY PROTECTION
    // =========================
    if (error?.code === 11000) {
      const duplicateField =
        Object.keys(
          error.keyPattern || {}
        )[0];

      if (duplicateField === "username") {
        return res.status(409).json({
          success: false,
          field: "username",
          message:
            "Username is already taken",
        });
      }

      if (duplicateField === "email") {
        return res.status(409).json({
          success: false,
          field: "email",
          message:
            "Email is already registered",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Account already exists",
      });
    }

    // =========================
    // ROLLBACK USER
    // =========================
    // If user was created but OTP email
    // delivery failed, delete account.
    if (createdUser?._id) {
      try {
        await User.findByIdAndDelete(
          createdUser._id
        );
      } catch (rollbackError) {
        console.error(
          "Register Rollback Error:",
          rollbackError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        "Registration failed. Please try again.",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const cleanEmail = email?.trim().toLowerCase();
    const cleanOtp = otp?.toString().trim();

    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 6-digit OTP",
      });
    }

    // OTP fields have select:false in User model,
    // so explicitly select them here.
    const user = await User.findOne({
      email: cleanEmail,
    }).select(
      "+otp +otpExpiry +otpAttempts +otpLastSentAt"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification request",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "No active OTP found. Request a new OTP.",
      });
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      user.otp = "";
      user.otpExpiry = null;
      user.otpAttempts = 0;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP expired. Request a new OTP.",
      });
    }

    const attempts = user.otpAttempts || 0;

    if (attempts >= 5) {
      return res.status(429).json({
        success: false,
        message:
          "Too many invalid attempts. Request a new OTP.",
      });
    }

    const isValidOtp = compareOtp(
      cleanOtp,
      user.otp
    );

    if (!isValidOtp) {
      user.otpAttempts = attempts + 1;

      await user.save();

      const attemptsLeft = Math.max(
        0,
        5 - user.otpAttempts
      );

      return res.status(400).json({
        success: false,
        message:
          attemptsLeft > 0
            ? `Invalid OTP. ${attemptsLeft} attempts left.`
            : "Too many invalid attempts. Request a new OTP.",
      });
    }

    // Verification success
    user.isVerified = true;
    user.otp = "";
    user.otpExpiry = null;
    user.otpAttempts = 0;
    user.otpLastSentAt = null;

    await user.save();

    // Token only after successful verification
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        savedPosts: user.savedPosts || [],
        isVerified: true,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: cleanEmail,
    }).select(
      "+otp +otpExpiry +otpAttempts +otpLastSentAt"
    );

    // Generic response avoids revealing whether an email exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists, a verification code has been sent.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // 60-second resend cooldown
    const cooldownMs = 60 * 1000;

    if (user.otpLastSentAt) {
      const elapsedMs =
        Date.now() -
        new Date(user.otpLastSentAt).getTime();

      if (elapsedMs < cooldownMs) {
        const retryAfter = Math.ceil(
          (cooldownMs - elapsedMs) / 1000
        );

        res.set("Retry-After", retryAfter.toString());

        return res.status(429).json({
          success: false,
          message: `Please wait ${retryAfter} seconds before requesting another code.`,
          retryAfter,
        });
      }
    }

    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);

    // Send first; update DB only if delivery request succeeds
    await sendOtpEmail({
      email: user.email,
      name: user.name,
      otp,
    });

    user.otp = hashedOtp;
    user.otpExpiry = new Date(
      Date.now() + 10 * 60 * 1000
    );
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent.",
      cooldown: 60,
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to resend verification code. Please try again.",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: cleanEmail,
    }).select(
      [
        "+passwordResetOtp",
        "+passwordResetOtpExpiry",
        "+passwordResetOtpAttempts",
        "+passwordResetOtpLastSentAt",
      ].join(" ")
    );

    // Do not reveal whether account exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists for this email, a reset code has been sent.",
      });
    }

    // Google-only account / no local password
    if (!user.password) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists for this email, a reset code has been sent.",
      });
    }

    // 60-second cooldown
    const cooldownMs = 60 * 1000;

    if (user.passwordResetOtpLastSentAt) {
      const elapsedMs =
        Date.now() -
        new Date(
          user.passwordResetOtpLastSentAt
        ).getTime();

      if (elapsedMs < cooldownMs) {
        const retryAfter = Math.ceil(
          (cooldownMs - elapsedMs) / 1000
        );

        res.set(
          "Retry-After",
          retryAfter.toString()
        );

        return res.status(429).json({
          success: false,
          message: `Please wait ${retryAfter} seconds before requesting another code.`,
          retryAfter,
        });
      }
    }

    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);

    // Send email first.
    // DB is updated only after Resend accepts request.
    await sendPasswordResetOtpEmail({
      email: user.email,
      name: user.name,
      otp,
    });

    user.passwordResetOtp = hashedOtp;

    user.passwordResetOtpExpiry = new Date(
      Date.now() + 10 * 60 * 1000
    );

    user.passwordResetOtpAttempts = 0;

    user.passwordResetOtpLastSentAt =
      new Date();

    // Invalidate any older reset authorization
    user.passwordResetTokenHash = "";
    user.passwordResetTokenExpiry = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "If an account exists for this email, a reset code has been sent.",
      cooldown: 60,
    });
  } catch (error) {
    console.error(
      "Forgot Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process password reset request. Please try again.",
    });
  }
};

const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const cleanEmail = email?.trim().toLowerCase();
    const cleanOtp = otp?.toString().trim();

    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 6-digit OTP",
      });
    }

    const user = await User.findOne({
      email: cleanEmail,
    }).select(
      [
        "+passwordResetOtp",
        "+passwordResetOtpExpiry",
        "+passwordResetOtpAttempts",
        "+passwordResetOtpLastSentAt",
        "+passwordResetTokenHash",
        "+passwordResetTokenExpiry",
      ].join(" ")
    );

    if (
      !user ||
      !user.passwordResetOtp ||
      !user.passwordResetOtpExpiry
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset request",
      });
    }

    if (
      user.passwordResetOtpExpiry.getTime() <
      Date.now()
    ) {
      user.passwordResetOtp = "";
      user.passwordResetOtpExpiry = null;
      user.passwordResetOtpAttempts = 0;

      await user.save();

      return res.status(400).json({
        success: false,
        message:
          "Reset code expired. Request a new code.",
      });
    }

    const attempts =
      user.passwordResetOtpAttempts || 0;

    if (attempts >= 5) {
      return res.status(429).json({
        success: false,
        message:
          "Too many invalid attempts. Request a new code.",
      });
    }

    const isValidOtp = compareOtp(
      cleanOtp,
      user.passwordResetOtp
    );

    if (!isValidOtp) {
      user.passwordResetOtpAttempts =
        attempts + 1;

      await user.save();

      const attemptsLeft = Math.max(
        0,
        5 - user.passwordResetOtpAttempts
      );

      return res.status(400).json({
        success: false,
        message:
          attemptsLeft > 0
            ? `Invalid code. ${attemptsLeft} attempts left.`
            : "Too many invalid attempts. Request a new code.",
      });
    }

    // Generate a cryptographically secure
    // one-time password reset token
    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Store only hash in MongoDB
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Clear OTP after successful verification
    user.passwordResetOtp = "";
    user.passwordResetOtpExpiry = null;
    user.passwordResetOtpAttempts = 0;
    user.passwordResetOtpLastSentAt = null;

    // Reset authorization valid for 10 minutes
    user.passwordResetTokenHash =
      resetTokenHash;

    user.passwordResetTokenExpiry =
      new Date(
        Date.now() + 10 * 60 * 1000
      );

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Reset code verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error(
      "Verify Password Reset OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify reset code",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const {
      email,
      resetToken,
      password,
    } = req.body;

    const cleanEmail =
      email?.trim().toLowerCase();

    if (
      !cleanEmail ||
      !resetToken ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, reset token and new password are required",
      });
    }

    // Production-level password validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters",
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one uppercase letter",
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one lowercase letter",
      });
    }

    if (!/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one number",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await User.findOne({
      email: cleanEmail,
      passwordResetTokenHash:
        resetTokenHash,
      passwordResetTokenExpiry: {
        $gt: new Date(),
      },
    }).select(
      [
        "+passwordResetTokenHash",
        "+passwordResetTokenExpiry",
        "+passwordResetOtp",
        "+passwordResetOtpExpiry",
        "+passwordResetOtpAttempts",
        "+passwordResetOtpLastSentAt",
      ].join(" ")
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired password reset session",
      });
    }

    // Prevent reusing current password
    if (user.password) {
      const isSamePassword =
        await comparePassword(
          password,
          user.password
        );

      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message:
            "New password must be different from your current password",
        });
      }
    }

    const hashedPassword =
      await hashPassword(password);

    user.password = hashedPassword;

    // Invalidate reset authorization immediately
    user.passwordResetTokenHash = "";
    user.passwordResetTokenExpiry = null;

    // Clear all password reset OTP state
    user.passwordResetOtp = "";
    user.passwordResetOtpExpiry = null;
    user.passwordResetOtpAttempts = 0;
    user.passwordResetOtpLastSentAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error(
      "Reset Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset password. Please try again.",
    });
  }
};

const setPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.password) {
      return res.status(400).json({
        success: false,
        message: "Password already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;

    await user.save();

    return res.json({
      success: true,
      message: "Password set successfully",

      user: {
        provider: user.provider,
        hasPassword: true,
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Current password and new password are required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from current password",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully",
    });

  } catch (error) {
    console.error(
      "Change Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const user = await User.findOne({
      email: cleanEmail,
    });


    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Google account without password
    if (
      user.provider === "google" &&
      !user.password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This account was created with Google. Please sign in with Google first or set a password from your profile.",
      });
    }

    const isMatch = await comparePassword(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Block email/password login until OTP verification
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        message:
          "Please verify your email before logging in",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        savedPosts: user.savedPosts || [],
        isVerified: user.isVerified,

        provider: user.provider,
        hasPassword: Boolean(user.password),
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      email,
      name,
      picture,
      email_verified,
    } = payload;

    if (!email_verified) {
      return res.status(401).json({
        success: false,
        message: "Google email not verified",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const username =
        email.split("@")[0] +
        Math.floor(Math.random() * 1000);

      user = await User.create({
        name,
        email,
        username,
        profilePic: picture,
        provider: "google",
        isVerified: true,
      });
    } else if (user.provider !== "google") {
      user.provider = "google";
      await user.save();
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Google Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        savedPosts: user.savedPosts,
        isVerified: user.isVerified,

        provider: user.provider,
        hasPassword: Boolean(user.password),
      }
    });

  } catch (error) {
    console.error("Google Login Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   PRIVACY SETTINGS HELPERS
========================= */

const DEFAULT_PRIVACY_SETTINGS = {
  privateAccount: false,
  showOnlineStatus: true,
  showLastSeen: true,
  readReceipts: true,
  messagePermission: "everyone",
};

const normalizePrivacySettings = (
  privacySettings = {}
) => ({
  privateAccount:
    typeof privacySettings.privateAccount ===
      "boolean"
      ? privacySettings.privateAccount
      : DEFAULT_PRIVACY_SETTINGS.privateAccount,

  showOnlineStatus:
    typeof privacySettings.showOnlineStatus ===
      "boolean"
      ? privacySettings.showOnlineStatus
      : DEFAULT_PRIVACY_SETTINGS.showOnlineStatus,

  showLastSeen:
    typeof privacySettings.showLastSeen ===
      "boolean"
      ? privacySettings.showLastSeen
      : DEFAULT_PRIVACY_SETTINGS.showLastSeen,

  readReceipts:
    typeof privacySettings.readReceipts ===
      "boolean"
      ? privacySettings.readReceipts
      : DEFAULT_PRIVACY_SETTINGS.readReceipts,

  messagePermission: [
    "everyone",
    "followers",
    "following",
    "no-one",
  ].includes(privacySettings.messagePermission)
    ? privacySettings.messagePermission
    : DEFAULT_PRIVACY_SETTINGS.messagePermission,
});

/* =========================
   GET PRIVACY SETTINGS
========================= */

const getPrivacySettings = async (
  req,
  res
) => {
  try {
    const user = await User.findById(
      req.user._id
    )
      .select("privacySettings")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      privacySettings:
        normalizePrivacySettings(
          user.privacySettings
        ),
    });
  } catch (error) {
    console.error(
      "Get Privacy Settings Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load privacy settings",
    });
  }
};

/* =========================
   UPDATE PRIVACY SETTINGS
========================= */

const updatePrivacySettings = async (
  req,
  res
) => {
  try {
    const allowedBooleanFields = [
      "privateAccount",
      "showOnlineStatus",
      "showLastSeen",
      "readReceipts",
    ];

    const allowedMessagePermissions = [
      "everyone",
      "followers",
      "following",
      "no-one",
    ];

    const updates = {};

    for (
      const field of allowedBooleanFields
    ) {
      if (req.body[field] !== undefined) {
        if (
          typeof req.body[field] !==
          "boolean"
        ) {
          return res.status(400).json({
            success: false,
            field,
            message:
              `${field} must be true or false`,
          });
        }

        updates[
          `privacySettings.${field}`
        ] = req.body[field];
      }
    }

    if (
      req.body.messagePermission !==
      undefined
    ) {
      if (
        !allowedMessagePermissions.includes(
          req.body.messagePermission
        )
      ) {
        return res.status(400).json({
          success: false,
          field: "messagePermission",
          message:
            "Invalid message permission",
        });
      }

      updates[
        "privacySettings.messagePermission"
      ] = req.body.messagePermission;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No valid privacy settings provided",
      });
    }

    const user =
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: updates,
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .select("privacySettings")
        .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const privacySettings =
      normalizePrivacySettings(
        user.privacySettings
      );

    try {
      const io = getIO();

      const onlineStatusWasUpdated =
        Object.prototype.hasOwnProperty.call(
          updates,
          "privacySettings.showOnlineStatus"
        );

      const lastSeenWasUpdated =
        Object.prototype.hasOwnProperty.call(
          updates,
          "privacySettings.showLastSeen"
        );

      if (
        onlineStatusWasUpdated &&
        privacySettings.showOnlineStatus ===
        false
      ) {
        io.emit(
          "userPresenceChanged",
          {
            userId:
              normalizeUserId(
                req.user._id
              ),
            isOnline: false,
            lastSeen:
              privacySettings.showLastSeen
                ? new Date().toISOString()
                : null,
          }
        );
      }

      if (
        lastSeenWasUpdated &&
        privacySettings.showLastSeen ===
        false
      ) {
        io.emit(
          "userLastSeenPrivacyChanged",
          {
            userId:
              normalizeUserId(
                req.user._id
              ),
            lastSeen: null,
          }
        );
      }

    } catch (socketError) {
      console.error(
        "PRIVACY PRESENCE SOCKET ERROR:",
        socketError
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Privacy settings updated successfully",
      privacySettings,
    });
  } catch (error) {
    console.error(
      "Update Privacy Settings Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update privacy settings",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const account = await User.findById(
      req.user._id
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const postsCount =
      await Post.countDocuments({
        user: req.user._id,
      });

    const userObject = account.toObject();

    const hasPassword = Boolean(
      userObject.password
    );

    delete userObject.password;
    delete userObject.otp;
    delete userObject.otpExpiry;
    delete userObject.otpAttempts;
    delete userObject.otpLastSentAt;

    delete userObject.passwordResetOtp;
    delete userObject.passwordResetOtpExpiry;
    delete userObject.passwordResetOtpAttempts;
    delete userObject.passwordResetOtpLastSentAt;
    delete userObject.passwordResetTokenHash;
    delete userObject.passwordResetTokenExpiry;

    return res.status(200).json({
      success: true,
      user: {
        ...userObject,
        id: userObject._id,
        postsCount,
        hasPassword,
      },
    });
  } catch (error) {
    console.error(
      "Get Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      username,
      bio,
      website,
      location,
    } = req.body;

    // =========================
    // GET CURRENT USER
    // =========================
    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // =========================
    // NAME VALIDATION
    // =========================
    if (name !== undefined) {
      const cleanName = name.trim();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          field: "name",
          message: "Name cannot be empty",
        });
      }

      if (cleanName.length > 50) {
        return res.status(400).json({
          success: false,
          field: "name",
          message:
            "Name cannot exceed 50 characters",
        });
      }

      user.name = cleanName;
    }

    // =========================
    // USERNAME VALIDATION
    // =========================
    if (username !== undefined) {
      const usernameCheck =
        validateUsername(username);

      if (!usernameCheck.valid) {
        return res.status(400).json({
          success: false,
          field: "username",
          message: usernameCheck.message,
        });
      }

      const cleanUsername =
        usernameCheck.username;

      // Only query DB when username changed
      if (cleanUsername !== user.username) {
        const usernameExists =
          await User.exists({
            username: cleanUsername,

            _id: {
              $ne: user._id,
            },
          });

        if (usernameExists) {
          return res.status(409).json({
            success: false,
            field: "username",
            message:
              "Username is already taken",
          });
        }

        user.username = cleanUsername;
      }
    }

    // =========================
    // BIO VALIDATION
    // =========================
    if (bio !== undefined) {
      const cleanBio = bio.trim();

      if (cleanBio.length > 160) {
        return res.status(400).json({
          success: false,
          field: "bio",
          message:
            "Bio cannot exceed 160 characters",
        });
      }

      // Empty string allowed
      user.bio = cleanBio;
    }

    // =========================
    // WEBSITE VALIDATION
    // =========================
    if (website !== undefined) {
      const cleanWebsite = website.trim();

      if (cleanWebsite.length > 200) {
        return res.status(400).json({
          success: false,
          field: "website",
          message:
            "Website cannot exceed 200 characters",
        });
      }

      if (cleanWebsite) {
        let parsedUrl;

        try {
          parsedUrl = new URL(cleanWebsite);
        } catch {
          return res.status(400).json({
            success: false,
            field: "website",
            message:
              "Enter a valid website URL",
          });
        }

        if (
          !["http:", "https:"].includes(
            parsedUrl.protocol
          )
        ) {
          return res.status(400).json({
            success: false,
            field: "website",
            message:
              "Website must use http or https",
          });
        }
      }

      // Empty string allowed
      user.website = cleanWebsite;
    }

    // =========================
    // LOCATION VALIDATION
    // =========================
    if (location !== undefined) {
      const cleanLocation =
        location.trim();

      if (cleanLocation.length > 100) {
        return res.status(400).json({
          success: false,
          field: "location",
          message:
            "Location cannot exceed 100 characters",
        });
      }

      // Empty string allowed
      user.location = cleanLocation;
    }

    // =========================
    // SAVE PROFILE
    // =========================
    await user.save();

    // =========================
    // SAFE RESPONSE
    // =========================
    const responseUser = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      coverPhoto: user.coverPhoto,
      bio: user.bio,
      website: user.website,
      location: user.location,
      followers: user.followers,
      following: user.following,
      savedPosts: user.savedPosts,
      isVerified: user.isVerified,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      theme: user.theme,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      user: responseUser,
    });
  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    // =========================
    // MONGODB UNIQUE INDEX
    // RACE-CONDITION PROTECTION
    // =========================
    if (error?.code === 11000) {
      const duplicateField =
        Object.keys(
          error.keyPattern || {}
        )[0];

      if (duplicateField === "username") {
        return res.status(409).json({
          success: false,
          field: "username",
          message:
            "Username is already taken",
        });
      }

      if (duplicateField === "email") {
        return res.status(409).json({
          success: false,
          field: "email",
          message:
            "Email is already registered",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "Duplicate value already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {


    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.profilePic = await uploadImage(
      req.file.buffer,
      "pingme/profile"
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      profilePic: user.profilePic,
    });

  } catch (error) {
    console.error("Upload Profile Picture Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.coverPhoto = await uploadImage(
      req.file.buffer,
      "pingme/cover"
    );

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Cover photo updated successfully",
      coverPhoto: user.coverPhoto,
    });

  } catch (error) {
    console.error("Upload Cover Photo Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* =========================
   FOLLOW USER
========================= */

const followUser = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeUserId(req.user);

    const targetUserId =
      normalizeUserId(
        req.params?.id
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !targetUserId ||
      !mongoose.isValidObjectId(
        targetUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    if (
      currentUserId ===
      targetUserId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot follow yourself",
      });
    }

    const [
      currentUser,
      targetUser,
    ] = await Promise.all([
      User.findById(currentUserId)
        .select(
          [
            "_id",
            "name",
            "username",
            "profilePic",
            "bio",
            "following",
            "blockedUsers",
          ].join(" ")
        )
        .lean(),

      User.findById(targetUserId)
        .select(
          [
            "_id",
            "name",
            "username",
            "profilePic",
            "followers",
            "blockedUsers",
            "privacySettings.privateAccount",
          ].join(" ")
        )
        .lean(),
    ]);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message:
          "Current user not found",
      });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUserBlockedTarget =
      Array.isArray(
        currentUser.blockedUsers
      ) &&
      currentUser.blockedUsers.some(
        (userId) =>
          normalizeUserId(userId) ===
          targetUserId
      );

    const targetBlockedCurrentUser =
      Array.isArray(
        targetUser.blockedUsers
      ) &&
      targetUser.blockedUsers.some(
        (userId) =>
          normalizeUserId(userId) ===
          currentUserId
      );

    if (
      currentUserBlockedTarget ||
      targetBlockedCurrentUser
    ) {
      return res.status(403).json({
        success: false,

        message:
          currentUserBlockedTarget
            ? "Unblock this user before following"
            : "You cannot follow this user",

        code:
          currentUserBlockedTarget
            ? "USER_BLOCKED_BY_YOU"
            : "USER_BLOCKED_YOU",
      });
    }

    const alreadyFollowing =
      Array.isArray(
        currentUser.following
      ) &&
      currentUser.following.some(
        (userId) =>
          normalizeUserId(userId) ===
          targetUserId
      );

    if (alreadyFollowing) {
      return res.status(200).json({
        success: true,
        message:
          "You are already following this user",

        data: {
          userId: targetUserId,
          followStatus:
            "following",
          isFollowing: true,
          isRequested: false,
          requestId: null,
        },
      });
    }

    const privateAccount =
      targetUser
        ?.privacySettings
        ?.privateAccount === true;

    /*
     * =========================
     * PRIVATE ACCOUNT
     * =========================
     */
    if (privateAccount) {
      let followRequest;

      try {
        followRequest =
          await FollowRequest
            .findOneAndUpdate(
              {
                sender:
                  currentUserId,
                receiver:
                  targetUserId,
              },
              {
                $setOnInsert: {
                  sender:
                    currentUserId,
                  receiver:
                    targetUserId,
                },

                $set: {
                  status:
                    "pending",
                  respondedAt:
                    null,
                },
              },
              {
                returnDocument: "after",
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
              }
            );
      } catch (error) {

        if (error?.code === 11000) {
          followRequest =
            await FollowRequest.findOne({
              sender:
                currentUserId,
              receiver:
                targetUserId,
            });
        } else {
          throw error;
        }
      }

      try {
        const io = getIO();

        io.to(targetUserId).emit(
          "followRequestReceived",
          {
            requestId:
              normalizeUserId(
                followRequest?._id
              ),

            sender: {
              _id: currentUser._id,
              id: currentUser._id,
              name: currentUser.name,
              username: currentUser.username,
              profilePic:
                currentUser.profilePic || "",
              bio: currentUser.bio || "",
            },

            status: "pending",
            createdAt:
              followRequest
                ?.createdAt ||
              new Date(),
          }
        );
      } catch (socketError) {
        console.error(
          "FOLLOW REQUEST SOCKET ERROR:",
          socketError?.message ||
          socketError
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Follow request sent",

        data: {
          userId: targetUserId,
          followStatus:
            "requested",
          isFollowing: false,
          isRequested: true,

          requestId:
            followRequest?._id ||
            null,
        },
      });
    }

    /*
     * =========================
     * PUBLIC ACCOUNT
     * =========================
     */
    await Promise.all([
      User.updateOne(
        {
          _id: currentUserId,
        },
        {
          $addToSet: {
            following:
              targetUserId,
          },
        }
      ),

      User.updateOne(
        {
          _id: targetUserId,
        },
        {
          $addToSet: {
            followers:
              currentUserId,
          },
        }
      ),

      /*
       * Old declined/pending request
       * unte clean chestham.
       */
      FollowRequest.deleteOne({
        sender:
          currentUserId,
        receiver:
          targetUserId,
      }),
    ]);

    await Notification.create({
      sender: currentUserId,
      receiver: targetUserId,
      type: "follow",
    });

    try {
      const io = getIO();

      io.to(targetUserId).emit(
        "userFollowStatusUpdated",
        {
          userId:
            currentUserId,
          action: "followed",
        }
      );
    } catch (socketError) {
      console.error(
        "FOLLOW SOCKET ERROR:",
        socketError?.message ||
        socketError
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "User followed successfully",

      data: {
        userId: targetUserId,
        followStatus:
          "following",
        isFollowing: true,
        isRequested: false,
        requestId: null,
      },
    });
  } catch (error) {
    console.error(
      "FOLLOW USER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to follow user",
    });
  }
};


/* =========================
   UNFOLLOW USER
========================= */

const unfollowUser = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeUserId(req.user);

    const targetUserId =
      normalizeUserId(
        req.params?.id
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !targetUserId ||
      !mongoose.isValidObjectId(
        targetUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    if (
      currentUserId ===
      targetUserId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid follow action",
      });
    }

    const targetExists =
      await User.exists({
        _id: targetUserId,
      });

    if (!targetExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await Promise.all([
      User.updateOne(
        {
          _id: currentUserId,
        },
        {
          $pull: {
            following:
              targetUserId,
          },
        }
      ),

      User.updateOne(
        {
          _id: targetUserId,
        },
        {
          $pull: {
            followers:
              currentUserId,
          },
        }
      ),

      FollowRequest.deleteOne({
        sender:
          currentUserId,
        receiver:
          targetUserId,
      }),

      Notification.deleteMany({
        sender:
          currentUserId,
        receiver:
          targetUserId,
        type: "follow",
      }),
    ]);

    try {
      const io = getIO();

      io.to(targetUserId).emit(
        "userFollowStatusUpdated",
        {
          userId:
            currentUserId,
          action: "unfollowed",
        }
      );
    } catch (socketError) {
      console.error(
        "UNFOLLOW SOCKET ERROR:",
        socketError?.message ||
        socketError
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "User unfollowed successfully",

      data: {
        userId: targetUserId,
        followStatus: "none",
        isFollowing: false,
        isRequested: false,
        requestId: null,
      },
    });
  } catch (error) {
    console.error(
      "UNFOLLOW USER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to unfollow user",
    });
  }
};


/* =========================
   RECEIVED FOLLOW REQUESTS
========================= */

const getReceivedFollowRequests =
  async (
    req,
    res
  ) => {
    try {
      const currentUserId =
        normalizeUserId(req.user);

      if (
        !currentUserId ||
        !mongoose.isValidObjectId(
          currentUserId
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const requests =
        await FollowRequest.find({
          receiver:
            currentUserId,
          status: "pending",
        })
          .populate(
            "sender",
            "name username profilePic bio"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        count: requests.length,
        requests,
      });
    } catch (error) {
      console.error(
        "GET RECEIVED FOLLOW REQUESTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load follow requests",
      });
    }
  };


/* =========================
   SENT FOLLOW REQUESTS
========================= */

const getSentFollowRequests =
  async (
    req,
    res
  ) => {
    try {
      const currentUserId =
        normalizeUserId(req.user);

      if (
        !currentUserId ||
        !mongoose.isValidObjectId(
          currentUserId
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const requests =
        await FollowRequest.find({
          sender:
            currentUserId,
          status: "pending",
        })
          .populate(
            "receiver",
            "name username profilePic bio"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        count: requests.length,
        requests,
      });
    } catch (error) {
      console.error(
        "GET SENT FOLLOW REQUESTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load sent requests",
      });
    }
  };


/* =========================
   ACCEPT FOLLOW REQUEST
========================= */

const acceptFollowRequest =
  async (
    req,
    res
  ) => {
    try {
      const currentUserId =
        normalizeUserId(req.user);

      const requestId =
        normalizeUserId(
          req.params?.requestId
        );

      if (
        !currentUserId ||
        !mongoose.isValidObjectId(
          currentUserId
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (
        !requestId ||
        !mongoose.isValidObjectId(
          requestId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid follow request ID",
        });
      }


      const followRequest =
        await FollowRequest.findOne({
          _id: requestId,
          receiver:
            currentUserId,
          status: "pending",
        });

      if (!followRequest) {
        return res.status(404).json({
          success: false,
          message:
            "Follow request not found or already handled",
        });
      }

      const senderId =
        normalizeUserId(
          followRequest.sender
        );

      const [
        sender,
        receiver,
      ] = await Promise.all([
        User.findById(senderId)
          .select(
            "_id blockedUsers"
          )
          .lean(),

        User.findById(
          currentUserId
        )
          .select(
            "_id blockedUsers"
          )
          .lean(),
      ]);

      if (!sender || !receiver) {
        await FollowRequest
          .deleteOne({
            _id: requestId,
          });

        return res.status(404).json({
          success: false,
          message:
            "Follow request user not found",
        });
      }

      const senderBlockedReceiver =
        Array.isArray(
          sender.blockedUsers
        ) &&
        sender.blockedUsers.some(
          (userId) =>
            normalizeUserId(
              userId
            ) === currentUserId
        );

      const receiverBlockedSender =
        Array.isArray(
          receiver.blockedUsers
        ) &&
        receiver.blockedUsers.some(
          (userId) =>
            normalizeUserId(
              userId
            ) === senderId
        );

      if (
        senderBlockedReceiver ||
        receiverBlockedSender
      ) {
        await FollowRequest
          .deleteOne({
            _id: requestId,
          });

        return res.status(403).json({
          success: false,
          message:
            "This follow request can no longer be accepted",

          code:
            "FOLLOW_REQUEST_BLOCKED",
        });
      }

      const claimedRequest =
        await FollowRequest
          .findOneAndDelete({
            _id: requestId,
            receiver:
              currentUserId,
            status: "pending",
          });

      if (!claimedRequest) {
        return res.status(409).json({
          success: false,
          message:
            "Follow request was already handled",
          code:
            "FOLLOW_REQUEST_ALREADY_HANDLED",
        });
      }

      await Promise.all([
        User.updateOne(
          {
            _id: senderId,
          },
          {
            $addToSet: {
              following:
                currentUserId,
            },
          }
        ),

        User.updateOne(
          {
            _id: currentUserId,
          },
          {
            $addToSet: {
              followers:
                senderId,
            },
          }
        ),
      ]);

      await Notification.create({
        sender: senderId,
        receiver:
          currentUserId,
        type: "follow",
      });

      try {
        const io = getIO();

        io.to(senderId).emit(
          "followRequestAccepted",
          {
            requestId,
            userId:
              currentUserId,
            followStatus:
              "following",
          }
        );

        io.to(currentUserId).emit(
          "followRequestRemoved",
          {
            requestId,
          }
        );
      } catch (socketError) {
        console.error(
          "ACCEPT FOLLOW REQUEST SOCKET ERROR:",
          socketError?.message ||
          socketError
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Follow request accepted",

        data: {
          requestId,
          userId: senderId,
          status: "accepted",
        },
      });
    } catch (error) {
      console.error(
        "ACCEPT FOLLOW REQUEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to accept follow request",
      });
    }
  };


/* =========================
   DECLINE FOLLOW REQUEST
========================= */

const declineFollowRequest =
  async (
    req,
    res
  ) => {
    try {
      const currentUserId =
        normalizeUserId(req.user);

      const requestId =
        normalizeUserId(
          req.params?.requestId
        );

      if (
        !requestId ||
        !mongoose.isValidObjectId(
          requestId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid follow request ID",
        });
      }

      const followRequest =
        await FollowRequest
          .findOneAndDelete({
            _id: requestId,
            receiver:
              currentUserId,
            status: "pending",
          });

      if (!followRequest) {
        return res.status(404).json({
          success: false,
          message:
            "Follow request not found or already handled",
        });
      }

      const senderId =
        normalizeUserId(
          followRequest.sender
        );

      try {
        const io = getIO();

        io.to(senderId).emit(
          "followRequestDeclined",
          {
            requestId,
            userId:
              currentUserId,
          }
        );

        io.to(currentUserId).emit(
          "followRequestRemoved",
          {
            requestId,
          }
        );
      } catch (socketError) {
        console.error(
          "DECLINE FOLLOW REQUEST SOCKET ERROR:",
          socketError?.message ||
          socketError
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Follow request declined",

        data: {
          requestId,
          userId: senderId,
          status: "declined",
        },
      });
    } catch (error) {
      console.error(
        "DECLINE FOLLOW REQUEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to decline follow request",
      });
    }
  };


/* =========================
   CANCEL FOLLOW REQUEST
========================= */

const cancelFollowRequest =
  async (
    req,
    res
  ) => {
    try {
      const currentUserId =
        normalizeUserId(req.user);

      const requestId =
        normalizeUserId(
          req.params?.requestId
        );

      if (
        !requestId ||
        !mongoose.isValidObjectId(
          requestId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid follow request ID",
        });
      }

      /*
       * Sender matrame own pending
       * request cancel cheyyagaladu.
       */
      const followRequest =
        await FollowRequest
          .findOneAndDelete({
            _id: requestId,
            sender:
              currentUserId,
            status: "pending",
          });

      if (!followRequest) {
        return res.status(404).json({
          success: false,
          message:
            "Follow request not found or cannot be cancelled",
        });
      }

      const receiverId =
        normalizeUserId(
          followRequest.receiver
        );

      try {
        const io = getIO();

        io.to(receiverId).emit(
          "followRequestRemoved",
          {
            requestId,
            senderId:
              currentUserId,
          }
        );
      } catch (socketError) {
        console.error(
          "CANCEL FOLLOW REQUEST SOCKET ERROR:",
          socketError?.message ||
          socketError
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Follow request cancelled",

        data: {
          requestId,
          userId: receiverId,
          followStatus: "none",
          isFollowing: false,
          isRequested: false,
        },
      });
    } catch (error) {
      console.error(
        "CANCEL FOLLOW REQUEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to cancel follow request",
      });
    }
  };

/* =========================
   GET USER PROFILE
========================= */

const getUserProfile = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeUserId(req.user);

    const normalizedUsername =
      String(
        req.params?.username || ""
      )
        .trim()
        .toLowerCase()
        .replace(/^@/, "");

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (!normalizedUsername) {
      return res.status(400).json({
        success: false,
        message:
          "Username is required",
      });
    }

    const user =
      await User.findOne({
        username:
          normalizedUsername,
      })
        .select(
          [
            "_id",
            "name",
            "username",
            "profilePic",
            "bio",
            "followers",
            "following",
            "blockedUsers",
            "isVerified",
            "createdAt",
            "privacySettings.privateAccount",
          ].join(" ")
        )
        .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const profileUserId =
      normalizeUserId(user._id);

    const isOwnProfile =
      currentUserId ===
      profileUserId;

    const currentUser =
      isOwnProfile
        ? user
        : await User.findById(
          currentUserId
        )
          .select(
            [
              "_id",
              "following",
              "followers",
              "blockedUsers",
            ].join(" ")
          )
          .lean();

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message:
          "Current user not found",
      });
    }

    const isFollowing =
      !isOwnProfile &&
      Array.isArray(
        currentUser.following
      ) &&
      currentUser.following.some(
        (userId) =>
          normalizeUserId(
            userId
          ) === profileUserId
      );

    const isFollowedBy =
      !isOwnProfile &&
      Array.isArray(
        user.following
      ) &&
      user.following.some(
        (userId) =>
          normalizeUserId(
            userId
          ) === currentUserId
      );

    const blockedByMe =
      !isOwnProfile &&
      Array.isArray(
        currentUser.blockedUsers
      ) &&
      currentUser.blockedUsers.some(
        (userId) =>
          normalizeUserId(
            userId
          ) === profileUserId
      );

    const blockedMe =
      !isOwnProfile &&
      Array.isArray(
        user.blockedUsers
      ) &&
      user.blockedUsers.some(
        (userId) =>
          normalizeUserId(
            userId
          ) === currentUserId
      );

    const isBlocked =
      blockedByMe ||
      blockedMe;

    let followRequest = null;

    if (
      !isOwnProfile &&
      !isFollowing &&
      !isBlocked
    ) {
      followRequest =
        await FollowRequest.findOne({
          sender:
            currentUserId,
          receiver:
            profileUserId,
          status: "pending",
        })
          .select(
            "_id status createdAt"
          )
          .lean();
    }

    const isRequested =
      Boolean(followRequest);

    const privateAccount =
      user
        ?.privacySettings
        ?.privateAccount === true;

    const canViewPrivateContent =
      isOwnProfile ||
      !privateAccount ||
      isFollowing;

    let followStatus = "none";

    if (isOwnProfile) {
      followStatus = "self";
    } else if (isBlocked) {
      followStatus = "blocked";
    } else if (isFollowing) {
      followStatus =
        "following";
    } else if (isRequested) {
      followStatus =
        "requested";
    } else if (isFollowedBy) {
      followStatus =
        "follow-back";
    }

    const followersCount =
      Array.isArray(
        user.followers
      )
        ? user.followers.length
        : 0;

    const followingCount =
      Array.isArray(
        user.following
      )
        ? user.following.length
        : 0;

    const postsCount =
      canViewPrivateContent
        ? await Post.countDocuments({
          user: profileUserId,
        })
        : 0;

    return res.status(200).json({
      success: true,

      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        username: user.username,
        profilePic:
          user.profilePic,
        bio: user.bio || "",
        isVerified:
          Boolean(
            user.isVerified
          ),
        createdAt:
          user.createdAt,

        privateAccount,
        canViewPrivateContent,

        followersCount,
        followingCount,
        postsCount,

        isOwnProfile,
        isFollowing,
        isFollowedBy,
        isRequested,

        followStatus,

        followRequestId:
          followRequest?._id ||
          null,

        blockedByMe,
        blockedMe,
        isBlocked,
      },
    });
  } catch (error) {
    console.error(
      "GET USER PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load user profile",
    });
  }
};

const searchUsers = async (req, res) => {
  try {
    const searchTerm = String(
      req.query.query || req.query.q || ""
    ).trim();

    if (!searchTerm) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    const escapedSearchTerm = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const filter = {
      $or: [
        {
          name: {
            $regex: escapedSearchTerm,
            $options: "i",
          },
        },
        {
          username: {
            $regex: escapedSearchTerm,
            $options: "i",
          },
        },
      ],
    };

    // Logged-in user ni search results nundi remove cheyyalante
    if (req.user?._id) {
      filter._id = {
        $ne: req.user._id,
      };
    }

    const users = await User.find(filter)
      .select(
        "name username profilePic bio"
      )
      .limit(30)
      .lean();

    const normalizedQuery = searchTerm
      .toLowerCase()
      .replace(/^@/, "");

    const getSearchScore = (user) => {
      const name = String(
        user?.name || ""
      ).toLowerCase();

      const username = String(
        user?.username || ""
      ).toLowerCase();

      if (username === normalizedQuery) return 1;
      if (name === normalizedQuery) return 2;
      if (username.startsWith(normalizedQuery)) return 3;
      if (name.startsWith(normalizedQuery)) return 4;
      if (username.includes(normalizedQuery)) return 5;
      if (name.includes(normalizedQuery)) return 6;

      return 100;
    };

    users.sort(
      (firstUser, secondUser) =>
        getSearchScore(firstUser) -
        getSearchScore(secondUser)
    );

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      "Search Users Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to search users",
    });
  }
};

const checkUsernameAvailability = async (
  req,
  res
) => {
  try {
    const { username } = req.query;

    // =========================
    // VALIDATE USERNAME
    // =========================
    const usernameCheck =
      validateUsername(username);

    if (!usernameCheck.valid) {
      return res.status(200).json({
        success: true,
        available: false,
        valid: false,
        message: usernameCheck.message,
      });
    }

    const cleanUsername =
      usernameCheck.username;

    // =========================
    // CHECK DATABASE
    // =========================
    const existingUser = await User.exists({
      username: cleanUsername,
    });

    if (existingUser) {
      return res.status(200).json({
        success: true,
        available: false,
        valid: true,
        username: cleanUsername,
        message: "Username is already taken",
      });
    }

    // =========================
    // AVAILABLE
    // =========================
    return res.status(200).json({
      success: true,
      available: true,
      valid: true,
      username: cleanUsername,
      message: "Username is available",
    });
  } catch (error) {
    console.error(
      "Username Availability Error:",
      error
    );

    return res.status(500).json({
      success: false,
      available: false,
      message:
        "Unable to check username availability",
    });
  }
};

/* =========================
   BLOCK USER
========================= */

const blockUser = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeUserId(
        req.user
      );

    const targetUserId =
      normalizeUserId(
        req.params?.userId
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !targetUserId ||
      !mongoose.isValidObjectId(
        targetUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    if (
      currentUserId ===
      targetUserId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot block yourself",
      });
    }

    const targetUser =
      await User.findById(
        targetUserId
      )
        .select(
          "_id blockedUsers"
        )
        .lean();

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const targetBlockedCurrent =
      Array.isArray(
        targetUser?.blockedUsers
      ) &&
      targetUser.blockedUsers.some(
        (userId) =>
          normalizeUserId(
            userId
          ) === currentUserId
      );


    await Promise.all([
      User.updateOne(
        {
          _id: currentUserId,
        },
        {
          $addToSet: {
            blockedUsers:
              targetUserId,
          },

          $pull: {
            following:
              targetUserId,
            followers:
              targetUserId,
          },
        }
      ),

      User.updateOne(
        {
          _id: targetUserId,
        },
        {
          $pull: {
            following:
              currentUserId,
            followers:
              currentUserId,
          },
        }
      ),

      FollowRequest.deleteMany({
        $or: [
          {
            sender:
              currentUserId,
            receiver:
              targetUserId,
          },
          {
            sender:
              targetUserId,
            receiver:
              currentUserId,
          },
        ],
      }),
    ]);

    emitBlockStatusUpdate(
      currentUserId,
      targetUserId,

      {
        userId:
          targetUserId,

        blockedByMe: true,

        blockedMe:
          targetBlockedCurrent,

        isBlocked: true,
      },

      {
        userId:
          currentUserId,

        blockedByMe:
          targetBlockedCurrent,

        blockedMe: true,

        isBlocked: true,
      }
    );

    return res.status(200).json({
      success: true,

      message:
        "User blocked successfully",

      data: {
        userId:
          targetUserId,

        blockedByMe: true,

        blockedMe:
          targetBlockedCurrent,

        isBlocked: true,
      },
    });

  } catch (error) {
    console.error(
      "BLOCK USER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to block user",
    });
  }
};


/* =========================
   UNBLOCK USER
========================= */

const unblockUser = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeUserId(
        req.user
      );

    const targetUserId =
      normalizeUserId(
        req.params?.userId
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !targetUserId ||
      !mongoose.isValidObjectId(
        targetUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    if (
      currentUserId ===
      targetUserId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user",
      });
    }

    const result =
      await User.updateOne(
        {
          _id: currentUserId,
        },
        {
          $pull: {
            blockedUsers:
              targetUserId,
          },
        }
      );

    if (
      result.matchedCount === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const targetUser =
      await User.findById(
        targetUserId
      )
        .select("blockedUsers")
        .lean();

    const blockedMe =
      Array.isArray(
        targetUser?.blockedUsers
      ) &&
      targetUser.blockedUsers.some(
        (userId) =>
          normalizeUserId(
            userId
          ) === currentUserId
      );

    emitBlockStatusUpdate(
      currentUserId,
      targetUserId,

      {
        userId:
          targetUserId,

        blockedByMe: false,
        blockedMe,

        isBlocked:
          blockedMe,
      },

      {
        userId:
          currentUserId,

        blockedByMe:
          blockedMe,

        blockedMe: false,

        isBlocked:
          blockedMe,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "User unblocked successfully",

      data: {
        userId:
          targetUserId,

        blockedByMe: false,
        blockedMe,

        isBlocked:
          blockedMe,
      },
    });
  } catch (error) {
    console.error(
      "UNBLOCK USER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to unblock user",
    });
  }
};


/* =========================
   GET BLOCK STATUS
========================= */

const getBlockStatus = async (
  req,
  res
) => {
  try {
    const currentUserId =
      normalizeUserId(
        req.user
      );

    const targetUserId =
      normalizeUserId(
        req.params?.userId
      );

    if (
      !currentUserId ||
      !mongoose.isValidObjectId(
        currentUserId
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !targetUserId ||
      !mongoose.isValidObjectId(
        targetUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    if (
      currentUserId ===
      targetUserId
    ) {
      return res.status(200).json({
        success: true,

        data: {
          userId:
            targetUserId,

          blockedByMe: false,
          blockedMe: false,
          isBlocked: false,
        },
      });
    }

    const [
      currentUser,
      targetUser,
    ] = await Promise.all([
      User.findById(
        currentUserId
      )
        .select("blockedUsers")
        .lean(),

      User.findById(
        targetUserId
      )
        .select(
          "_id blockedUsers"
        )
        .lean(),
    ]);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const blockedByMe =
      Array.isArray(
        currentUser?.blockedUsers
      ) &&
      currentUser.blockedUsers.some(
        (userId) =>
          normalizeUserId(
            userId
          ) === targetUserId
      );

    const blockedMe =
      Array.isArray(
        targetUser?.blockedUsers
      ) &&
      targetUser.blockedUsers.some(
        (userId) =>
          normalizeUserId(
            userId
          ) === currentUserId
      );

    return res.status(200).json({
      success: true,

      data: {
        userId:
          targetUserId,

        blockedByMe,
        blockedMe,

        isBlocked:
          blockedByMe ||
          blockedMe,
      },
    });
  } catch (error) {
    console.error(
      "GET BLOCK STATUS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to get block status",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
  googleLogin,

  getProfile,
  getPrivacySettings,
  updatePrivacySettings,
  updateProfile,
  uploadProfilePicture,
  uploadCoverPhoto,

  followUser,
  unfollowUser,
  getReceivedFollowRequests,
  getSentFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
  cancelFollowRequest,

  getUserProfile,
  searchUsers,
  checkUsernameAvailability,
  setPassword,
  changePassword,
  blockUser,
  unblockUser,
  getBlockStatus,
};
const crypto = require("crypto");

const User = require("../models/User");
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

const getProfile = async (req, res) => {
  try {
    // =========================
    // GET ACTUAL POSTS COUNT
    // =========================
    const postsCount =
      await Post.countDocuments({
        user: req.user._id,
      });

    // =========================
    // SAFE USER OBJECT
    // =========================
    const userObject =
      typeof req.user.toObject === "function"
        ? req.user.toObject()
        : { ...req.user };

    // Never expose sensitive auth fields
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

    // =========================
    // RESPONSE
    // =========================
    return res.status(200).json({
      success: true,

      user: {
        ...userObject,

        // Keep frontend ID shape consistent
        id:
          userObject.id ||
          userObject._id,

        postsCount,
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

const followUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    if (user.following.includes(targetUser._id)) {
      return res.status(400).json({
        success: false,
        message: "Already following",
      });
    }

    user.following.push(targetUser._id);
    targetUser.followers.push(user._id);

    await user.save();
    await targetUser.save();

    await Notification.create({
      sender: req.user._id,
      receiver: targetUser._id,
      type: "follow",
    });

    res.json({
      success: true,
      message: "User followed successfully",
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.following = user.following.filter(
      (id) => id.toString() !== targetUser._id.toString()
    );

    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== user._id.toString()
    );

    await user.save();
    await targetUser.save();

    res.json({
      success: true,
      message: "User unfollowed successfully",
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.query || "";

    const users = await User.find({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { username: { $regex: keyword, $options: "i" } },
      ],
    })
      .select("-password")
      .limit(20);

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
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
  updateProfile,
  uploadProfilePicture,
  uploadCoverPhoto,
  followUser,
  unfollowUser,
  getUserProfile,
  searchUsers,
  checkUsernameAvailability,
  setPassword,
};
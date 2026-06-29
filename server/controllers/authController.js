const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SibApiV3Sdk = require("sib-api-v3-sdk");

// Brevo API Setup
const client = SibApiV3Sdk.ApiClient.instance;

const apiKey = client.authentications["api-key"];

apiKey.apiKey = process.env.BREVO_API_KEY;

const transEmailApi =
  new SibApiV3Sdk.TransactionalEmailsApi();

const generateOTP = () => {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
};

const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const username = email
      .split("@")[0]
      .toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    // Existing user check
    if (existingUser) {

      // Already verified account
      if (existingUser.isVerified) {
        return res.status(400).json({
          message: "User already exists. Please login",
        });
      }

      // Generate new OTP
      const otp = generateOTP();

      const hashedOtp = await bcrypt.hash(
        otp,
        10
      );

      existingUser.otp = hashedOtp;

      existingUser.otpExpiry = new Date(
        Date.now() + 5 * 60 * 1000
      );

      await existingUser.save();

      // Send OTP email
      const emailData =
        new SibApiV3Sdk.SendSmtpEmail();

      emailData.subject =
        "PingMe Email Verification 🔐";

      emailData.htmlContent = `
        <div style="font-family: Arial">
          <h2>Welcome back to PingMe 👋</h2>

          <p>Hello ${existingUser.name},</p>

          <p>Your new OTP is:</p>

          <h1 style="
            background:#2563eb;
            color:white;
            padding:10px;
            border-radius:8px;
            width:150px;
            text-align:center;
          ">
            ${otp}
          </h1>

          <p>This OTP expires in 5 minutes.</p>

          <strong>Team PingMe ❤️</strong>
        </div>
      `;

      emailData.sender = {
        name: "PingMe",
        email: "kasireddymanikantha@gmail.com",
      };

      emailData.to = [
        {
          email: existingUser.email,
          name: existingUser.name,
        },
      ];

      await transEmailApi.sendTransacEmail(
        emailData
      );

      return res.status(200).json({
        message:
          "New OTP sent. Please verify your account 📧",
        email: existingUser.email,
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(
      password,
      salt
    );

    // Generate OTP
    const otp = generateOTP();

    const hashedOtp = await bcrypt.hash(
      otp,
      10
    );

    const otpExpiry = new Date(
      Date.now() + 5 * 60 * 1000
    );

    // Create user
    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      otp: hashedOtp,
      otpExpiry,
    });

    // Send OTP email
    const emailData =
      new SibApiV3Sdk.SendSmtpEmail();

    emailData.subject =
      "PingMe Email Verification 🔐";

    emailData.htmlContent = `
      <div style="font-family: Arial">
        <h2>Welcome to PingMe 👋</h2>

        <p>Hello ${name},</p>

        <p>Your OTP is:</p>

        <h1 style="
          background:#2563eb;
          color:white;
          padding:10px;
          border-radius:8px;
          width:150px;
          text-align:center;
        ">
          ${otp}
        </h1>

        <p>
          This OTP expires in 5 minutes.
        </p>

        <strong>
          Team PingMe ❤️
        </strong>
      </div>
    `;

    emailData.sender = {
      name: "PingMe",
      email: "kasireddymanikantha@gmail.com",
    };

    emailData.to = [
      {
        email: email,
        name: name,
      },
    ];

    try {
      await transEmailApi.sendTransacEmail(
        emailData
      );

    } catch (error) {

      // Remove user if email failed
      await user.deleteOne();

      throw error;
    }

    res.status(201).json({
      message:
        "OTP sent to your email. Please verify your account 📧",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
      },
    });

  } catch (error) {

    console.log(
      "REGISTER ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};


const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email,
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
      },
    });

  } catch (error) {
    console.log(
      "LOGIN ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    // Get user with OTP fields
    const user = await User.findOne({
      email,
    }).select("+otp +otpExpiry");

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or OTP",
      });
    }

    // Already verified
    if (user.isVerified) {
      return res.status(400).json({
        message: "Account already verified",
      });
    }

    // Check OTP expiry
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    // Compare hashed OTP
    const isOtpValid = await bcrypt.compare(
      otp,
      user.otp
    );

    if (!isOtpValid) {
      return res.status(400).json({
        message: "Invalid email or OTP",
      });
    }

    // Verify account
    user.isVerified = true;

    // Clear OTP data
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    res.status(200).json({
      message: "Email verified successfully 🎉",
    });

  } catch (error) {
    console.log(
      "VERIFY OTP ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // Find user with OTP fields
    const user = await User.findOne({
      email,
    }).select("+otp +otpExpiry");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check already verified
    if (user.isVerified) {
      return res.status(400).json({
        message: "Account already verified",
      });
    }

    // Generate new OTP
    const otp = generateOTP();

    const hashedOtp = await bcrypt.hash(
      otp,
      10
    );

    user.otp = hashedOtp;

    user.otpExpiry = new Date(
      Date.now() + 5 * 60 * 1000
    );

    await user.save();

    // Create email
    // Brevo Email
    const emailData =
      new SibApiV3Sdk.SendSmtpEmail();

    emailData.subject =
      "PingMe New OTP Verification 🔄";

    emailData.htmlContent = `
<div style="font-family: Arial">
  <h2>PingMe OTP Resend 🔐</h2>

  <p>Hello ${user.name},</p>

  <p>Your new OTP is:</p>

  <h1 style="
    background:#2563eb;
    color:white;
    padding:10px;
    border-radius:8px;
    width:150px;
    text-align:center;
  ">
    ${otp}
  </h1>

  <p>This OTP expires in 5 minutes.</p>

  <strong>Team PingMe ❤️</strong>
</div>
`;

    emailData.sender = {
      name: "PingMe",
      email: "kasireddymanikantha@gmail.com",
    };

    emailData.to = [
      {
        email: user.email,
        name: user.name,
      },
    ];

    await transEmailApi.sendTransacEmail(
      emailData
    );

    res.status(200).json({
      message: "New OTP sent successfully 📧",
    });

  } catch (error) {
    console.log(
      "RESEND OTP ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email })
      .select("+otp +otpExpiry");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const otp = generateOTP();

    const hashedOtp = await bcrypt.hash(
      otp,
      10
    );

    user.otp = hashedOtp;

    user.otpExpiry = new Date(
      Date.now() + 5 * 60 * 1000
    );

    await user.save();

    const emailData =
      new SibApiV3Sdk.SendSmtpEmail();

    emailData.subject =
      "PingMe Password Reset OTP 🔐";

    emailData.htmlContent = `
      <div style="font-family:Arial">
        <h2>Password Reset</h2>

        <p>Hello ${user.name},</p>

        <p>Your OTP is:</p>

        <h1>${otp}</h1>

        <p>OTP valid for 5 minutes.</p>

      </div>
    `;

    emailData.sender = {
      name: "PingMe",
      email: "kasireddymanikantha@gmail.com",
    };

    emailData.to = [
      {
        email: user.email,
        name: user.name,
      },
    ];

    await transEmailApi.sendTransacEmail(
      emailData
    );

    res.status(200).json({
      message: "OTP sent successfully",
    });

  } catch (error) {

    console.log(
      "FORGOT PASSWORD ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });

  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const user = await User.findOne({ email })
      .select("+otp +otpExpiry +password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    const isOtpValid = await bcrypt.compare(
      otp,
      user.otp
    );

    if (!isOtpValid) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(
      password,
      salt
    );

    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    res.status(200).json({
      message: "Password updated successfully 🎉",
    });

  } catch (error) {

    console.log(
      "RESET PASSWORD ERROR:",
      error
    );

    res.status(500).json({
      message: "Something went wrong",
    });

  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      sub,
      email,
      name,
      picture,
      email_verified,
    } = payload;

    if (!email_verified) {
      return res.status(400).json({
        message: "Google email not verified",
      });
    }

    let user = await User.findOne({ email });

    if (user) {

      if (user.provider === "local") {
        user.provider = "google";
      }

      if (!user.googleId) {
        user.googleId = sub;
      }

      if (!user.profilePic && picture) {
        user.profilePic = picture;
      }

      user.isVerified = true;

      await user.save();
    }

    // New Google user create
    if (!user) {


      const baseUsername = email
        .split("@")[0]
        .toLowerCase();

      let username = baseUsername;

      let count = 1;

      while (await User.findOne({ username })) {
        username = `${baseUsername}${count++}`;
      }

      user = await User.create({
        name,
        email,
        username,
        profilePic: picture,
        provider: "google",
        googleId: sub,
        isVerified: true,
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Google Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
      },
    });

  } catch (error) {

    console.log(
      "GOOGLE LOGIN ERROR:",
      error
    );

    res.status(500).json({
      message: "Google Login Failed",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  googleLogin,
};
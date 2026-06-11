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

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(
      password,
      salt
    );

    const otp = generateOTP();

    const hashedOtp = await bcrypt.hash(otp, 10);

    const otpExpiry = new Date(
      Date.now() + 5 * 60 * 1000
    );

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      otp: hashedOtp,
      otpExpiry,
    });

    // Brevo Email
    const emailData = new SibApiV3Sdk.SendSmtpEmail();

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

    // Send OTP using Brevo API
    try {
      await transEmailApi.sendTransacEmail(emailData);
    } catch (error) {
      await user.deleteOne();
      throw error;
    }

    res.status(201).json({
      message:
        "OTP sent to your email. Please verify your account 📧",
      user: {
        id: user._id,
        name: user.name,
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


module.exports = {
  registerUser,
  loginUser,
  verifyOTP,
};
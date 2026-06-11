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

console.log(
  "BREVO KEY EXISTS:",
  !!process.env.BREVO_API_KEY
);


const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

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

    const otpExpiry = new Date(
      Date.now() + 5 * 60 * 1000
    );

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
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
    await transEmailApi.sendTransacEmail(emailData);

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
      message: error.message,
    });
  }
};


const loginUser = async (req, res) => {
  try {
    console.log("LOGIN REQUEST:", req.body);

    const { email, password } = req.body;

    const user = await User.findOne({
      email,
    });

    console.log(
      "USER FOUND:",
      user ? "YES" : "NO"
    );

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
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
      message: error.message,
    });
  }
};


module.exports = {
  registerUser,
  loginUser,
};
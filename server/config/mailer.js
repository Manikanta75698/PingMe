const nodemailer = require("nodemailer");

// Support both naming conventions (EMAIL_* or SMTP_*)
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "").replace(/\s+/g, "");
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpFrom = process.env.SMTP_FROM || `"PingMe" <${smtpUser}>`;

const hasSmtpConfig = Boolean(smtpUser && smtpPass);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  })
  : null;

const verifyMailer = async () => {
  if (!transporter) {
    console.warn("⚠️ SMTP configuration missing. Email service disabled.");
    return false;
  }

  try {
    await transporter.verify();
    console.log("✅ SMTP mail server connected successfully");
    return true;
  } catch (error) {
    console.error("❌ SMTP Verification Error:", error.message);
    return false;
  }
};

module.exports = {
  transporter,
  verifyMailer,
  hasSmtpConfig,
};
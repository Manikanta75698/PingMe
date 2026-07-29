const nodemailer = require("nodemailer");

const requiredVariables = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(
      `${variable} is missing in environment variables`
    );
  }
}

const smtpPort = Number(
  process.env.SMTP_PORT
);

if (!Number.isInteger(smtpPort)) {
  throw new Error(
    "SMTP_PORT must be a valid number"
  );
}

const transporter =
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure:
      process.env.SMTP_SECURE ===
      "true",

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },

    pool: true,
    maxConnections: 3,
    maxMessages: 50,

    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });

const verifyMailer = async () => {
  await transporter.verify();

  console.log(
    "✅ SMTP mail server connected"
  );
};

module.exports = {
  transporter,
  verifyMailer,
};
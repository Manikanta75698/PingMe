const nodemailer = require("nodemailer");

const smtpPort = Number(
  process.env.SMTP_PORT || 587
);

const hasSmtpConfig =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS) &&
  Boolean(process.env.SMTP_FROM);

const transporter =
  hasSmtpConfig
    ? nodemailer.createTransport({
      host:
        process.env.SMTP_HOST,

      port: smtpPort,

      secure:
        process.env.SMTP_SECURE ===
        "true",

      auth: {
        user:
          process.env.SMTP_USER,

        pass:
          process.env.SMTP_PASS,
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
    console.warn(
      "⚠️ SMTP configuration missing. Email service disabled."
    );

    return false;
  }

  await transporter.verify();

  console.log(
    "✅ SMTP mail server connected"
  );

  return true;
};

module.exports = {
  transporter,
  verifyMailer,
  hasSmtpConfig,
};
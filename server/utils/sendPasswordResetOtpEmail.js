const resend = require("../config/resend");

const sendPasswordResetOtpEmail = async ({
  email,
  name,
  otp,
}) => {
  if (!email || !otp) {
    throw new Error(
      "Email and reset OTP are required"
    );
  }

  const sender =
    process.env.RESEND_FROM_EMAIL ||
    "PingMe <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from: sender,
    to: [email],
    subject: "Reset your PingMe password",

    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background: #f4f7fb;
            font-family: Arial, Helvetica, sans-serif;
          "
        >
          <div
            style="
              width: 100%;
              padding: 40px 16px;
              box-sizing: border-box;
            "
          >
            <div
              style="
                max-width: 520px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow:
                  0 10px 30px
                  rgba(0, 0, 0, 0.08);
              "
            >
              <div
                style="
                  padding: 28px 24px;
                  background: #2563eb;
                  text-align: center;
                "
              >
                <h1
                  style="
                    margin: 0;
                    color: #ffffff;
                    font-size: 28px;
                  "
                >
                  PingMe
                </h1>
              </div>

              <div
                style="
                  padding: 32px 24px;
                  text-align: center;
                "
              >
                <h2
                  style="
                    margin: 0 0 12px;
                    color: #111827;
                    font-size: 22px;
                  "
                >
                  Reset your password
                </h2>

                <p
                  style="
                    margin: 0 0 24px;
                    color: #6b7280;
                    font-size: 15px;
                    line-height: 1.6;
                  "
                >
                  Hi ${name || "there"},
                  we received a request to reset
                  your PingMe password.
                </p>

                <p
                  style="
                    margin: 0 0 20px;
                    color: #6b7280;
                    font-size: 14px;
                    line-height: 1.6;
                  "
                >
                  Use this verification code:
                </p>

                <div
                  style="
                    display: inline-block;
                    padding: 16px 24px;
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 12px;
                    color: #1d4ed8;
                    font-size: 32px;
                    font-weight: 700;
                    letter-spacing: 8px;
                  "
                >
                  ${otp}
                </div>

                <p
                  style="
                    margin: 24px 0 0;
                    color: #6b7280;
                    font-size: 14px;
                    line-height: 1.6;
                  "
                >
                  This code expires in 10 minutes.
                  Do not share it with anyone.
                </p>
              </div>

              <div
                style="
                  padding: 18px 24px;
                  background: #f9fafb;
                  text-align: center;
                  color: #9ca3af;
                  font-size: 12px;
                  line-height: 1.5;
                "
              >
                If you did not request a password reset,
                you can safely ignore this email.
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error(
      "Password Reset Email Error:",
      error
    );

    throw new Error(
      error.message ||
        "Failed to send password reset email"
    );
  }

  return data;
};

module.exports = sendPasswordResetOtpEmail;
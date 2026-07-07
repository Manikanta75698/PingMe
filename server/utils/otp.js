const crypto = require("crypto");

// Generate secure 6-digit OTP
const generateOtp = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

// Hash OTP before saving to MongoDB
const hashOtp = (otp) => {
  return crypto
    .createHmac(
      "sha256",
      process.env.OTP_SECRET
    )
    .update(otp)
    .digest("hex");
};

// Compare entered OTP with stored hash
const compareOtp = (otp, hashedOtp) => {
  if (!otp || !hashedOtp) {
    return false;
  }

  const enteredOtpHash = hashOtp(otp);

  const enteredBuffer = Buffer.from(
    enteredOtpHash,
    "hex"
  );

  const storedBuffer = Buffer.from(
    hashedOtp,
    "hex"
  );

  if (enteredBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    enteredBuffer,
    storedBuffer
  );
};

module.exports = {
  generateOtp,
  hashOtp,
  compareOtp,
};
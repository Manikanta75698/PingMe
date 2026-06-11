const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  verifyOTP,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-otp", verifyOTP);

router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Protected route accessed successfully",
    user: req.user,
  });
});

module.exports = router;
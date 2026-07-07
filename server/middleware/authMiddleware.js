const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization Header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }


    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }


    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    // Find User
    const user = await User.findById(decoded.id).select(
      "-password -otp -__v"
    );


    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Auth Error:", error);

    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  protect,
};
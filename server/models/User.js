const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
   name: {
  type: String,
  required: true,
  trim: true,
  minlength: 3,
  maxlength: 30,
},

   email: {
  type: String,
  required: true,
  unique: true,
  lowercase: true,
  trim: true,
  match: [
    /^\S+@\S+\.\S+$/,
    "Please enter a valid email",
  ],
},

    password: {
  type: String,
  required: true,
  select: false,
},

   profilePic: {
  type: String,
  default: null,
},

    isVerified: {
      type: Boolean,
      default: false,
    },

   otp: {
  type: String,
  default: null,
  select: false,
},

    otpExpiry: {
  type: Date,
  select: false,
},
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
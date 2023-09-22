const dotenv = require("dotenv");
dotenv.config({ path: "../config.env" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxLength: [30, "Name cannot exceeds 30 characters"],
      minLength: [3, "Name should have at least 3 characters"],
    },
    email: {
      type: String,
      unique: true,
      required: true,
      validate: [validator.isEmail, "Please enter a valid email"],
    },
    contact: {
      type: String,
    },
    referringAgent: {
      type: String,
    },
    password: {
      type: String,
      min: [8, "Password must be atleast 8 character"],
      select: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isCaseWorker: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

//Password hashing

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Generating token
userSchema.methods.generateAuthToken = async function () {
  try {
    let token = jwt.sign({ _id: this._id }, process.env.SECRET_KEY,{
      expiresIn: process.env.JWT_EXPIRE
    });
    this.tokens = this.tokens.concat({ token: token });
    await this.save();
    return token;
  } catch (error) {
    console.log(error);
  }
};

const UserModel = mongoose.model("Users", userSchema);
module.exports = UserModel;

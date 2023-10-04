const mongoose = require("mongoose");
const validator = require("validator");

const companySchema = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxLength: [30, "Name cannot exceeds 30 characters"],
      minLength: [3, "Name should have at least 3 characters"],
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      validate: [validator.isEmail, "Please enter a valid email"],
    },
    telephone: {
      type: String,
      required: true,
    },
    groupId: {
      type: String,
      required: true,
    },
    confirmIndustry: {
      type: String,
      required: true,
    },
    isSponsorLicense: {
      type: Boolean,
      required: true,
    },
    engagementLetter: {
      type: String,
      required: true,
    },
    terms: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const CompanyModel = mongoose.model("Company", companySchema);
module.exports = CompanyModel;

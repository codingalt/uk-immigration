const mongoose = require("mongoose");
const validator = require("validator");

const caseWorkerSchema = mongoose.Schema(
  {
    workerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxLength: [30, "First Name cannot exceeds 30 characters"],
      minLength: [3, "First Name should have at least 3 characters"],
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxLength: [30, "Last Name cannot exceeds 30 characters"],
      minLength: [3, "Last Name should have at least 3 characters"],
    },
    country: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    languages: {
      type: Array,
      required: true,
    },
  },
  { timestamps: true }
);

caseWorkerSchema.index({ "userId": 1 }, { background: true });

const CaseWorkerModel = mongoose.model("CaseWorker", caseWorkerSchema);
module.exports = CaseWorkerModel;

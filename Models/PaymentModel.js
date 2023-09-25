const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
    },
    applicationId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    last4: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
    },
    expMonth: Number,
    expYear: Number,
  },
  { timestamps: true }
);

const PaymentModel = mongoose.model("Payment", paymentSchema);
module.exports = PaymentModel;

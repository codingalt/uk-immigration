const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
  {
    transactionId: {
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
    cardType: {
      type: String,
      required: true,
    },
    cardLastDigits: {
      type: Number,
      required: true,
    },
    tax: {
      type: String,
    },
    discount: {
      type: String,
    },
  },
  { timestamps: true }
);

const PaymentModel = mongoose.model("Payment", paymentSchema);
module.exports = PaymentModel;

const express = require("express");
const UserModel = require("../Models/UserModel");
const ApplicationModel = require("../Models/ApplicationModel");
const PaymentModel = require("../Models/PaymentModel");
const CompanyClientModel = require("../Models/CompanyClientModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const uuid = require("uuid").v4;

const payWithCard = async (req, res) => {
  const { token, applicationId } = req.body;
  let amount = 0;
  try {

    // Check Whether Admin/Case Worker has requested client to submit phase 3 
  const isRequested = await ApplicationModel.findById(applicationId);

  if(isRequested.requestedPhase < 3){
    return res.status(400).json({message: "You can't perform this action right now. You can pay only when admin requests you to submit phase 3 data", success: false})
  }

  amount = parseInt(isRequested.phase3.cost);

    const customer = await stripe.customers.create({
      email: token.email,
      source: token?.id,
    });

    const idempotencyKey = uuid();

    const charge = await stripe.charges.create(
      {
        amount: amount * 100,
        currency: "usd",
        customer: customer.id,
        receipt_email: token.email,
      },
      {
        idempotencyKey,
      }
    );

  const type = charge.payment_method_details.type;
  const brand = charge.payment_method_details.card.brand;
  const expMonth = charge.payment_method_details.card.exp_month;
  const expYear = charge.payment_method_details.card.exp_year;
  const last4 = charge.payment_method_details.card.last4;
  const currency = charge.currency;
  const email = charge.receipt_email;
  const transactionId = charge.id;

  // Save to Payment Model 
  const payment = await new PaymentModel({
    userId: req.userId.toString(),
    applicationId: applicationId,
    transactionId,
    amount,
    currency,
    type,
    last4,
    email,
    expMonth,
    expYear,
    brand
  }).save();

  // console.log(type, cardBrand, last4, expMonth, expYear, amount, email,currency);

   await ApplicationModel.findByIdAndUpdate(
     applicationId,
     {
       $set: {
         "phase3.onlinePaymentEvidence": charge.receipt_url,
         "phase3.isOnlinePayment": true,
         phaseSubmittedByClient: 3,
         phase: 3,
       },
     },
     { new: true, useFindAndModify: false }
   );

    res.status(200).json({
      message: "Congrats! Payment Successfull.",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

const payWithCardCompanyClient = async (req, res) => {
  const {  applicationId } = req.body;
  let amount = 0;
  try {

    const token = await stripe.tokens.create({
      card: {
        number: "4242424242424242",
        exp_month: 10,
        exp_year: 2024,
        cvc: "314",
      },
    });
    // Check Whether Admin/Case Worker has requested client to submit phase 3
    const isRequested = await CompanyClientModel.findById(applicationId);

    if (isRequested.requestedPhase < 3) {
      return res
        .status(400)
        .json({
          message:
            "You can't perform this action right now. You can pay only when admin requests you to submit phase 3 data",
          success: false,
        });
    }

    amount = parseInt(isRequested.phase3.cost);

    const customer = await stripe.customers.create({
      email: token.email,
      source: token?.id,
    });

    const idempotencyKey = uuid();

    const charge = await stripe.charges.create(
      {
        amount: amount * 100,
        currency: "usd",
        customer: customer.id,
        receipt_email: token.email,
      },
      {
        idempotencyKey,
      }
    );

    const type = charge.payment_method_details.type;
    const brand = charge.payment_method_details.card.brand;
    const expMonth = charge.payment_method_details.card.exp_month;
    const expYear = charge.payment_method_details.card.exp_year;
    const last4 = charge.payment_method_details.card.last4;
    const currency = charge.currency;
    const email = charge.receipt_email;
    const transactionId = charge.id;

    // Save to Payment Model
    const payment = await new PaymentModel({
      userId: req.userId.toString(),
      applicationId: applicationId,
      transactionId,
      amount,
      currency,
      type,
      last4,
      email,
      expMonth,
      expYear,
      brand,
    }).save();

    // console.log(type, cardBrand, last4, expMonth, expYear, amount, email,currency);

    await CompanyClientModel.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          "phase3.onlinePaymentEvidence": charge.receipt_url,
          "phase3.isOnlinePayment": true,
          "phase3.isPaid": true,
          phaseSubmittedByClient: 3,
          phase: 3,
        },
      },
      { new: true, useFindAndModify: false }
    );

    res.status(200).json({
      message: "Congrats! Payment Successfull.",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

module.exports = { payWithCard, payWithCardCompanyClient };


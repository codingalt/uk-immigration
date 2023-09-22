const express = require("express");
const UserModel = require("../Models/UserModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const uuid = require("uuid").v4;

const payWithCard = async (req, res) => {
  const { token } = req.body;
  const type = req.body.token.card?.object;
  const cardBrand = req.body.token.card?.brand;
  const last4 = req.body.token.card?.last4;
  const email = req.body.token?.email;
  const expMonth = req.body.token?.card?.exp_month
  const expYear = req.body.token?.card.exp_year;
  // const amount = req.body.amount;
  let amount = 10;
  console.log(type, cardBrand, last4, expMonth, expYear, amount, email);
  try {
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

    console.log(charge);
  const currency = charge.currency;

    res.status(200).json({
      message: "Congrats! Payment Successfull.",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
};

module.exports = { payWithCard };


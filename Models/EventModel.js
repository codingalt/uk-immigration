const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  day: { type: Number, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  events: [
    {
      title: { type: String, required: true },
      time: { type: String, required: true },
    },
  ],
});

const EventModel = mongoose.model("Event", eventSchema);

module.exports = EventModel;

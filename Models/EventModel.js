const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  day: { type: Number, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  events: [
    {
      title: { type: String, required: true },
      time: { type: Date, required: true },
    },
  ],
});

const EventModel = mongoose.model("Event", eventSchema);

module.exports = EventModel;

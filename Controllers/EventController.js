const EventModel = require("../Models/EventModel");

const addEvent = async(req,res)=>{
    try {
        console.log(req.body);
        req.body.userId = req.userId.toString();
        const event = await new EventModel(req.body).save();
        if(event){
            res.status(200).json({event, success: true});
        }
    } catch (err) {
        res.status(500).json({
          message: err.message,
          success: false,
        });
        console.log(err);
    }
}

const getEventByUserId = async (req, res) => {
  try {
    const events = await EventModel.find({userId: req.userId.toString()});
    res.status(200).json({ events, success: true });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      success: false,
    });
    console.log(err);
  }
};

const getEvent = async (req, res) => {
  try {
    const events = await EventModel.find({});
    res.status(200).json({events,success: true});
  } catch (err) {
    res.status(500).json({
      message: err.message,
      success: false,
    });
    console.log(err);
  }
};

module.exports = { addEvent, getEvent, getEventByUserId };
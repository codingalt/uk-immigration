const jwt = require("jsonwebtoken");
const UserModel = require("../../Models/UserModel");

const isAdmin = async(req,res, next)=>{
    try {
        const user = await UserModel.findById(req.userId.toString());
        if(!user.isAdmin){
            throw new Error("Action Forbidden");
        }

        next();
        
    } catch (err) {
        res.status(401).send({
          message: "Action Forbidden.",
          success: false,
        });
        console.log(err);
    }
}

const isCaseWorker = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId.toString());
    if (!user.isCaseWorker) {
      throw new Error("Action Forbidden");
    }

    next();
  } catch (err) {
    res.status(401).send({
      message: "Action Forbidden.",
      success: false,
    });
    console.log(err);
  }
};

module.exports = {isAdmin, isCaseWorker}
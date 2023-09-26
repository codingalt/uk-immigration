const jwt = require("jsonwebtoken");
const UserModel = require("../../Models/UserModel");
const ApplicationModel = require("../../Models/ApplicationModel");

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

const isAdminOrCaseWorker = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId.toString());
    if (user.isAdmin || user.isCaseWorker) {
      next();
    }else{
      throw new Error("Action Forbidden");
    }
   
  } catch (err) {
    res.status(401).send({
      message: "Action Forbidden.",
      success: false,
    });
    console.log(err);
  }
};

const isAssignedCaseWorker = async (req, res, next) => {
  try {
    const {applicationId} = req.params;
    const application = await ApplicationModel.findById(applicationId);

    if (application.isCaseWorkerHandling) {
      if(application.caseWorkerId === req.userId.toString()){
        next();
      }else{
        throw new Error("Action Forbidden! This Application is handling by another Case Worker");
      }
    } else{

        const isAdmin = await UserModel.findById(req.userId.toString());

        if(isAdmin.isAdmin) {
          next();
        }else{
        throw new Error("Action Forbidden! This Application hasn't been assigned to any case worker.");
        }

    }
  } catch (err) {
    res.status(401).send({
      message: "Action Forbidden.",
      success: false,
    });
    console.log(err);
  }
};

module.exports = {
  isAdmin,
  isCaseWorker,
  isAdminOrCaseWorker,
  isAssignedCaseWorker,
};
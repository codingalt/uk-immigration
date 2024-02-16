const jwt = require("jsonwebtoken");
const UserModel = require("../../Models/UserModel");
const ApplicationModel = require("../../Models/ApplicationModel");
const CompanyClientModel = require("../../Models/CompanyClientModel");

const isAdmin = async(req,res, next)=>{
    try {
        const user = await UserModel.findById(req.userId.toString());
        if(!user.isAdmin){
            // throw new Error("Action Forbidden");
            return res.status(400).json({message:"Action Forbidden",success: false})
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
      // throw new Error("Action Forbidden");
            return res
              .status(400)
              .json({ message: "Action Forbidden", success: false });

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
      // throw new Error("Action Forbidden");
            return res
              .status(400)
              .json({ message: "Action Forbidden", success: false });

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
    const applicationId  =
      req.params.applicationId || req.body.applicationId;
      
      if(!applicationId){
        return res.status(400).json({message:"Application Id cannot be empty", success: false});
      }

    const application = await ApplicationModel.findById(applicationId);

    if (application.isCaseWorkerHandling) {
      if(application.caseWorkerId === req.userId.toString()){
        next();
      }else{
 
        const isAdmin = await UserModel.findById(req.userId.toString());
       
        if(isAdmin.isAdmin) {
          next();
        }else{
          // throw new Error("Action Forbidden! This Application is handling by another Case Worker");
          return res
            .status(400)
            .json({
              message:
                "Action Forbidden! This Application is handling by another Case Worker",
              success: false,
            });
        }

      }
    } else{

        const isAdmin = await UserModel.findById(req.userId.toString());

        if(isAdmin.isAdmin) {
          next();
        }else{
          // throw new Error("Action Forbidden! This Application hasn't been assigned to any case worker.");
          return res
            .status(400)
            .json({
              message:
                "Action Forbidden! This Application hasn't been assigned to any case worker.",
              success: false,
            });
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

const isAssignedCompanyCaseWorker = async (req, res, next) => {
  try {
     const applicationId = req.params.applicationId || req.body.applicationId;
    const application = await CompanyClientModel.findById(applicationId);

    if (application.isCaseWorkerHandling) {
      if (application.caseWorkerId === req.userId.toString()) {
        next();
      } else {
        const isAdmin = await UserModel.findById(req.userId.toString());

        if (isAdmin.isAdmin) {
          next();
        } else {
          throw new Error(
            "Action Forbidden! This Application is handling by another Case Worker"
          );
        }
      }
    } else {
      const isAdmin = await UserModel.findById(req.userId.toString());

      if (isAdmin.isAdmin) {
        next();
      } else {
        throw new Error(
          "Action Forbidden! This Application hasn't been assigned to any case worker."
        );
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
  isAssignedCompanyCaseWorker,
};
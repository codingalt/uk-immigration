const CaseWorkerModel = require("../Models/CaseWorker");
const UserModel = require("../Models/UserModel");
const otpGenerator = require("otp-generator");

const createCaseWorker = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      contact,
      country,
      state,
      languages,
      password,
      confirmPassword,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !contact ||
      !country ||
      !state ||
      !languages ||
      !password ||
      !confirmPassword
    ) {
      return res
        .status(400)
        .json({
          message: "Please fill out all the fields properly.",
          success: false,
        });
    }

    const isAlreadyRegistered = await UserModel.findOne({ email });

    if (isAlreadyRegistered)
      return res
        .status(400)
        .json({
          message: "Case Worker is Already Registered with this email",
          success: false,
        });

    if (password != confirmPassword)
      return res
        .status(400)
        .json({ message: "Password do not match", success: false });

    // Generating WorkerId
    const workerId = otpGenerator.generate(6,{
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });

    const user = new UserModel({
      name: firstName + " " + lastName,
      email,
      password,
      contact,
      isCaseWorker: true,
    });
    await user.generateAuthToken();
    await user.save();

    const caseWorker = await new CaseWorkerModel({
      workerId,
      userId: user._id,
      firstName,
      lastName,
      country,
      state,
      languages,
    }).save();
    const caseWorkerProfile = { ...caseWorker._doc, isCaseWorker: true };
    res.status(200).json({ caseWorkerProfile, success: true });
  } catch (err) {
        res.status(500).json({ message: err.message, success: false });
  }
};

const getCaseWorker = async (req, res) => {
  try {
    const caseWorker = await CaseWorkerModel.aggregate([
      {
        $addFields: {
          convertedId: { $toObjectId: "$userId" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "convertedId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 0,
          country: 1,
          state: 1,
          workerId: 1,
          languages: 1,
          name: "$user.name",
          email: "$user.email",
          contact: "$user.contact",
        },
      },
    ]);
    res.status(200).json({ caseWorker, success: true });
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

// Search Filter CaseWorker 
const filterCaseWorker = async (req, res) => {
  try {
    const {filters} = req.body;
     const aggregationPipeline = [];

     if (filters.name) {
       aggregationPipeline.push({
         $match: { firstName: { $regex: new RegExp(filters.name, "i") } },
       });
     }

     if (filters.workerId) {
       aggregationPipeline.push({
         $match: { workerId: { $regex: new RegExp(filters.workerId, "i") } },
       });
     }

     if (filters.country) {
       aggregationPipeline.push({
         $match: { country: { $regex: new RegExp(filters.country, "i") } },
       });
     }

     if (filters.birthDate) {
       aggregationPipeline.push({
         $match: { birthDate: { $regex: new RegExp(filters.birthDate, "i") } },
       });
     }

     // Join with UserModel
     aggregationPipeline.push({
       $lookup: {
         from: "users", 
         localField: "userId",
         foreignField: "_id", 
         as: "user",
       },
     });

     aggregationPipeline.push({
       $project: {
         _id: 1,
         firstName: 1,
         lastName: 1,
         country: 1,
         state: 1,
         workerId: 1,
         languages: 1,
         email: { $arrayElemAt: ["$user.email", 0] },
         contact: { $arrayElemAt: ["$user.contact", 0] },
       },
     });

     const result = await CaseWorkerModel.aggregate(aggregationPipeline);

     if (!result || result.length === 0) {
       return res.status(404).json({ message: "No matching records found" });
     }

    res.status(200).json({ result, success: true });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = { createCaseWorker, getCaseWorker, filterCaseWorker };
const CompanyModel = require("../Models/CompanyModel");
const otpGenerator = require("otp-generator");

const createCompany = async(req,res)=>{
    try {

        const {
          name,
          address,
          fullName,
          email,
          telephone,
          confirmIndustry,
          isSponsorLicense,
        } = req.body;

        const files = req.files;
        const engagementLetter = `/Uploads/${files?.engagementLetter[0]?.filename}`;
        const terms = `/Uploads/${files?.terms[0]?.filename}`;

        if(!engagementLetter || !terms) {
            return res.status(404).json({message: "Please fill out all the fields properly.", success: false});
        }

        if(!name || !address || !fullName || !email || !telephone || !confirmIndustry || isSponsorLicense === undefined){
            return res.status(400).json({message: "Please Fill out all the required fields", success: false});
        }

        // Generating Group ID 
        const groupId = otpGenerator.generate(6, {
          digits: true,
          lowerCaseAlphabets: false,
          upperCaseAlphabets: false,
          specialChars: false,
        });

        const company = await new CompanyModel({name, address, fullName,email,telephone,groupId,confirmIndustry, isSponsorLicense,engagementLetter,terms}).save();
        res.status(200).json({company, success: true});
        
    } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    }
}

// Get Company Details By ID 
const getCompanyDetailsByID =async(req,res)=>{
    try {

        const {companyId} = req.params;

        const company = await CompanyModel.findById(companyId);
        res.status(200).json({company, success: true});
        
    } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    }
}

// Get All Company Details 
const getAllCompanies =async(req,res)=>{
    try {

        const company = await CompanyModel.find({});
        res.status(200).json({company, success: true});
        
    } catch (err) {
    res.status(500).json({ message: err.message, success: false });
    }
}

module.exports = { createCompany, getCompanyDetailsByID, getAllCompanies };
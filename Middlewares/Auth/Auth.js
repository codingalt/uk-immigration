const jwt = require("jsonwebtoken");
const UserModel = require("../../Models/UserModel");

const Authenticate = async (req, res, next) => {
  try {
    let token;
    const bearerToken = req.headers['authorization'];

    if (req.cookies.ukImmigrationJwtoken){
      token = req.cookies.ukImmigrationJwtoken
    }else if (typeof bearerToken !== "undefined"){
      const bearer = bearerToken.split(" ");
      token = bearer[1];
    }else{

      return res.status(401).send({
        message: "Unotherized User: Please login first",
        success: false,
      });

    }
      console.log("Auth token middlware", token);

    if (token) {

      const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
      const rootUser = await UserModel.findOne({
        _id: verifyToken._id,
        "tokens.token": token,
      });
      if (!rootUser) {
        throw new Error("User not found..");
      }
      const { ...others } = rootUser._doc;
      req.token = token;
      req.rootUser = { data: others, success: true };
      req.userId = rootUser._id;

      next();
    } else {
      return res.status(401).send({
        message: "Unotherized User: Please login first",
        success: false,
      });
    }
    //  end of bearer token if
  } catch (error) {
    res.status(401).send({
      message: "Unotherized User: Please login first",
      success: false,
    });
    console.log(error);
  }
};

module.exports = Authenticate;

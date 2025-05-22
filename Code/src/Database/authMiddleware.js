const jwt = require("jsonwebtoken");
const User = require("./User");

const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log("Decoded Token:", decoded); 
    const userId = decoded.userId; 

    if (!userId) {
      console.log("No userId found in token!");
      return res.status(401).json({ error: "Unauthorized: Invalid token structure" });
    }

    const user = await User.findById(userId).select("_id username");

    if (!user) {
      console.log("User not found in DB:", userId);
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

module.exports = { authenticateUser };

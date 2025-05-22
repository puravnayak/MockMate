const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./User");
require("dotenv").config();

const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
  
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      error: "Password must be at least 8 characters long and include at least one letter and one number." 
    });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("Username already exists:", username);
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed successfully");

    const newUser = new User({ username, password: hashedPassword, role });
    await newUser.save();
    console.log("User registered:", newUser);

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password, roomID } = req.body;

  if (!username || !password || !roomID) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid username or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid username or password" });

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role, roomID },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, user: { username: user.username, role: user.role, roomID } });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

const authenticateUser = (req, res, next) => {
  const authHeader = req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const token = authHeader.split(" ")[1]; 
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

const Question = require("./questions"); 

router.post("/logout", authenticateUser, async (req, res) => {
  try {
    console.log("Logout request received");

    if (!req.user || !req.user.username) {
      console.log("No user found in request");
      return res.status(401).json({ error: "Unauthorized: No user data found." });
    }

    const username = req.user.username;
    console.log(`Deleting questions created by: ${username}`);

    const deleteResult = await Question.deleteMany({ creator: username });
    console.log(`Questions deleted: ${deleteResult.deletedCount}`);

    res.json({ message: "Logged out successfully, and all your questions were deleted." });
  } catch (error) {
    console.error("Error deleting questions on logout:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

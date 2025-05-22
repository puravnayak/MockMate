const express = require("express");
const Question = require("./questions"); 
const { authenticateUser } = require("./authMiddleware"); 
const router = express.Router();

router.get("/", authenticateUser, async (req, res) => { 
  try {
    const { difficulty } = req.query;
    const questions = await Question.find(difficulty ? { difficulty } : {});  
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", authenticateUser, async (req, res) => {  
  try {
    const { title, description, difficulty } = req.body;

    if (!title || !description || !difficulty) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Unauthorized: User ID missing" });
    }

    const newQuestion = new Question({
      title,
      description,
      difficulty,
      creator: req.user.username, 
    });
    

    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);

    if (!question) {
      return res.status(404).json({ error: "Question not found!" });
    }

    if (question.creator !== req.user.username) {
      console.warn(`Unauthorized deletion attempt by ${req.user._id}`);
      return res.status(403).json({ error: "Unauthorized to delete this question!" });
    }

    await Question.findByIdAndDelete(id);
    res.status(200).json({ message: "Question deleted successfully!" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Server error!" });
  }
});


module.exports = router;

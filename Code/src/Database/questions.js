const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  creator: { type: String, required: true }, 
});

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;

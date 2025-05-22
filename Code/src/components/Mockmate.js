import React, { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "@monaco-editor/react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import "./styles.css";
import VideoCall from "./VideoCall.js";

const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = "aad02b83f7mshadbd4d9128e6db9p1108a1jsna6f3dff7d5bc";

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
};

const LANGUAGE_DEFAULTS = {
  javascript: "console.log('Hello World');",
  python: "print('Hello World')",
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "Hello World";\n    return 0;\n}',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
};

const createSubmission = async (languageId, sourceCode, stdin) => {
  try {
    const response = await fetch(`${JUDGE0_API_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: sourceCode,
        stdin: stdin,
        wait: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Submission error:", error);
    throw error;
  }
};

const getSubmissionStatus = async (token) => {
  try {
    const response = await fetch(
      `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`,
      {
        headers: {
          "X-RapidAPI-Key": JUDGE0_API_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Status check error:", error);
    throw error;
  }
};

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

const Mockmate = ({ role, socket, code, setCode, roomID, username, inputDisabled, setInputDisabled}) => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("javascript");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [userVideo, setUserVideo] = useState(true);
  const [userAudio, setUserAudio] = useState(true);
  const [interviewerVideo, setInterviewerVideo] = useState(true);
  const [interviewerAudio, setInterviewerAudio] = useState(true);
  const [isQuestionPopupOpen, setQuestionPopupOpen] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [questionTitles, setQuestionTitles] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(
    "No question selected"
  );
  const [newQuestionTitle, setNewQuestionTitle] = useState("");
  const [newQuestionDescription, setNewQuestionDescription] = useState("");
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState("Easy");
  const [isAddQuestionPopupOpen, setAddQuestionPopupOpen] = useState(false);
  const [isDeleteQuestionPopupOpen, setDeleteQuestionPopupOpen] =
    useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    socket.on("update-code-client", (msg) => {
      const newCode = msg.newCode;
      setCode(newCode);
      console.log("server sent code", newCode);
    });
    socket.on("language-change-toClient", (newLanguage) => {
      setLanguage(newLanguage);
      setCode(LANGUAGE_DEFAULTS[newLanguage]);
    });
    socket.on("runCode-toClient", () => {
      handleRunCode();
    });
    socket.on("question-selected-toClient", (question) => {
      console.log("recieved question: ", question);
      setCurrentQuestion(`${question.title}: ${question.description}`);
    });
    socket.on("send-input-client", ({ input }) => {
      setStdin(input);
    });
    socket.on("code-output-toClient", ({ output }) => {
      setOutput(output);
    });
    socket.on("disable-input-client", ()=>{setInputDisabled(!inputDisabled)});
    socket.on("enable-input-client", ()=>{
      setInputDisabled(false);
    });
    return () => {
      socket.off("update-code-client");
      socket.off("language-change-toClient");
      socket.off("runCode-toClient");
      socket.off("question-selected-toClient");
      socket.off("send-input-client");
      socket.off("code-output-toClient");
      socket.off("disable-input-client");
      socket.off("enable-input-client");
    };
  });

  useEffect(() => {
    if (socket && username && roomID) {
      socket.emit("join-user", { username, roomID, code: "" });
    }
  }, [socket, username, roomID]);

  const fetchQuestionsByDifficulty = async (difficulty) => {
    try {
      setSelectedDifficulty(difficulty);
      const response = await axios.get(
        `http://localhost:4000/questions?difficulty=${difficulty}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      console.log("Fetched Questions:", response.data);

      setQuestionTitles([...response.data]);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleResize = useCallback(
    debounce((entries) => {
      for (let entry of entries) {
        console.log("Resized element:", entry.target);
      }
    }, 100),
    []
  );

  useEffect(() => {
    const editorElement = editorRef.current;
    const observer = new ResizeObserver(handleResize);

    if (editorElement) {
      observer.observe(editorElement);
    }

    return () => {
      if (editorElement) {
        observer.unobserve(editorElement);
      }
      observer.disconnect();
    };
  }, [handleResize]);

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    setCode(LANGUAGE_DEFAULTS[newLanguage]);
    socket.emit("language-change-toServer", { roomID, newLanguage });
  };
  const handleRunCodeWrapper = () => {
    handleRunCode();
    socket.emit("runCode-toServer", roomID);
  };
  const handleRunCode = async () => {
    try {
      setIsRunning(true);
      setOutput("Running code...");
      const submission = await createSubmission(
        LANGUAGE_IDS[language],
        code,
        stdin
      );
      console.log("Submission created:", submission);
      if (!submission.token) {
        throw new Error("No submission token received");
      }
      let result;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        result = await getSubmissionStatus(submission.token);
        console.log("Status check result:", result);
        attempts++;

        if (attempts >= maxAttempts) {
          throw new Error("Maximum attempts reached");
        }
      } while (result.status?.id < 3);

      let outputText = "";
      if (result.stdout) {
        outputText = atob(result.stdout);
      } else if (result.stderr) {
        outputText = `Error: ${atob(result.stderr)}`;
      } else if (result.compile_output) {
        outputText = `Compilation Error: ${atob(result.compile_output)}`;
      } else {
        outputText = "No output generated";
      }

      setOutput(outputText);
      socket.emit("code-output-toServer", { roomID, output: outputText });
    } catch (error) {
      console.error("Code execution error:", error);
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEndInterview = () => {
    if (window.confirm("Are you sure you want to end the interview?")) {
      navigate("/");
    }
  };

  const deleteQuestion = async (id) => {
    console.log("Attempting to delete question ID:", id);
    try {
      const response = await axios.delete(
        `http://localhost:4000/questions/${id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // ✅ Include token
        }
      );

      if (response.status === 200) {
        alert("Question deleted successfully");
        setQuestionTitles((prev) => prev.filter((q) => q._id !== id)); // ✅ Update UI
      }
    } catch (error) {
      console.error(
        "Error deleting question:",
        error.response?.data || error.message
      );
      alert("Failed to delete question");
    }
  };

  const handleSelectQuestion = (question) => {
    setSelectedQuestion(question);
  };

  const handleSubmitQuestion = () => {
    if (selectedQuestion) {
      socket.emit("question-selected-ToServer", {
        question: selectedQuestion,
        roomID,
      });
      setCurrentQuestion(
        `${selectedQuestion.title}: ${selectedQuestion.description}`
      );
      setQuestionPopupOpen(false);
      setSelectedDifficulty("");
      setSelectedQuestion(null);
    } else {
      alert("Please select a question.");
    }
  };

  const handleOpenQuestionPopup = () => {
    setQuestionPopupOpen(true);
  };

  const handleAddQuestion = async () => {
    if (
      !newQuestionTitle ||
      !newQuestionDescription ||
      !newQuestionDifficulty
    ) {
      alert("Please fill all fields before submitting.");
      return;
    }

    const token = localStorage.getItem("token");
    console.log("Stored Token:", token);
    if (!token) {
      alert("You are not logged in! Please log in first.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:4000/questions",
        {
          title: newQuestionTitle,
          description: newQuestionDescription,
          difficulty: newQuestionDifficulty,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 201) {
        alert("Question added successfully!");
        setNewQuestionTitle("");
        setNewQuestionDescription("");
        setNewQuestionDifficulty("Easy");
        setAddQuestionPopupOpen(false);
      }
    } catch (error) {
      console.error(
        "Error adding question:",
        error.response?.data || error.message
      );
      alert(
        `Failed to add question: ${
          error.response?.data?.error || "Server error!"
        }`
      );
    }
  };

  return (
    <div className="container">
      <div className="top-section">
        {role === "interviewer" && (
          <div className="question-buttons-container">
            <button
              onClick={handleOpenQuestionPopup}
              className="floating-button"
            >
              Select Question
            </button>

            <button
              onClick={() => setAddQuestionPopupOpen(true)}
              className="floating-button"
            >
              Add Question
            </button>
            <button
              onClick={() => setDeleteQuestionPopupOpen(true)}
              className="floating-button"
            >
              Delete Question
            </button>
          </div>
        )}

        <div className="question-section">
          <h3>Question:</h3>
          <p>{currentQuestion}</p>
        </div>
      </div>

      {isQuestionPopupOpen && (
        <div className="feedback-popup">
          <div className="feedback-popup-content">
            {!selectedDifficulty ? (
              <div>
                <h2>Select Question Difficulty</h2>
                <div className="difficulty-buttons">
                  {["Easy", "Medium", "Hard"].map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => {
                        setSelectedDifficulty(difficulty);
                        fetchQuestionsByDifficulty(difficulty);
                      }}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
                <button onClick={() => setQuestionPopupOpen(false)}>
                  Close
                </button>
              </div>
            ) : (
              <div>
                <h2>Select {selectedDifficulty} Question</h2>
                <div className="question-list">
                  {questionTitles.length > 0 ? (
                    questionTitles.map((question) => (
                      <div
                        key={question._id}
                        className={`question-item ${
                          selectedQuestion?._id === question._id
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => handleSelectQuestion(question)}
                      >
                        {question.title}
                      </div>
                    ))
                  ) : (
                    <p className="question-paragraph">No questions found.</p>
                  )}
                </div>
                <div className="popup-buttons">
                  <button onClick={() => setSelectedDifficulty("")}>
                    Back
                  </button>
                  <button
                    onClick={handleSubmitQuestion}
                    disabled={!selectedQuestion}
                  >
                    Select Question
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isAddQuestionPopupOpen && (
        <div className="question-popup">
          <div className="question-popup-content">
            <h2 className="question-popup-title">Add a New Question</h2>
            <div className="question-input-group">
              <input
                type="text"
                placeholder="Title"
                value={newQuestionTitle}
                onChange={(e) => setNewQuestionTitle(e.target.value)}
                className="question-input"
              />
              <textarea
                placeholder="Description"
                value={newQuestionDescription}
                onChange={(e) => setNewQuestionDescription(e.target.value)}
                className="question-textarea"
              />
              <select
                value={newQuestionDifficulty}
                onChange={(e) => setNewQuestionDifficulty(e.target.value)}
                className="question-select"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="question-popup-buttons">
              <button
                onClick={() => setAddQuestionPopupOpen(false)}
                className="question-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                className="question-submit-button"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteQuestionPopupOpen && (
        <div className="feedback-popup">
          <div className="feedback-popup-content">
            {!selectedDifficulty ? (
              <div>
                <h2>Select Question Difficulty</h2>
                <div className="difficulty-buttons">
                  {["Easy", "Medium", "Hard"].map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => fetchQuestionsByDifficulty(difficulty)}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
                <button onClick={() => setDeleteQuestionPopupOpen(false)}>
                  Close
                </button>
              </div>
            ) : (
              <div>
                <h2>Select {selectedDifficulty} Question to Delete</h2>
                <div className="question-list">
                  {questionTitles.map((question) => (
                    <div key={question._id} className="question-item">
                      <span>{question.title}</span>
                      <button onClick={() => deleteQuestion(question._id)}>
                        🗑 Delete
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSelectedDifficulty("")}>Back</button>
                <button onClick={() => setDeleteQuestionPopupOpen(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="code-editor-section">
        <div className="editor-header">
          <select
            className="language-select"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>

          {(role==="interviewer") && <button
            onClick={
              ()=>{
                setInputDisabled(!inputDisabled);
                socket.emit("disable-input-server", roomID);
              }}
            className="button"
          >
            {inputDisabled ? "Unfreeze Editor" : "Freeze Editor"}
          </button>}
          <button
            onClick={handleRunCodeWrapper}
            className="run-button"
            disabled={isRunning}
          >
            {isRunning ? "Running..." : "Run Code"}
          </button>
        </div>

        <div className="editor-wrapper" ref={editorRef}>
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(value) => {
              setCode(value || "");
              socket.emit("update-code-server", { code: value, roomID });
            }}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
              padding: { top: 16 },
              scrollBeyondLastLine: false,
              readOnly: inputDisabled,
            }}
        
          />
        </div>

        <div className="input-wrapper">
          <h3>Input</h3>
          <textarea
            className="input-field"
            value={stdin}
            onChange={(e) => {
              setStdin(e.target.value);
              socket.emit("send-input-server", {
                roomID,
                input: e.target.value,
              });
            }}
            placeholder="Enter input here"
          />
        </div>

        <div className="output-window">
          <h3>Output</h3>
          <pre>{output}</pre>
        </div>
      </div>

      <div className="video-section">
        <VideoCall roomID={roomID} username={username}></VideoCall>
      </div>

      
    </div>
  );
};

export default Mockmate;

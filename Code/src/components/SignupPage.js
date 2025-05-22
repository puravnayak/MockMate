import React, { useState } from "react";
import axios from "axios";
import "./AuthPage.css";

const SignupPage = ({ onAuthSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("interviewee");

  const handleSignup = async () => {
    if (!username || !password) {
      alert("Please enter username and password");
      return;
    }

    try {
      const response = await axios.post("http://localhost:4000/auth/register", {
        username,
        password,
        role,
      });

      alert("Signup successful! Please log in.");
      onAuthSuccess(); 
    } catch (error) {
      alert(error.response?.data?.error || "Signup failed!");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Sign Up</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="auth-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="role-select"
        >
          <option value="interviewee">Interviewee</option>
          <option value="interviewer">Interviewer</option>
        </select>
        <button onClick={handleSignup} className="login-button">
          Sign Up
        </button>
        <p className="switch-auth">
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;

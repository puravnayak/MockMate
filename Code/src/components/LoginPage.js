import React, { useState } from "react";
import axios from "axios";
import "./AuthPage.css";

const LoginPage = ({ onLogin}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roomID, setRoomID] = useState("");

  const handleLogin = async () => {
    console.log("Attempting login with:", { username, password, roomID });

    if (!username || !password || !roomID) {
      alert("Please enter username, password, and room ID!");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:4000/auth/login",
        { username, password, roomID },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Login Response:", response.data);
      const { token, user } = response.data;

      if (!user || !user.role) {
        alert("Invalid response from server!");
        return;
      }
      



      localStorage.setItem("token", token);
      localStorage.setItem("username", username); 
      localStorage.setItem("interviewRole", user.role);
      localStorage.setItem("roomID", roomID);

      alert("Login successful!");

      onLogin(user.role, roomID, username);
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Login failed!");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Login</h1>
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
        <input
          type="text"
          placeholder="Room ID"
          value={roomID}
          onChange={(e) => setRoomID(e.target.value)}
          className="auth-input"
        />
        <button onClick={handleLogin} className="login-button">
          Login
        </button>
        <p className="switch-auth">
          Don't have an account? <a href="/signup">Sign Up</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

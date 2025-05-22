import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import axios from "axios"; 
import SignupPage from "./components/SignupPage";
import LoginPage from "./components/LoginPage";
import Mockmate from "./components/Mockmate";
import CountdownTimer from "./components/Timer"; 
import "./App.css";
import socket from "./socket";

const LANGUAGE_DEFAULTS = {
  javascript: "console.log('Hello World');",
  python: "print('Hello World')",
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello World";\n    return 0;\n}',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
};

function App() {
  const [code, setCode] = useState(LANGUAGE_DEFAULTS.javascript);
  const [roomID, setRoomID] = useState(localStorage.getItem("roomID") || "");
  const [role, setRole] = useState(localStorage.getItem("interviewRole") || null);
  const [username, setUsername] = useState(localStorage.getItem("username") || null);
  const [waitingForInterviewer, setWaitingForInterviewer] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [isTabActive, setIsTabActive] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === 'visible');
      if(!isTabActive && role==="interviewee"){
        alert("Do not change tabs.");
        socket.emit("changed-tabs-server", roomID);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [role, isTabActive]);
  useEffect(() => {
    console.log("Stored values:", { role, roomID, username });

    if (roomID && username && role) {
      const userInfo = { username, role, roomID, code };
      console.log("Emitting join-user (useEffect):", userInfo);
      socket.emit("join-user", userInfo);
    }

    socket.on("waiting", () => {
      console.log("Waiting for interviewer...");
      setWaitingForInterviewer(true);
    });

    socket.on("start-interview", () => {
      console.log("Interview started!");
      setWaitingForInterviewer(false);
    });

    socket.on("interviewee-joined", (data) => {
      console.log("🔔 Interviewee joined:", data.message);
      if (role === "interviewer") {
        alert(data.message);
      }
      setWaitingForInterviewer(false);
    });

    socket.on("interviewer-joined", (data) => {
      console.log("🔔 Interviewer joined:", data.message);
      alert(data.message);
    });

    socket.on("changed-tabs-client", ()=>{alert("Interviewee has switched tabs.")});
    return () => {
      socket.off("waiting");
      socket.off("start-interview");
      socket.off("interviewee-joined");
      socket.off("interviewer-joined");
      socket.off("changed-tabs-client");
    };
  }, [roomID, username, role]);

  const handleLogin = (selectedRole, roomCode, user) => {
    console.log("Logging in with:", { selectedRole, roomCode, user });

    setRole(selectedRole);
    setRoomID(roomCode);
    setUsername(user);

    localStorage.setItem("interviewRole", selectedRole);
    localStorage.setItem("roomID", roomCode);
    localStorage.setItem("username", user);

    const userInfo = { username: user, role: selectedRole, roomID: roomCode, code };
    console.log("Emitting join-user:", userInfo);
    socket.emit("join-user", userInfo);

    setTimeout(() => navigate("/mockmate"), 100);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token"); 
      if (!token) {
        alert("No token found! Please log in again.");
        return;
      }

      const response = await axios.post(
        "http://localhost:4000/auth/logout", 
        {},  
        { headers: { Authorization: `Bearer ${token}` } } 
      );

      console.log("Logout response:", response.data);
      localStorage.clear();
      alert("Logged out successfully!");
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Logout failed! Try again.");
    }
  };

  return (
    <div>
      {location.pathname === "/mockmate" && (
  <div className="timer-container">
    <CountdownTimer socket={socket} roomID={roomID} role={role} setInputDisabled={setInputDisabled}/>
    <button onClick={handleLogout} className="logout-button">
      Logout
    </button>
  </div>
)}


      {waitingForInterviewer && role === "interviewee" && (
        <div className="popup">
          <p>Waiting for Interviewer to Join...</p>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<SignupPage onAuthSuccess={() => navigate("/login")} />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} setRole={setRole}/>} />
        <Route 
          path="/mockmate" 
          element={
            username && role && roomID ? (
              <Mockmate role={role} socket={socket} code={code} setCode={setCode} roomID={roomID} username={username} inputDisabled={inputDisabled} setInputDisabled={setInputDisabled}/>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </div>
  );
}

export default App;

import React, { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import AuthPage from "./components/AuthPage";
import Mockmate from "./components/Mockmate";
import Timer from "./components/Timer";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("interviewee"); // Default role

  const handleLogin = (selectedRole) => {
    setRole(selectedRole); // Set the role
    navigate("/mockmate"); // Both roles go to the same page
  };

  return (
    <div>
      {location.pathname === "/mockmate" && (
        <div className="timer-container">
          <Timer initialTime={0} isCountdown={false} />
        </div>
      )}

      <Routes>
        <Route path="/" element={<AuthPage onLogin={handleLogin} />} />
        <Route path="/mockmate" element={<Mockmate role={role} />} />
      </Routes>
    </div>
  );
}

export default App;
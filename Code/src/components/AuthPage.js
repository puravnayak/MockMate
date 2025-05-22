import React, { useState } from 'react';
import './AuthPage.css';

const AuthPage = ({ onLogin, socket, code, roomID, setRoomID, username, setUsername, password, setPassword}) => {
 
  const [role, setRole] = useState('interviewee');
  const [isHovered, setIsHovered] = useState(false);

  const handleLogin = () => {
    if (username && password) {
      socket.emit("join-user", {username, password, roomID, code});
      onLogin(role);
    } else {
      alert('Please enter username and password');
    }
  };

  return (
    <div className="auth-container">
      <div 
        className={`auth-card ${isHovered ? 'card-hover' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <h1 className="auth-title">Mockmate Authentication</h1>
        <p className="auth-subtitle">Enter your credentials to start the mock interview</p>
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
        placeholder="Room-ID"
        onChange={(e)=>{setRoomID(e.target.value)}}
      />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="role-select"
        >
          <option value="interviewee">Interviewee</option>
          <option value="interviewer">Interviewer</option>
        </select>
        <button 
          onClick={handleLogin} 
          className="login-button"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
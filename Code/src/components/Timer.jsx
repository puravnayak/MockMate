import React, { useState, useEffect } from "react";
import { Clock, RotateCcw, Play, Pause } from "lucide-react";

const CountdownTimer = ({
  showHours = true,
  theme = "light",
  className = "",
  socket,
  roomID,
  role, // 👈 Role: Interviewer or Interviewee
  setInputDisabled,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [inputHours, setInputHours] = useState("0");
  const [inputMinutes, setInputMinutes] = useState("0");
  const [inputSeconds, setInputSeconds] = useState("0");

  // 🔹 Listen for timer updates from the interviewer
  useEffect(() => {
    socket.on("update-timer-client", ({ timeLeft, isRunning }) => {
      console.log("⏳ Syncing Timer:", { timeLeft, isRunning });
      setTimeLeft(timeLeft);
      setIsRunning(isRunning);
    });

    socket.on("send-hours-client", ({ value }) => setInputHours(value));
    socket.on("send-minutes-client", ({ value }) => setInputMinutes(value));
    socket.on("send-seconds-client", ({ value }) => setInputSeconds(value));

    return () => {
      socket.off("update-timer-client");
      socket.off("send-hours-client");
      socket.off("send-minutes-client");
      socket.off("send-seconds-client");
    };
  }, []);

  // ⏳ Timer Countdown
  useEffect(() => {
    let timerInterval;
    if (isRunning && timeLeft > 0) {
      timerInterval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerInterval);
            setIsRunning(false);
            onComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerInterval);
  }, [isRunning, timeLeft]);

  const onComplete = () => {
    setInputDisabled(true);
    alert("Time ran out!");

  };
  // ✅ Start / Pause Timer & Sync across clients
  const handleStartStop = () => {
    if (!isRunning && timeLeft === 0) {
      const newTime =
        parseInt(inputHours) * 3600 +
        parseInt(inputMinutes) * 60 +
        parseInt(inputSeconds);
      setTimeLeft(newTime);
      setIsRunning(true);
      setInputDisabled(false);
      socket.emit("enable-input-server", roomID);
      // 🔹 Broadcast Timer Start to all users
      if (role === "interviewer") {
        socket.emit("update-timer-server", { roomID, timeLeft: newTime, isRunning: true });
      }
    } else {
      setIsRunning(!isRunning);

      // 🔹 Broadcast Pause/Resume
      if (role === "interviewer") {
        socket.emit("update-timer-server", { roomID, timeLeft, isRunning: !isRunning });
      }
    }
  };

  // 🔄 Reset Timer & Sync across clients
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(0);

    if (role === "interviewer") {
      socket.emit("update-timer-server", { roomID, timeLeft: 0, isRunning: false });
    }
  };

  // 🔹 Sync Hours, Minutes, Seconds input changes
  const handleTimeInput = (value, setter, max, type) => {
    const numberValue = parseInt(value) || 0;
    setter(Math.min(Math.max(0, numberValue), max).toString());

    // 🔹 Only Interviewer can update time fields
    if (role === "interviewer") {
      socket.emit(`send-${type}-server`, { value: value.toString(), roomID });
    }
  };

  const themeClasses = {
    light: "bg-white text-gray-900 shadow-md",
    dark: "bg-gray-900 text-white shadow-md",
    blue: "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md",
  };

  return (
    <div
      className={`relative p-6 rounded-lg ${themeClasses[theme]} ${className} transition-all duration-300 flex flex-col items-center w-full max-w-lg`}
    >
      {/* Timer Display */}
      <div className="flex items-center justify-center mb-4 text-4xl font-bold">
        <Clock className="w-6 h-6 mr-2 opacity-80" />
        {`${showHours ? `${String(Math.floor(timeLeft / 3600)).padStart(2, "0")}:` : ""}${String(
          Math.floor((timeLeft % 3600) / 60)
        ).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`}
      </div>

      {/* ⏳ Time Inputs - Only for Interviewer */}
      {role === "interviewer" && !isRunning && timeLeft === 0 && (
        <div className="flex items-center justify-center gap-2 mb-4">
          {showHours && (
            <input
              type="number"
              value={inputHours}
              onChange={(e) => handleTimeInput(e.target.value, setInputHours, 99, "hours")}
              className="w-16 p-2 text-center rounded-md border focus:ring-2 focus:ring-blue-500 text-black shadow-sm"
              placeholder="HH"
            />
          )}
          <span className="text-xl font-bold">:</span>
          <input
            type="number"
            value={inputMinutes}
            onChange={(e) => handleTimeInput(e.target.value, setInputMinutes, 59, "minutes")}
            className="w-16 p-2 text-center rounded-md border focus:ring-2 focus:ring-blue-500 text-black shadow-sm"
            placeholder="MM"
          />
          <span className="text-xl font-bold">:</span>
          <input
            type="number"
            value={inputSeconds}
            onChange={(e) => handleTimeInput(e.target.value, setInputSeconds, 59, "seconds")}
            className="w-16 p-2 text-center rounded-md border focus:ring-2 focus:ring-blue-500 text-black shadow-sm"
            placeholder="SS"
          />
        </div>
      )}

      {/* 🎮 Buttons - Only for Interviewer */}
      {role === "interviewer" && (
        <div className="flex justify-center gap-4">
          <button
            onClick={handleStartStop}
            className={`px-6 py-2 rounded-lg text-white text-lg font-medium transition-all transform active:scale-95 ${
              isRunning ? "bg-red-500 hover:bg-red-600 shadow-md" : "bg-green-500 hover:bg-green-600 shadow-md"
            } flex items-center gap-2`}
          >
            {isRunning ? <Pause size={22} /> : <Play size={22} />}
            {isRunning ? "Pause" : timeLeft === 0 ? "Start" : "Resume"}
          </button>

          <button
            onClick={handleReset}
            className="px-6 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white text-lg font-medium transition-all transform active:scale-95 shadow-md flex items-center gap-2"
          >
            <RotateCcw size={22} />
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default CountdownTimer;

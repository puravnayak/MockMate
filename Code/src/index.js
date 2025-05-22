import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById("root")
);

const consoleError = console.error;
console.error = (...args) => {
  if (args[0].includes('ResizeObserver loop limit exceeded')) {
    return;
  }
  consoleError(...args);
};
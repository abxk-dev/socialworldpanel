import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress benign "ResizeObserver loop" error (browser quirk with Radix/scrollable UI)
const resizeObserverErr = (msg, url, line, col, err) => {
  const s = String(msg || (err && err.message) || "");
  if (s.includes("ResizeObserver loop") || s.includes("ResizeObserver loop completed with undelivered notifications")) return true;
  return false;
};
window.addEventListener("error", (e) => {
  if (resizeObserverErr(e.message, e.filename, e.lineno, e.colno, e.error)) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
});
const _onerror = window.onerror;
window.onerror = function (msg, url, line, col, err) {
  if (resizeObserverErr(msg, url, line, col, err)) return true;
  return _onerror ? _onerror.apply(this, arguments) : false;
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

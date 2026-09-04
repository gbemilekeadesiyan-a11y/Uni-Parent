import { createSampleState, loadAppState, saveAppState } from "./storage.js";

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function loadState() {
  const state = loadAppState() ?? createSampleState();
  saveAppState(state);
  return state;
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  window.clearTimeout(showToast.timer);
  toast.textContent = message;
  toast.hidden = false;
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

export function showErrors(container, errors, form) {
  container.hidden = errors.length === 0;
  container.innerHTML = errors.length
    ? `<strong>Please review the following:</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`
    : "";
  if (form) form.setAttribute("aria-invalid", String(errors.length > 0));
}


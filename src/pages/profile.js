import { validateProfile } from "../planner.js";
import { clearAppState, createBlankState, createSampleState, saveAppState } from "../storage.js";
import { loadState, showErrors, showToast } from "../ui.js";

const form = document.querySelector("#profile-form");
const errors = document.querySelector("#profile-errors");
let state = loadState();

function writeProfile(profile) {
  for (const [key, value] of Object.entries(profile)) {
    const field = form.elements.namedItem(key);
    if (field) field.value = String(value);
  }
}

function readProfile() {
  const data = new FormData(form);
  return {
    ageBand: String(data.get("ageBand") ?? ""),
    majorArea: String(data.get("majorArea") ?? ""),
    major: String(data.get("major") ?? "").trim(),
    careerTrack: String(data.get("careerTrack") ?? ""),
    careerGoal: String(data.get("careerGoal") ?? "").trim(),
    wakeTime: String(data.get("wakeTime") ?? ""),
    sleepTime: String(data.get("sleepTime") ?? ""),
    focusPreference: String(data.get("focusPreference") ?? ""),
    leisureTarget: Number(data.get("leisureTarget")),
  };
}

function validateAndSave() {
  const profile = readProfile();
  const messages = validateProfile(profile);
  showErrors(errors, messages, form);
  if (messages.length) return false;
  state.profile = profile;
  state.plans = {};
  saveAppState(state);
  return true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateAndSave()) return;
  window.location.assign("/schedule.html");
});

form.addEventListener("focusout", (event) => {
  if (!event.target.matches("input, select")) return;
  const messages = validateProfile(readProfile());
  showErrors(errors, messages, form);
});

document.querySelector("#load-sample").addEventListener("click", () => {
  state = createSampleState();
  saveAppState(state);
  writeProfile(state.profile);
  showErrors(errors, [], form);
  showToast("Sample student loaded.");
});

document.querySelector("#start-blank").addEventListener("click", () => {
  if (!window.confirm("Clear the saved profile and schedule, then start blank?")) return;
  clearAppState();
  state = createBlankState();
  saveAppState(state);
  writeProfile(state.profile);
  showErrors(errors, [], form);
  showToast("Blank profile ready.");
});

writeProfile(state.profile);


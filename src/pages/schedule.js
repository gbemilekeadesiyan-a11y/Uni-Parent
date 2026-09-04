import { durationLabel, parseTime, validateCommitment, weekdayForDate } from "../planner.js";
import { saveAppState } from "../storage.js";
import { DAY_LONG, DAY_SHORT, escapeHtml, loadState, localDateString, showErrors, showToast } from "../ui.js";

const form = document.querySelector("#commitment-form");
const errorBox = document.querySelector("#commitment-errors");
const list = document.querySelector("#commitment-list");
const summary = document.querySelector("#schedule-summary");
const filter = document.querySelector("#weekday-filter");
let state = loadState();
let selectedWeekday = weekdayForDate(localDateString());

function renderFilter() {
  filter.innerHTML = DAY_SHORT.map((day, index) => `<button class="day-chip" type="button" data-weekday="${index}" aria-pressed="${index === selectedWeekday}" aria-label="Show ${DAY_LONG[index]} commitments">${day}</button>`).join("");
}

function renderCommitments() {
  const visible = state.commitments.filter((item) => Number(item.weekday) === selectedWeekday).sort((a, b) => parseTime(a.start) - parseTime(b.start));
  const minutes = visible.reduce((total, item) => total + parseTime(item.end) - parseTime(item.start), 0);
  summary.textContent = `${visible.length} block${visible.length === 1 ? "" : "s"} · ${durationLabel(minutes)}`;
  list.innerHTML = visible.length
    ? visible.map((item) => `<article class="commitment-item"><time>${escapeHtml(item.start)}–${escapeHtml(item.end)}</time><div><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.type)}</span></div><button class="icon-button" type="button" data-remove="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.title)}">×</button></article>`).join("")
    : `<p class="list-empty">No fixed commitments on ${DAY_LONG[selectedWeekday]}. The planner can leave the day open.</p>`;
}

function readCommitment() {
  const data = new FormData(form);
  return {
    id: window.crypto?.randomUUID?.() ?? `commitment-${Date.now()}`,
    weekday: Number(data.get("weekday")),
    title: String(data.get("title") ?? "").trim(),
    type: String(data.get("type") ?? "class"),
    start: String(data.get("start") ?? ""),
    end: String(data.get("end") ?? ""),
  };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const commitment = readCommitment();
  const messages = validateCommitment(commitment, state.commitments);
  showErrors(errorBox, messages, form);
  if (messages.length) return;
  state.commitments.push(commitment);
  state.plans = {};
  saveAppState(state);
  selectedWeekday = commitment.weekday;
  form.reset();
  form.elements.namedItem("weekday").value = String(selectedWeekday);
  form.elements.namedItem("type").value = "class";
  renderFilter();
  renderCommitments();
  showToast("Commitment added.");
});

form.addEventListener("focusout", (event) => {
  if (!event.target.matches("input, select")) return;
  const candidate = readCommitment();
  if (!candidate.title && !candidate.start && !candidate.end) return;
  showErrors(errorBox, validateCommitment(candidate, state.commitments), form);
});

filter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-weekday]");
  if (!button) return;
  selectedWeekday = Number(button.dataset.weekday);
  form.elements.namedItem("weekday").value = String(selectedWeekday);
  renderFilter();
  renderCommitments();
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  state.commitments = state.commitments.filter((item) => String(item.id) !== button.dataset.remove);
  state.plans = {};
  saveAppState(state);
  renderCommitments();
  showToast("Commitment removed.");
});

form.elements.namedItem("weekday").value = String(selectedWeekday);
form.elements.namedItem("start").value = "09:00";
form.elements.namedItem("end").value = "10:00";
renderFilter();
renderCommitments();


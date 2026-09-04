import { durationLabel, formatTime, generateDailyPlan, parseTime } from "../planner.js";
import { saveAppState } from "../storage.js";
import { escapeHtml, loadState, localDateString, showToast } from "../ui.js";

const labels = { class: "Class", work: "Work", responsibility: "Responsibility", career: "Career", study: "Study", wellness: "Wellbeing", fun: "Fun", free: "Free", break: "Break" };
const planDate = document.querySelector("#plan-date");
const timeline = document.querySelector("#timeline");
const notices = document.querySelector("#plan-notices");
const balance = document.querySelector("#balance-grid");
const empty = document.querySelector("#empty-plan");
let state = loadState();

function applyCompletion(next, previous) {
  if (!previous) return next;
  const completed = new Map(previous.blocks.map((block) => [block.id, Boolean(block.completed)]));
  next.blocks = next.blocks.map((block) => ({ ...block, completed: completed.get(block.id) ?? false }));
  return next;
}

function totalFor(plan, categories) {
  return plan.blocks.filter((block) => categories.includes(block.category)).reduce((sum, block) => sum + block.endMinutes - block.startMinutes, 0);
}

function renderBalance(plan) {
  const items = [["Study", ["study"]], ["Career", ["career"]], ["Wellbeing", ["wellness", "break"]], ["Leisure", ["fun", "free"]]];
  balance.innerHTML = items.map(([label, categories]) => `<div class="balance-row"><span>${label}</span><strong>${durationLabel(totalFor(plan, categories))}</strong></div>`).join("");
}

function renderTimeline(plan) {
  const wake = parseTime(state.profile.wakeTime);
  const sleep = parseTime(state.profile.sleepTime);
  const slotMinutes = 15;
  const slots = Math.ceil((sleep - wake) / slotMinutes);
  timeline.style.setProperty("--day-slots", String(slots));
  const lines = [];
  for (let minute = Math.ceil(wake / 60) * 60; minute < sleep; minute += 60) {
    const row = Math.floor((minute - wake) / slotMinutes) + 1;
    lines.push(`<div class="hour-line" style="--grid-start:${row}" aria-hidden="true"><span>${formatTime(minute)}</span></div>`);
  }
  const blocks = plan.blocks.map((block) => {
    const start = Math.floor((block.startMinutes - wake) / slotMinutes) + 1;
    const span = Math.max(2, Math.ceil((block.endMinutes - block.startMinutes) / slotMinutes));
    return `<article class="plan-block${block.completed ? " completed" : ""}" data-category="${escapeHtml(block.category)}" style="--grid-start:${start};--grid-span:${span}"><div class="block-copy"><span class="event-time">${formatTime(block.startMinutes)}–${formatTime(block.endMinutes)}</span><h3>${escapeHtml(block.title)}</h3><p>${escapeHtml(block.reason)}</p></div><span class="event-kind">${escapeHtml(labels[block.category] ?? "Plan")}${block.fixed ? " · fixed" : ""}</span><button class="complete-toggle" type="button" data-complete="${escapeHtml(block.id)}" aria-label="Mark ${escapeHtml(block.title)} ${block.completed ? "incomplete" : "complete"}" aria-pressed="${block.completed}">✓</button></article>`;
  });
  timeline.innerHTML = [...lines, ...blocks].join("");
}

function renderPlan(plan) {
  empty.hidden = true;
  timeline.hidden = false;
  const date = new Date(`${plan.date}T12:00:00`);
  const monthDay = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(date);
  document.querySelector("#plan-kicker").textContent = `${plan.weekdayLabel} · ${monthDay}`;
  document.querySelector("#date-card-weekday").textContent = plan.weekdayLabel;
  document.querySelector("#date-card-number").textContent = String(date.getDate());
  document.querySelector("#career-card-title").textContent = plan.careerAction.title;
  document.querySelector("#career-card-reason").textContent = plan.careerAction.reason;
  notices.innerHTML = [...plan.warnings.map((warning) => `<p class="notice">${escapeHtml(warning)}</p>`), ...plan.unscheduled.map((item) => `<p class="notice unscheduled"><strong>Unscheduled:</strong> ${escapeHtml(item.title)} needs ${durationLabel(item.neededMinutes)}.</p>`)].join("");
  renderBalance(plan);
  renderTimeline(plan);
  const priorities = plan.blocks.filter((block) => !["free", "break"].includes(block.category));
  document.querySelector("#progress-copy").textContent = `${priorities.filter((block) => block.completed).length} of ${priorities.length} priorities complete`;
}

function generate({ announce = false } = {}) {
  try {
    const generated = generateDailyPlan(state.profile, state.commitments, planDate.value);
    state.plans[planDate.value] = applyCompletion(generated, state.plans[planDate.value]);
    saveAppState(state);
    renderPlan(state.plans[planDate.value]);
    if (announce) showToast("Your day was rebuilt.");
  } catch (error) {
    timeline.hidden = true;
    empty.hidden = false;
    notices.innerHTML = `<p class="notice">${escapeHtml(error.message)}</p>`;
    balance.innerHTML = "";
    document.querySelector("#progress-copy").textContent = "Plan needs attention";
  }
}

document.querySelector("#generate-plan").addEventListener("click", () => generate({ announce: true }));
planDate.addEventListener("change", () => state.plans[planDate.value] ? renderPlan(state.plans[planDate.value]) : generate());
timeline.addEventListener("click", (event) => {
  const button = event.target.closest("[data-complete]");
  if (!button) return;
  const plan = state.plans[planDate.value];
  const block = plan?.blocks.find((item) => item.id === button.dataset.complete);
  if (!block) return;
  block.completed = !block.completed;
  saveAppState(state);
  renderPlan(plan);
});

planDate.value = localDateString();
state.plans[planDate.value] ? renderPlan(state.plans[planDate.value]) : generate();


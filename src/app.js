import {
  durationLabel,
  formatTime,
  generateDailyPlan,
  parseTime,
  validateCommitment,
  validateProfile,
  weekdayForDate,
} from "./planner.js";
import {
  clearAppState,
  createBlankState,
  createSampleState,
  loadAppState,
  saveAppState,
} from "./storage.js";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CATEGORY_LABELS = {
  class: "Class",
  work: "Work",
  responsibility: "Responsibility",
  career: "Career",
  study: "Study",
  wellness: "Wellbeing",
  fun: "Fun",
  free: "Free",
  break: "Break",
};

const profileForm = document.querySelector("#profile-form");
const profileErrors = document.querySelector("#profile-errors");
const commitmentForm = document.querySelector("#commitment-form");
const commitmentErrors = document.querySelector("#commitment-errors");
const commitmentList = document.querySelector("#commitment-list");
const scheduleSummary = document.querySelector("#schedule-summary");
const weekdayFilter = document.querySelector("#weekday-filter");
const planDate = document.querySelector("#plan-date");
const timeline = document.querySelector("#timeline");
const notices = document.querySelector("#plan-notices");
const balanceGrid = document.querySelector("#balance-grid");
const emptyPlan = document.querySelector("#empty-plan");
const toast = document.querySelector("#toast");

let state = loadAppState() ?? createSampleState();
let selectedWeekday = weekdayForDate(localDateString());
let toastTimer;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function switchView(view) {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== view;
  });
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.view === view));
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showErrors(container, errors) {
  container.hidden = errors.length === 0;
  container.innerHTML = errors.length
    ? `<ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`
    : "";
}

function writeProfileToForm(profile) {
  for (const [key, value] of Object.entries(profile)) {
    const field = profileForm.elements.namedItem(key);
    if (field) field.value = String(value);
  }
}

function readProfileFromForm() {
  const data = new FormData(profileForm);
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

function saveCurrentProfile() {
  const profile = readProfileFromForm();
  const errors = validateProfile(profile);
  showErrors(profileErrors, errors);
  if (errors.length) return false;
  state.profile = profile;
  saveAppState(state);
  return true;
}

function renderWeekdayFilter() {
  weekdayFilter.innerHTML = DAY_SHORT.map(
    (day, index) => `
      <button
        class="day-chip"
        type="button"
        data-weekday="${index}"
        aria-pressed="${index === selectedWeekday}"
        aria-label="Show ${DAY_LONG[index]} commitments"
      >${day.slice(0, 1)}</button>
    `,
  ).join("");
}

function renderCommitments() {
  const visible = state.commitments
    .filter((item) => Number(item.weekday) === selectedWeekday)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
  const totalMinutes = visible.reduce((sum, item) => sum + parseTime(item.end) - parseTime(item.start), 0);
  scheduleSummary.textContent = `${visible.length} block${visible.length === 1 ? "" : "s"} · ${durationLabel(totalMinutes)}`;

  if (!visible.length) {
    commitmentList.innerHTML = `<div class="list-empty">No fixed commitments on ${DAY_LONG[selectedWeekday]}. Open time will remain available for planning.</div>`;
    return;
  }

  commitmentList.innerHTML = visible
    .map(
      (item) => `
        <article class="commitment-item">
          <div class="commitment-time">${formatTime(parseTime(item.start))}<br />${formatTime(parseTime(item.end))}</div>
          <div>
            <h3 class="commitment-title">${escapeHtml(item.title)}</h3>
            <span class="commitment-type">${escapeHtml(item.type)}</span>
          </div>
          <button class="icon-button" type="button" data-remove-commitment="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.title)}">×</button>
        </article>
      `,
    )
    .join("");
}

function readCommitmentForm() {
  return {
    id: window.crypto?.randomUUID?.() ?? `commitment-${Date.now()}`,
    weekday: Number(document.querySelector("#commitment-weekday").value),
    title: document.querySelector("#commitment-title").value.trim(),
    type: document.querySelector("#commitment-type").value,
    start: document.querySelector("#commitment-start").value,
    end: document.querySelector("#commitment-end").value,
  };
}

function applyCompletionState(newPlan, oldPlan) {
  if (!oldPlan) return newPlan;
  const completed = new Map(oldPlan.blocks.map((block) => [block.id, Boolean(block.completed)]));
  newPlan.blocks = newPlan.blocks.map((block) => ({ ...block, completed: completed.get(block.id) ?? false }));
  return newPlan;
}

function generateSelectedPlan({ announce = true } = {}) {
  if (!saveCurrentProfile()) {
    switchView("profile");
    showToast("Review the highlighted profile details first.");
    return null;
  }

  try {
    const date = planDate.value;
    const generated = generateDailyPlan(state.profile, state.commitments, date);
    state.plans[date] = applyCompletionState(generated, state.plans[date]);
    saveAppState(state);
    renderPlan(state.plans[date]);
    if (announce) showToast("Your day has been rebuilt around your priorities.");
    return state.plans[date];
  } catch (error) {
    renderPlanError(error.message);
    return null;
  }
}

function sumCategories(plan, categories) {
  return plan.blocks
    .filter((block) => categories.includes(block.category))
    .reduce((sum, block) => sum + block.endMinutes - block.startMinutes, 0);
}

function renderBalance(plan) {
  const cards = [
    ["Study", sumCategories(plan, ["study"])],
    ["Career", sumCategories(plan, ["career"])],
    ["Wellbeing", sumCategories(plan, ["wellness", "break"])],
    ["Leisure", sumCategories(plan, ["fun", "free"])],
  ];
  balanceGrid.innerHTML = cards
    .map(([label, minutes]) => `<div class="balance-card"><span>${label}</span><strong>${durationLabel(minutes)}</strong></div>`)
    .join("");
}

function renderNotices(plan) {
  const warningHtml = plan.warnings.map((warning) => `<p class="notice">${escapeHtml(warning)}</p>`);
  const unscheduledHtml = plan.unscheduled.map(
    (item) => `<p class="notice unscheduled"><strong>Still worth doing:</strong> ${escapeHtml(item.title)} needs at least ${durationLabel(item.neededMinutes)}.</p>`,
  );
  notices.innerHTML = [...warningHtml, ...unscheduledHtml].join("");
}

function renderProgress(plan) {
  const actionable = plan.blocks.filter((block) => !["free", "break"].includes(block.category));
  const complete = actionable.filter((block) => block.completed).length;
  document.querySelector("#progress-copy").textContent = `${complete} of ${actionable.length} priorities complete`;
}

function renderTimeline(plan) {
  timeline.innerHTML = plan.blocks
    .map((block) => {
      const label = CATEGORY_LABELS[block.category] ?? "Plan";
      return `
        <article class="plan-block${block.completed ? " completed" : ""}" data-category="${escapeHtml(block.category)}">
          <div class="block-time">${formatTime(block.startMinutes)}<br />${formatTime(block.endMinutes)}</div>
          <span class="timeline-dot" aria-hidden="true"></span>
          <div class="block-body">
            <div class="block-topline">
              <span class="category-pill">${escapeHtml(label)}</span>
              ${block.fixed ? '<span class="category-pill fixed-pill">Fixed</span>' : ""}
            </div>
            <h3 class="block-title">${escapeHtml(block.title)}</h3>
            <p class="block-reason">${escapeHtml(block.reason)}</p>
          </div>
          <button
            class="complete-toggle"
            type="button"
            data-complete-block="${escapeHtml(block.id)}"
            aria-label="Mark ${escapeHtml(block.title)} ${block.completed ? "incomplete" : "complete"}"
            aria-pressed="${block.completed}"
          >✓</button>
        </article>
      `;
    })
    .join("");
}

function renderPlan(plan) {
  emptyPlan.hidden = true;
  timeline.hidden = false;
  const date = new Date(`${plan.date}T12:00:00`);
  document.querySelector("#plan-kicker").textContent = `${plan.weekdayLabel} · ${new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(date)}`;
  document.querySelector("#plan-heading").textContent = "Your balanced day";
  document.querySelector("#career-card-title").textContent = plan.careerAction.title;
  document.querySelector("#career-card-reason").textContent = plan.careerAction.reason;
  renderBalance(plan);
  renderNotices(plan);
  renderTimeline(plan);
  renderProgress(plan);
}

function renderPlanError(message) {
  timeline.hidden = true;
  emptyPlan.hidden = false;
  notices.innerHTML = `<p class="notice">${escapeHtml(message)}</p>`;
  balanceGrid.innerHTML = "";
  document.querySelector("#progress-copy").textContent = "Plan needs attention";
}

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!saveCurrentProfile()) return;
  selectedWeekday = weekdayForDate(planDate.value);
  document.querySelector("#commitment-weekday").value = String(selectedWeekday);
  renderWeekdayFilter();
  renderCommitments();
  switchView("schedule");
  showToast("Profile saved in this browser.");
});

commitmentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const commitment = readCommitmentForm();
  const errors = validateCommitment(commitment, state.commitments);
  showErrors(commitmentErrors, errors);
  if (errors.length) return;

  state.commitments.push(commitment);
  state.plans = {};
  saveAppState(state);
  selectedWeekday = commitment.weekday;
  renderWeekdayFilter();
  renderCommitments();
  commitmentForm.reset();
  document.querySelector("#commitment-weekday").value = String(selectedWeekday);
  document.querySelector("#commitment-type").value = "class";
  showToast("Commitment added. Existing plans will be regenerated.");
});

weekdayFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-weekday]");
  if (!button) return;
  selectedWeekday = Number(button.dataset.weekday);
  document.querySelector("#commitment-weekday").value = String(selectedWeekday);
  renderWeekdayFilter();
  renderCommitments();
});

commitmentList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-commitment]");
  if (!button) return;
  state.commitments = state.commitments.filter((item) => String(item.id) !== button.dataset.removeCommitment);
  state.plans = {};
  saveAppState(state);
  renderCommitments();
  showToast("Commitment removed.");
});

timeline.addEventListener("click", (event) => {
  const button = event.target.closest("[data-complete-block]");
  if (!button) return;
  const plan = state.plans[planDate.value];
  if (!plan) return;
  const block = plan.blocks.find((item) => item.id === button.dataset.completeBlock);
  if (!block) return;
  block.completed = !block.completed;
  saveAppState(state);
  renderPlan(plan);
});

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelectorAll("[data-view-link]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.viewLink));
});

document.querySelector("#generate-plan").addEventListener("click", () => generateSelectedPlan());
document.querySelector("#schedule-continue").addEventListener("click", () => {
  generateSelectedPlan();
  switchView("today");
});

planDate.addEventListener("change", () => {
  selectedWeekday = weekdayForDate(planDate.value);
  const saved = state.plans[planDate.value];
  if (saved) renderPlan(saved);
  else generateSelectedPlan({ announce: false });
});

document.querySelector("#load-sample").addEventListener("click", () => {
  state = createSampleState();
  saveAppState(state);
  writeProfileToForm(state.profile);
  selectedWeekday = weekdayForDate(planDate.value);
  renderWeekdayFilter();
  renderCommitments();
  generateSelectedPlan({ announce: false });
  showToast("Sample student loaded.");
});

document.querySelector("#start-blank").addEventListener("click", () => {
  if (!window.confirm("Clear the saved sample and start with a blank schedule?")) return;
  clearAppState();
  state = createBlankState();
  saveAppState(state);
  writeProfileToForm(state.profile);
  selectedWeekday = weekdayForDate(planDate.value);
  renderWeekdayFilter();
  renderCommitments();
  generateSelectedPlan({ announce: false });
  showToast("Blank profile ready.");
});

function initialize() {
  planDate.value = localDateString();
  writeProfileToForm(state.profile);
  document.querySelector("#commitment-weekday").value = String(selectedWeekday);
  document.querySelector("#commitment-start").value = "09:00";
  document.querySelector("#commitment-end").value = "10:00";
  renderWeekdayFilter();
  renderCommitments();

  const saved = state.plans[planDate.value];
  if (saved) renderPlan(saved);
  else generateSelectedPlan({ announce: false });
}

initialize();

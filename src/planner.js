import {
  getCareerAction,
  getStudyAction,
  getWellbeingGuardrail,
} from "./catalog.js";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const FOCUS_WINDOWS = {
  morning: [7 * 60, 12 * 60],
  afternoon: [12 * 60, 17 * 60],
  evening: [17 * 60, 23 * 60],
};

export function parseTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value ?? "")) return Number.NaN;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

export function formatTime(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function durationLabel(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function weekdayForDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getDay();
}

export function validateProfile(profile) {
  const errors = [];
  const wake = parseTime(profile.wakeTime);
  const sleep = parseTime(profile.sleepTime);

  if (!profile.ageBand) errors.push("Choose an age band.");
  if (!profile.majorArea) errors.push("Choose a major area.");
  if (!profile.careerTrack) errors.push("Choose a career track.");
  if (!Number.isFinite(wake) || !Number.isFinite(sleep)) {
    errors.push("Enter valid wake and sleep times.");
  } else if (sleep <= wake) {
    errors.push("For this MVP, sleep time must be later than wake time on the same day.");
  }

  const leisure = Number(profile.leisureTarget);
  if (!Number.isFinite(leisure) || leisure < 30 || leisure > 180) {
    errors.push("Choose a leisure target between 30 and 180 minutes.");
  }

  return errors;
}

export function validateCommitment(candidate, existing = []) {
  const errors = [];
  const start = parseTime(candidate.start);
  const end = parseTime(candidate.end);

  if (!candidate.title?.trim()) errors.push("Give the commitment a title.");
  if (!Number.isInteger(Number(candidate.weekday)) || Number(candidate.weekday) < 0 || Number(candidate.weekday) > 6) {
    errors.push("Choose a valid weekday.");
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    errors.push("End time must be later than start time.");
    return errors;
  }

  const overlap = existing.some((item) => {
    if (String(item.id) === String(candidate.id)) return false;
    if (Number(item.weekday) !== Number(candidate.weekday)) return false;
    const itemStart = parseTime(item.start);
    const itemEnd = parseTime(item.end);
    return start < itemEnd && end > itemStart;
  });

  if (overlap) errors.push("This overlaps another commitment on the same day.");
  return errors;
}

export function calculateFreeWindows(dayStart, dayEnd, fixedBlocks) {
  const occupied = fixedBlocks
    .map((block) => ({
      start: Math.max(dayStart, block.startMinutes),
      end: Math.min(dayEnd, block.endMinutes),
    }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start);

  const windows = [];
  let cursor = dayStart;

  for (const block of occupied) {
    if (block.start > cursor) windows.push({ start: cursor, end: block.start });
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < dayEnd) windows.push({ start: cursor, end: dayEnd });
  return windows;
}

function overlapMinutes(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function rankWindow(window, candidate, focusPreference) {
  const duration = window.end - window.start;
  const [focusStart, focusEnd] = FOCUS_WINDOWS[focusPreference] ?? FOCUS_WINDOWS.morning;
  const focusOverlap = overlapMinutes(window.start, window.end, focusStart, focusEnd);

  if (candidate.preference === "focus") return focusOverlap * 1000 - window.start;
  if (candidate.preference === "late") return window.end * 1000 + duration;
  if (candidate.preference === "midday") {
    const center = (window.start + window.end) / 2;
    return -Math.abs(center - 15 * 60) * 1000 + duration;
  }
  return duration * 1000 - window.start;
}

function chooseStart(window, duration, candidate, focusPreference) {
  const [focusStart, focusEnd] = FOCUS_WINDOWS[focusPreference] ?? FOCUS_WINDOWS.morning;
  if (candidate.preference === "focus") {
    const earliest = Math.max(window.start, focusStart);
    if (earliest + duration <= Math.min(window.end, focusEnd)) return earliest;
  }
  if (candidate.preference === "late") return window.end - duration;
  if (candidate.preference === "midday") {
    const centered = 15 * 60 - Math.floor(duration / 2);
    return Math.max(window.start, Math.min(centered, window.end - duration));
  }
  return window.start;
}

function placeCandidate(windows, candidate, focusPreference) {
  const eligible = windows
    .map((window, index) => ({ window, index }))
    .filter(({ window }) => window.end - window.start >= candidate.minimumMinutes)
    .sort((a, b) => rankWindow(b.window, candidate, focusPreference) - rankWindow(a.window, candidate, focusPreference));

  if (!eligible.length) return null;

  const { window, index } = eligible[0];
  let duration = Math.min(candidate.preferredMinutes, window.end - window.start);
  const remainder = window.end - window.start - duration;
  if (remainder > 0 && remainder < 10) duration += remainder;
  const start = chooseStart(window, duration, candidate, focusPreference);
  const end = start + duration;
  const replacements = [];
  if (window.start < start) replacements.push({ start: window.start, end: start });
  if (end < window.end) replacements.push({ start: end, end: window.end });
  windows.splice(index, 1, ...replacements);

  return {
    id: candidate.id,
    startMinutes: start,
    endMinutes: end,
    category: candidate.category,
    title: candidate.title,
    reason: candidate.reason,
    fixed: false,
    completed: false,
  };
}

function makeFixedBlock(commitment) {
  return {
    id: `fixed-${commitment.id}`,
    startMinutes: parseTime(commitment.start),
    endMinutes: parseTime(commitment.end),
    category: commitment.type,
    title: commitment.title,
    reason: "A fixed commitment from your weekly schedule.",
    fixed: true,
    completed: false,
  };
}

function makeOpenBlock(dateString, window) {
  const duration = window.end - window.start;
  const isBreak = duration <= 30;
  return {
    id: `open-${dateString}-${window.start}-${window.end}`,
    startMinutes: window.start,
    endMinutes: window.end,
    category: isBreak ? "break" : "free",
    title: isBreak ? "Break and transition" : "Free time",
    reason: isBreak
      ? "A short buffer so your plan can breathe."
      : "Intentionally unassigned time for rest, errands, friends, or spontaneity.",
    fixed: false,
    completed: false,
  };
}

export function generateDailyPlan(profile, commitments, dateString) {
  const profileErrors = validateProfile(profile);
  if (profileErrors.length) throw new Error(profileErrors.join(" "));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) throw new Error("Choose a valid plan date.");

  const weekday = weekdayForDate(dateString);
  const dayCommitments = commitments
    .filter((item) => Number(item.weekday) === weekday)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));

  for (const commitment of dayCommitments) {
    const errors = validateCommitment(
      commitment,
      dayCommitments.filter((item) => String(item.id) !== String(commitment.id)),
    );
    if (errors.length) throw new Error(`${commitment.title || "Commitment"}: ${errors.join(" ")}`);
  }

  const wake = parseTime(profile.wakeTime);
  const sleep = parseTime(profile.sleepTime);
  const fixedBlocks = dayCommitments.map(makeFixedBlock);
  const warnings = [];

  const outsideDay = fixedBlocks.filter((block) => block.startMinutes < wake || block.endMinutes > sleep);
  if (outsideDay.length) {
    warnings.push(`${outsideDay.length} fixed commitment${outsideDay.length === 1 ? " is" : "s are"} outside your wake-to-sleep window and remain unchanged.`);
  }

  const guardrail = getWellbeingGuardrail(profile.ageBand);
  const requestedLeisure = Number(profile.leisureTarget);
  const effectiveLeisure = Math.max(requestedLeisure, guardrail.minimumLeisureMinutes);
  if (effectiveLeisure > requestedLeisure) {
    warnings.push(`Leisure was raised to the adjustable ${guardrail.label} wellbeing default of ${effectiveLeisure} minutes.`);
  }

  const careerAction = getCareerAction(profile.careerTrack, dateString, profile.careerGoal);
  const focusDuration = Math.min(75, guardrail.maxFocusMinutes);
  const candidates = [
    {
      id: `career-${dateString}`,
      category: "career",
      title: careerAction.title,
      reason: careerAction.reason,
      preferredMinutes: 45,
      minimumMinutes: 30,
      preference: "focus",
    },
    {
      id: `study-${dateString}`,
      category: "study",
      title: getStudyAction(profile.majorArea),
      reason: profile.major?.trim()
        ? `A focused learning block for ${profile.major.trim()}.`
        : "A focused block for your most important course task.",
      preferredMinutes: focusDuration,
      minimumMinutes: 45,
      preference: "focus",
    },
    {
      id: `wellness-${dateString}`,
      category: "wellness",
      title: "Move, eat, or reset",
      reason: "Protect a little capacity before adding more work.",
      preferredMinutes: 30,
      minimumMinutes: 20,
      preference: "midday",
    },
    {
      id: `fun-${dateString}`,
      category: "fun",
      title: "Fun on purpose",
      reason: "Time reserved for something enjoyable, social, or restorative.",
      preferredMinutes: effectiveLeisure,
      minimumMinutes: Math.min(30, effectiveLeisure),
      preference: "late",
    },
  ];

  const windows = calculateFreeWindows(wake, sleep, fixedBlocks);
  const generated = [];
  const unscheduled = [];

  for (const candidate of candidates) {
    const block = placeCandidate(windows, candidate, profile.focusPreference);
    if (block) generated.push(block);
    else {
      unscheduled.push({
        category: candidate.category,
        title: candidate.title,
        neededMinutes: candidate.minimumMinutes,
      });
    }
  }

  if (unscheduled.length) {
    warnings.push("The day is crowded, so some priorities are listed as unscheduled instead of being forced into an overlap.");
  }

  const openBlocks = windows.filter((window) => window.end > window.start).map((window) => makeOpenBlock(dateString, window));
  const blocks = [...fixedBlocks, ...generated, ...openBlocks].sort(
    (a, b) => a.startMinutes - b.startMinutes || Number(b.fixed) - Number(a.fixed),
  );

  return {
    date: dateString,
    weekday,
    weekdayLabel: DAY_NAMES[weekday],
    blocks,
    careerAction,
    warnings,
    unscheduled,
    generatedAt: new Date().toISOString(),
  };
}

export async function enhancePlanExplanation(plan) {
  return plan;
}

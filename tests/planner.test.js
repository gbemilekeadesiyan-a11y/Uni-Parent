import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFreeWindows,
  formatTime,
  generateDailyPlan,
  parseTime,
  validateCommitment,
} from "../src/planner.js";
import { CAREER_TRACKS, getCareerAction, getStudyAction, getWellbeingGuardrail } from "../src/catalog.js";

const profile = {
  ageBand: "18to24",
  majorArea: "quantitative",
  major: "Computer Science",
  careerTrack: "data-ai",
  careerGoal: "becoming a data analyst",
  wakeTime: "07:30",
  sleepTime: "23:00",
  focusPreference: "morning",
  leisureTarget: 60,
};

const commitments = [
  { id: "a", weekday: 2, start: "10:00", end: "11:30", title: "Algorithms", type: "class" },
  { id: "b", weekday: 2, start: "14:00", end: "15:15", title: "Statistics", type: "class" },
];

test("time helpers normalize and format common values", () => {
  assert.equal(parseTime("07:30"), 450);
  assert.equal(formatTime(450), "7:30 AM");
  assert.equal(formatTime(13 * 60 + 5), "1:05 PM");
  assert.ok(Number.isNaN(parseTime("25:00")));
});

test("free-window calculation subtracts fixed commitments", () => {
  const windows = calculateFreeWindows(480, 1080, [
    { startMinutes: 600, endMinutes: 660 },
    { startMinutes: 720, endMinutes: 780 },
  ]);
  assert.deepEqual(windows, [
    { start: 480, end: 600 },
    { start: 660, end: 720 },
    { start: 780, end: 1080 },
  ]);
});

test("commitment validation rejects overlaps", () => {
  const candidate = { id: "c", weekday: 2, start: "11:00", end: "12:00", title: "Lab", type: "class" };
  assert.match(validateCommitment(candidate, commitments).join(" "), /overlaps/i);
});

test("normal class day preserves commitments and balances the plan", () => {
  const plan = generateDailyPlan(profile, commitments, "2026-09-08");
  const fixed = plan.blocks.filter((block) => block.fixed);
  const generated = plan.blocks.filter((block) => !block.fixed && !["free", "break"].includes(block.category));

  assert.equal(fixed.length, 2);
  assert.deepEqual(fixed.map((block) => block.title), ["Algorithms", "Statistics"]);
  for (const category of ["study", "career", "wellness", "fun"]) {
    assert.ok(generated.some((block) => block.category === category), `missing ${category}`);
  }
  for (let index = 1; index < plan.blocks.length; index += 1) {
    assert.ok(plan.blocks[index - 1].endMinutes <= plan.blocks[index].startMinutes);
  }
});

test("generated blocks stay inside the wake-to-sleep window", () => {
  const plan = generateDailyPlan(profile, commitments, "2026-09-08");
  const wake = parseTime(profile.wakeTime);
  const sleep = parseTime(profile.sleepTime);
  for (const block of plan.blocks.filter((item) => !item.fixed)) {
    assert.ok(block.startMinutes >= wake);
    assert.ok(block.endMinutes <= sleep);
  }
});

test("overloaded day reports unscheduled priorities without overlap", () => {
  const busy = [
    { id: "busy", weekday: 2, start: "08:00", end: "22:30", title: "Placement shift", type: "work" },
  ];
  const plan = generateDailyPlan(profile, busy, "2026-09-08");
  assert.ok(plan.unscheduled.length >= 2);
  assert.match(plan.warnings.join(" "), /crowded/i);
  assert.equal(plan.blocks.filter((block) => block.fixed).length, 1);
  for (let index = 1; index < plan.blocks.length; index += 1) {
    assert.ok(plan.blocks[index - 1].endMinutes <= plan.blocks[index].startMinutes);
  }
});

test("age adjusts wellbeing defaults without changing career choices", () => {
  assert.ok(getWellbeingGuardrail("under18").minimumLeisureMinutes > getWellbeingGuardrail("25plus").minimumLeisureMinutes);
  const date = "2026-09-08";
  assert.deepEqual(
    getCareerAction("software-engineering", date, "frontend engineering"),
    getCareerAction("software-engineering", date, "frontend engineering"),
  );
  assert.equal(CAREER_TRACKS.length, 6);
});

test("unknown major and career values receive general recommendations", () => {
  assert.match(getStudyAction("not-a-real-area"), /Review your notes/i);
  assert.equal(getCareerAction("not-a-real-track", "2026-09-08").track, "undecided-other");
});

test("plan generation is deterministic apart from its timestamp", () => {
  const first = generateDailyPlan(profile, commitments, "2026-09-08");
  const second = generateDailyPlan(profile, commitments, "2026-09-08");
  delete first.generatedAt;
  delete second.generatedAt;
  assert.deepEqual(first, second);
});

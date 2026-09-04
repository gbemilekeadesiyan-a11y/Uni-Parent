const STORAGE_KEY = "uni-parent:v1";

export const SAMPLE_PROFILE = {
  ageBand: "18to24",
  majorArea: "quantitative",
  major: "Computer Science",
  careerTrack: "data-ai",
  careerGoal: "become a data analyst who builds useful education tools",
  wakeTime: "07:30",
  sleepTime: "23:00",
  focusPreference: "morning",
  leisureTarget: 60,
};

export const SAMPLE_COMMITMENTS = [
  { id: "sample-mon-1", weekday: 1, start: "09:00", end: "10:15", title: "Data Structures", type: "class" },
  { id: "sample-mon-2", weekday: 1, start: "13:00", end: "14:15", title: "Statistics", type: "class" },
  { id: "sample-tue-1", weekday: 2, start: "10:00", end: "11:30", title: "Algorithms", type: "class" },
  { id: "sample-tue-2", weekday: 2, start: "14:00", end: "15:15", title: "Statistics Lab", type: "class" },
  { id: "sample-wed-1", weekday: 3, start: "09:00", end: "10:15", title: "Data Structures", type: "class" },
  { id: "sample-wed-2", weekday: 3, start: "12:00", end: "14:00", title: "Library shift", type: "work" },
  { id: "sample-thu-1", weekday: 4, start: "10:00", end: "11:30", title: "Algorithms", type: "class" },
  { id: "sample-fri-1", weekday: 5, start: "10:00", end: "11:15", title: "Career seminar", type: "class" },
  { id: "sample-fri-2", weekday: 5, start: "15:00", end: "16:00", title: "Study group", type: "responsibility" },
];

export function createSampleState() {
  return {
    profile: { ...SAMPLE_PROFILE },
    commitments: SAMPLE_COMMITMENTS.map((item) => ({ ...item })),
    plans: {},
  };
}

export function createBlankState() {
  return {
    profile: {
      ageBand: "18to24",
      majorArea: "general",
      major: "",
      careerTrack: "undecided-other",
      careerGoal: "",
      wakeTime: "08:00",
      sleepTime: "23:00",
      focusPreference: "morning",
      leisureTarget: 60,
    },
    commitments: [],
    plans: {},
  };
}

export function loadAppState() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function saveAppState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearAppState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The in-memory reset still works when storage is unavailable.
  }
}

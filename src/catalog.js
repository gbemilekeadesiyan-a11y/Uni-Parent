export const CAREER_TRACKS = [
  { value: "software-engineering", label: "Software Engineering" },
  { value: "data-ai", label: "Data and AI" },
  { value: "business-product", label: "Business and Product" },
  { value: "healthcare", label: "Healthcare" },
  { value: "creative-media", label: "Creative and Media" },
  { value: "undecided-other", label: "Undecided or Other" },
];

export const MAJOR_AREAS = [
  { value: "quantitative", label: "STEM and quantitative" },
  { value: "reading-writing", label: "Humanities and social sciences" },
  { value: "business", label: "Business and economics" },
  { value: "clinical", label: "Health and clinical" },
  { value: "creative", label: "Arts and creative practice" },
  { value: "general", label: "Other or undecided" },
];

const CAREER_ACTIONS = {
  "software-engineering": [
    "Build one small portfolio feature",
    "Solve one coding problem and explain the tradeoffs",
    "Improve a project README or demo",
    "Read one engineering job description and note three skill gaps",
    "Refactor one function and add a focused test",
    "Message one engineer or alumnus with a specific question",
    "Write a short technical learning note",
  ],
  "data-ai": [
    "Analyze one dataset question and record the finding",
    "Practice one SQL or statistics exercise",
    "Improve one chart or model explanation",
    "Read one data role description and note three skill gaps",
    "Clean and document one small dataset",
    "Message one data professional or alumnus with a specific question",
    "Summarize one model, metric, or experiment in plain language",
  ],
  "business-product": [
    "Write a one-page product or business problem brief",
    "Analyze one company decision using evidence",
    "Practice one case or prioritization exercise",
    "Read one target role description and note three skill gaps",
    "Interview one potential user or draft five interview questions",
    "Message one product or business professional with a specific question",
    "Turn one class concept into a portfolio-ready example",
  ],
  healthcare: [
    "Review one clinical or scientific concept with active recall",
    "Practice one scenario and explain the reasoning",
    "Update one experience entry for a resume or application",
    "Read one target role description and note three preparation gaps",
    "Research one training, licensing, or placement requirement",
    "Message one healthcare professional or alumnus with a specific question",
    "Write a short reflection on one patient, research, or ethics topic",
  ],
  "creative-media": [
    "Create or refine one portfolio artifact",
    "Study one strong reference and record three techniques",
    "Draft one concept, storyboard, or creative brief",
    "Read one target role description and note three portfolio gaps",
    "Publish or package one small piece of work",
    "Message one creative professional or alumnus with a specific question",
    "Write a short critique of your latest work",
  ],
  "undecided-other": [
    "Compare two possible roles using skills, tasks, and values",
    "Complete one short career-interest reflection",
    "Find one project that tests a possible career direction",
    "Read one interesting role description and note three questions",
    "List five transferable skills from classes or activities",
    "Message one alumnus about what their workday is actually like",
    "Write a one-paragraph hypothesis about your next career experiment",
  ],
};

const STUDY_ACTIONS = {
  quantitative: "Practice a problem set, then review the errors",
  "reading-writing": "Read actively, then write a short synthesis",
  business: "Apply one class framework to a concrete example",
  clinical: "Review one concept using active recall and a scenario",
  creative: "Advance one critique, practice, or studio deliverable",
  general: "Review your notes and advance the next assignment",
};

export const AGE_GUARDRAILS = {
  under18: {
    label: "Under 18",
    maxFocusMinutes: 75,
    minimumLeisureMinutes: 90,
  },
  "18to24": {
    label: "18–24",
    maxFocusMinutes: 90,
    minimumLeisureMinutes: 60,
  },
  "25plus": {
    label: "25+",
    maxFocusMinutes: 90,
    minimumLeisureMinutes: 45,
  },
};

export function getWellbeingGuardrail(ageBand) {
  return AGE_GUARDRAILS[ageBand] ?? AGE_GUARDRAILS["18to24"];
}

export function getStudyAction(majorArea) {
  return STUDY_ACTIONS[majorArea] ?? STUDY_ACTIONS.general;
}

function dateIndex(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function getCareerAction(track, dateString, careerGoal = "") {
  const safeTrack = CAREER_ACTIONS[track] ? track : "undecided-other";
  const actions = CAREER_ACTIONS[safeTrack];
  const title = actions[Math.abs(dateIndex(dateString)) % actions.length];
  const goal = careerGoal.trim();

  return {
    title,
    track: safeTrack,
    reason: goal
      ? `This is a small, concrete step toward ${goal}.`
      : "This is a small career experiment you can complete today.",
  };
}

export function careerTrackLabel(value) {
  return CAREER_TRACKS.find((track) => track.value === value)?.label ?? "Undecided or Other";
}

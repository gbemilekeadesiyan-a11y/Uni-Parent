# Uni Parent

Uni Parent is a small, privacy-friendly web app that turns a university student's goals and fixed commitments into a balanced daily agenda. It protects classes and work, places focused tasks near the student's preferred energy period, adds one concrete career step, and leaves open time genuinely open.

The MVP is deterministic and runs entirely in the browser. It has no account, backend, API key, tracking, or downloaded runtime dependency.

## Run the demo

Requirements:

- A modern browser.
- Python 3 to serve JavaScript modules locally.
- Node.js 20 or newer only if you want to run the automated tests.

From this folder, run:

```powershell
npm start
```

Then open [http://localhost:4173](http://localhost:4173). Press `Ctrl+C` in the terminal to stop the server.

The first visit loads a sample Computer Science student so the Today screen is immediately usable. Use **Profile** to change the student's context and **Schedule** to add repeating class, work, or responsibility blocks.

## Verify the planner

Run the dependency-free Node test suite:

```powershell
npm test
```

The tests verify time normalization, free-window calculation, overlap rejection, fixed-commitment preservation, balanced activity allocation, overloaded-day behavior, age-policy boundaries, fallback recommendations, and deterministic output.

Manual acceptance check:

1. Open **Today** and confirm the sample profile has a dated timeline and one career action.
2. Open **Schedule**, select Friday, and try to add a block from 10:30 AM to 11:45 AM. Confirm the overlap is rejected.
3. Add a valid block, rebuild the day, and confirm that fixed commitments remain unchanged.
4. Mark a timeline item complete and refresh the browser. Confirm the completion remains saved.
5. Resize the browser to a phone-sized width and confirm the header, forms, summary cards, and timeline remain readable without horizontal scrolling.

## How the system works

The application has four small layers:

- `index.html` and `styles.css` provide the three-view responsive interface: Profile, Schedule, and Today.
- `src/app.js` manages form interactions, rendering, navigation, completion tracking, and regeneration.
- `src/planner.js` is a pure scheduling engine. It validates inputs, subtracts fixed commitments from the waking day, places candidate activities, and turns the remaining gaps into breaks or free time.
- `src/catalog.js` contains career tracks, rotating career actions, major-aware study prompts, and adjustable wellbeing defaults. `src/storage.js` stores the profile, commitments, plans, and completion state in browser `localStorage`.

The main domain function is:

```js
generateDailyPlan(profile, commitments, date) // returns DailyPlan
```

Its result contains an ordered list of fixed and generated blocks, the day's career action, warnings, and any priorities that could not fit. When the day is crowded, the planner reports unscheduled work instead of forcing an overlap.

Age bands only select transparent wellbeing defaults. They never remove career tracks or determine a student's capability. Major area changes the study-task wording, not the amount of work a student is presumed to handle.

## Data and privacy

All information stays in the current browser's `localStorage`. Clearing site data removes it. The app does not send profile, schedule, age-band, major, or career information to another service.

The recommendations are planning suggestions, not medical, academic, or professional guarantees. Sleep and leisure values are editable product defaults rather than clinical guidance.

## Current limitations

- Wake and sleep times must fall within the same calendar day; overnight schedules are not supported yet.
- Schedules are entered manually and repeat by weekday.
- There are no accounts, cloud synchronization, notifications, calendar imports, or mobile applications.
- The career catalog is intentionally small and rule-based.

The reserved `enhancePlanExplanation(plan, profile)` adapter allows a future AI service to improve explanations without replacing the deterministic schedule. Other natural extensions include calendar import, weekly planning, adaptive feedback, cloud synchronization, and a larger reviewed career catalog.

## Collaborating

After cloning the repository, a collaborator can run `npm start` and `npm test` without installing packages. Work on a feature branch and open a pull request back to `main` so planner behavior and documentation changes can be reviewed together.

The detailed system design and verification record are also available in `docs/Uni Parent System Design.docx`.

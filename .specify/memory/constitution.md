<!--
Sync Impact Report
Version change: none → 1.0.0 (initial ratification)
Modified principles: n/a (initial set)
Added sections: Core Principles (I–V), Technology & Scope Constraints, Development Workflow, Governance
Removed sections: none
Templates requiring updates: .specify/templates/plan-template.md (✅ generic, no change needed),
  .specify/templates/spec-template.md (✅ generic), .specify/templates/tasks-template.md (✅ generic)
Follow-up TODOs: none
-->

# Timer Plus Web Constitution

## Core Principles

### I. Static-First / No-Backend
The application MUST run entirely as static assets (HTML/CSS/JS) served without a
server-side runtime or database. All state — workout templates, settings, session
history — MUST be persisted client-side only, using `localStorage`, cookies, or
URL query parameters that update automatically as state changes. No feature MAY
introduce a requirement for a backend API, server-rendered page, or external
database. Rationale: the product is a personal utility PWA; a no-backend
architecture keeps it free to host, trivial to deploy, and fully usable offline.

### II. Timer Accuracy (NON-NEGOTIABLE)
All countdowns and stopwatches MUST compute elapsed/remaining time from real
timestamps (`Date.now()` or `performance.now()`) captured at phase-start,
recalculating on every tick and on every resume-from-background event. Naive
accumulation (e.g., decrementing a counter once per `setInterval` callback)
is PROHIBITED because throttled timers and backgrounded tabs cause drift.
Resuming the app (tab refocus, PWA relaunch, wake from lock screen) MUST
reconcile displayed time against the true elapsed duration, not the last
rendered value. Rationale: a workout timer that drifts under real usage
conditions (phone locked, app backgrounded) is the single most damaging
defect this product can ship.

### III. PWA Resilience
The app MUST ship a valid web app manifest and a service worker enabling
installation and offline use of previously loaded assets. During an active
session, the app MUST request a Screen Wake Lock where supported, and MUST
degrade gracefully (no crash, no blocking error) when a browser lacks Wake
Lock, Vibration, Notification, or any other progressive-enhancement API —
the core timer MUST keep functioning without them. Rationale: users start a
workout and put the phone down; the experience must survive screen locks,
backgrounding, and the wide variance of mobile browser capabilities.

### IV. Mobile-First & Accessible UI
Every screen MUST be designed first for touch input and for at-a-glance
readability during physical activity: large tap targets, large countdown
digits, high-contrast phase colors, and full support for both portrait and
landscape orientations. UI MUST be built with TailwindCSS utility classes
plus at least one established, open-source JavaScript library for reactive
state/UI (e.g., Alpine.js or equivalent) rather than hand-rolled DOM
bookkeeping. Rationale: this is a gym-floor tool, not a desk tool — it must
be legible and operable without focused attention, on whatever device and
orientation the user holds.

### V. Simplicity & YAGNI
Prefer the simplest implementation that satisfies the above principles. No
build pipeline, bundler, framework, or dependency MAY be introduced unless
it is necessary to meet a principle above or an explicit spec requirement.
Every feature MUST remain manually testable directly in a browser (open the
file/served page, interact, observe) without requiring a test harness to
understand correctness. Rationale: a small static app over-engineered with
tooling becomes harder to maintain than the problem it solves.

## Technology & Scope Constraints

- Stack: HTML, CSS (TailwindCSS), vanilla/lightly-assisted JavaScript. No
  server-side language or framework.
- Persistence: `localStorage` for durable data (workout templates, settings,
  history); URL query parameters for shareable/bookmarkable session state,
  kept in sync automatically as the user changes configuration.
- No user accounts, no network sync, no analytics requiring a backend.
- No native hardware integrations unavailable to a standard web browser
  (e.g., no Apple HealthKit/heart-rate dependency); any hardware feature
  used (Vibration, Wake Lock, Notifications) MUST be optional/progressive.

## Development Workflow

- Features proceed through the Spec Kit flow: specify → clarify → plan →
  tasks → implement, before Spec Kit-based implementation.
- Each spec/plan MUST state how it upholds Timer Accuracy (Principle II) and
  PWA Resilience (Principle III) when touching timer or lifecycle logic.
- Manual verification in at least one desktop and one mobile browser is
  required before a feature is considered done, given the absence of a
  mandated automated test harness (Principle V).

## Governance

This constitution supersedes ad-hoc practice for this project. Amendments
require: (1) a documented rationale for the change, (2) a version bump per
semantic versioning (MAJOR for incompatible principle removal/redefinition,
MINOR for new/materially expanded principles or sections, PATCH for wording
or clarification), and (3) an update to the Sync Impact Report at the top of
this file. All specs and plans MUST be checked against these principles
before implementation; unjustified complexity or backend dependencies MUST
be rejected or reworked.

**Version**: 1.0.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28

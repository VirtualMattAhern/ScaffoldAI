# SkafoldAI — V3 & Future Feature Ideas

**Last updated:** 2026-03-22 UTC  

**Master backlog:** [FEATURE_TRACKER.md](../FEATURE_TRACKER.md) §2 — every pending item with **target release** (V2 / V2.1 / V3), **priority** (P0–P3), and **suggested order** for sprint grouping.

Ideas beyond current V2 delivery. Classifications below are **conceptual**; execution order follows the tracker.

---

## Neurodivergent-First Features

These features lean into SkafoldAI's unique positioning as a tool built *for* neurodivergent thinkers, not adapted for them after the fact.

### 1. Body Doubling Mode
**What:** Virtual body doubling — a persistent "working alongside you" presence. The AI companion stays visible while you work, periodically checking in ("Still going? You're 12 minutes in.") without demanding attention.

**Why it matters:** Body doubling is one of the most effective ADHD productivity strategies. No mainstream productivity app offers this.

**Classification:** **Backlog to V2** — High differentiation, moderate build effort (timer + periodic AI prompt + minimal UI).

---

### 2. Energy / Spoon Tracker
**What:** Optional daily energy check-in (1–5 scale or emoji) at start of day. AI adjusts Top 3 difficulty: low energy → suggest easier tasks first; high energy → suggest hardest task first.

**Why it matters:** Energy fluctuation is central to ADHD and autism. Static task priority ignores this reality. No competitor adapts to energy levels.

**Classification:** **Backlog to V2** — Requires simple UI (5-point scale) + AI prompt modification. High impact for target audience.

---

### 3. Transition Prompts
**What:** When finishing a task, instead of just "Done" → back to list, show a brief transition: "Great work. Take a breath. Ready for the next one?" with a 10-second pause before showing the next task.

**Why it matters:** Task switching is a major friction point for neurodivergent users. Abrupt transitions cause cognitive whiplash. A brief buffer helps.

**Classification:** **Add to V1** — Tiny scope (a modal or inline message after Done), high UX impact.

---

### 4. "Not Today" Button
**What:** On Daily Rule of 3, add a "Not today" option per task. Moves the task back to the weekly pool and asks AI to suggest a replacement. No shame language.

**Why it matters:** Rigid task lists create anxiety. Letting users swap tasks without guilt aligns with neurodivergent-friendly design. Different from Pause (which implies returning to it).

**Classification:** **Add to V1** — Small scope (button + API call to remove from Top 3 and re-suggest). High user satisfaction.

---

### 5. Sensory-Friendly Themes
**What:** Beyond high contrast and dark mode, offer curated themes designed for sensory sensitivities: "Calm" (muted earth tones, no sharp borders), "Focus" (minimal color, high whitespace), "Warm" (amber tones, reduced blue light).

**Why it matters:** Sensory processing differences are common across ADHD, autism, and anxiety. Generic dark/light mode doesn't address this. Unique market positioning.

**Classification:** **Backlog to V2** — CSS theme work. Medium effort, strong marketing appeal ("the only productivity app with sensory-friendly themes").

---

### 6. Celebration Moments
**What:** When all 3 daily tasks are done, show a brief, optional celebration (confetti, encouraging message, streak counter). Keep it subtle and dismissible — not a gamification trap.

**Why it matters:** Dopamine-seeking brains benefit from small rewards. But over-gamification backfires. The key is tasteful, opt-in celebration.

**Classification:** **Backlog to V2** — Small scope. Pair with reduce-motion setting (no animation when reduce motion is on).

---

### 7. "What Did I Do?" Weekly Wins
**What:** Auto-generated end-of-week summary of completed tasks, decisions made, and playbooks used. Framed as wins, not metrics. "This week you completed 8 tasks, made 3 decisions, and used 2 playbooks."

**Why it matters:** Neurodivergent users often underestimate their output. A wins summary combats "I did nothing" feeling. Also useful for reporting to stakeholders.

**Classification:** **Backlog to V2** — Requires aggregation query + AI summary. Medium effort, high retention value.

---

## Marketing & Differentiation Features

### 8. Shareable Playbooks
**What:** Export a playbook as a shareable link or template. Other SkafoldAI users can import it. Creates a "playbook marketplace" potential.

**Why it matters:** Viral loop — users share what works. Also positions SkafoldAI as a knowledge-sharing platform, not just a task manager.

**Classification:** **Future Release** — Requires public playbook format, import/export, and moderation considerations.

---

### 9. "Scaffolding Score"
**What:** A personal metric that shows how much the app is helping: % of tasks that went through AI Convert, % of decisions made via Decision Helper, playbook reuse rate. Not a productivity score — a *scaffolding usage* score.

**Why it matters:** Shows users the value of the AI layer. Marketing hook: "SkafoldAI saved you 3 hours of planning this month."

**Classification:** **Future Release** — Requires analytics infrastructure and careful framing (must not feel punitive).

---

### 10. Onboarding for Specific Personas
**What:** During onboarding, ask "What best describes you?" with options like: Small business owner, Freelancer, Creative professional, Student, Caregiver. Customize starter playbooks, helper tone, and example content per persona.

**Why it matters:** Generic onboarding loses users. Persona-specific content makes the app feel built for *them*. Strong marketing angle for each segment.

**Classification:** **Backlog to V2** — Moderate effort (persona-specific content, AI prompt variations). High conversion impact.

---

### 11. Mobile-First PWA
**What:** Progressive Web App with install prompt, offline support, and mobile-optimized layouts. Push notifications for daily planning reminder and timebox alerts.

**Why it matters:** Many target users are mobile-first. A PWA avoids app store friction while delivering a native-like experience.

**Classification:** **Backlog to V2** — Significant effort but critical for reach. Already noted in V2 roadmap.

---

## Application Hardening

### 12. End-to-End Testing
**What:** Playwright or Cypress tests for critical flows: onboarding, brain dump → convert, daily rule of 3, guided mode, decision helper. Run in CI on every push.

**Why it matters:** Manual testing doesn't scale. Regressions in AI flows are hard to catch without automated tests.

**Classification:** **Add to V1** — Should be in place before production launch. High priority.

---

### 13. Error Boundaries & Graceful Degradation
**What:** React error boundaries on each screen. If AI fails, show helpful fallback instead of blank screen. If database is unreachable, queue actions locally and sync later.

**Why it matters:** Users on poor connections or during Azure outages need a functional experience. Crashes destroy trust.

**Classification:** **Add to V1** — React error boundaries are low effort. Full offline queue is V2/Future.

---

### 14. Rate Limiting & Abuse Prevention
**What:** Per-user rate limits on AI calls (e.g., 50 AI calls/day). Queue excess requests. Admin dashboard for monitoring.

**Why it matters:** Azure OpenAI has token costs and rate limits. Without app-level limits, a single user could exhaust quota.

**Classification:** **Backlog to V2** — Medium effort. Important before scaling beyond friendly testers.

---

### 15. Data Backup & Recovery
**What:** Automated daily backup of Azure SQL to Blob Storage. User-facing "Export my data" button (GDPR compliance).

**Why it matters:** Data loss is catastrophic for trust. Export supports GDPR and user autonomy.

**Classification:** **Backlog to V2** — Azure SQL has built-in backup; user export requires API work.

---

### 16. Security Audit
**What:** Review all API endpoints for: SQL injection (parameterized queries ✅), XSS (React handles ✅), CSRF, auth bypass, token expiration, CORS misconfiguration. Penetration testing before public launch.

**Why it matters:** Production app handling user data must be secure.

**Classification:** **Add to V1** — Security review before production. Pen testing can be V2.

---

### 17. Observability & Alerting
**What:** Application Insights integration: request tracing, error rates, AI latency, database query times. Alerts on: error rate > 5%, AI latency > 5s, database connection failures.

**Why it matters:** You can't fix what you can't see. Critical for production operations.

**Classification:** **Add to V1** — Application Insights already exists in Azure (skafoldai-insights). Wire it into the API.

---

### 18. Content Security Policy (CSP)
**What:** Strict CSP headers on the frontend and API. Prevent XSS, clickjacking, and unauthorized script injection.

**Why it matters:** Defense-in-depth for a production web app.

**Classification:** **Add to V1** — Low effort, high security value.

---

## Classification Summary (updated vs tracker)

Many items originally tagged **Add to V1** are **already shipped** (e.g. transition prompts, Not Today, error boundaries). **Near-term gaps** (email verification, rate limits, CSP, full E2E) are **V2.1** in [FEATURE_TRACKER.md](../FEATURE_TRACKER.md) (rows P-A*, P-G1).

### Shipped since this doc was first written (non-exhaustive)

| # | Feature | Notes |
|---|---------|--------|
| 3 | Transition Prompts | ✅ V1 |
| 4 | Not Today | ✅ V1 |
| 13 | Error boundaries | ✅ V1 |
| 11 | PWA baseline | ✅ V2 (vite-plugin-pwa); deep offline still V3 |
| 2 | Energy / spoon-style input | Partially covered by **energy-aware AI** (V2); full tracker TBD |

### Still aligned with V2 / V2.1 (see tracker §2)

| # | Feature | Effort | Tracker |
|---|---------|--------|---------|
| 12 | End-to-End Testing | Medium | P-G1 |
| 14 | Rate Limiting & Abuse Prevention | Medium | P-A2 |
| 16 | Security review / hardening | Medium | P-A3 + audits |
| 17 | Observability & Alerting | Small | P-E7 / ops |
| 18 | Content Security Policy | Small | P-A3 |

### V3+ differentiation (future release)

| # | Feature | Effort | Tracker |
|---|---------|--------|---------|
| 1 | Body Doubling Mode | Medium | P-F1 |
| 5 | Sensory-Friendly Themes | Medium | P-F2 |
| 6 | Celebration Moments | Small | P-F3 |
| 7 | "What Did I Do?" Weekly Wins | Medium | P-D1 (overlap V2) |
| 10 | Onboarding for Specific Personas | Medium | P-F4 |
| 15 | Data Backup & Recovery | Medium | P-E5 |
| 8 | Shareable Playbooks | Large | P-F5 |
| 9 | Scaffolding Score | Large | P-F6 |

### Process (V3 / V4)

| Item | Notes |
|------|--------|
| Dev vs prod environments | [FEATURE_TRACKER.md](../FEATURE_TRACKER.md) P-G2 — all dev/test on staging before `main` |

---

## V3 pending at a glance

| Theme | Examples | Typical priority |
|-------|----------|-------------------|
| **Scale** | Multi-tenancy, offline sync, export, Redis | P2 |
| **Differentiation** | Body doubling, sensory themes, personas, shareable playbooks | P2–P3 |
| **Trust** | Backups, deeper security review | P2 |

Full rows: **FEATURE_TRACKER.md §2** (columns: target release, value, P0–P3, suggested order).

## Current V3 progress

| Item | Status | Notes |
|------|--------|-------|
| **P-E1** Task dependencies + recurring tasks | 🚧 In progress | First slice is built: dependency fields, recurrence metadata, blocked-task filtering for Top 3, recurring rollover on completion, and Weekly UI controls. Still needs deeper scheduling rules and broader UX polish. |

---

*Reference: [V1_ScaffoldAI_Features.md](../V1%20Design/V1_ScaffoldAI_Features.md) · [V2_ScaffoldAI_Features.md](../V2%20Design/V2_ScaffoldAI_Features.md) · [FEATURE_TRACKER.md](../FEATURE_TRACKER.md)*

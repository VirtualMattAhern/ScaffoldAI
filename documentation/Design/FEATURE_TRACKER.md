# Skafold (SkafoldAI) — Feature tracker

**Last updated:** 2026-03-20 UTC  

Single place to see **what’s shipped**, **what’s next**, and **how we’ve grouped work**. Detail lives in [V1](V1%20Design/V1_ScaffoldAI_Features.md), [V2](V2%20Design/V2_ScaffoldAI_Features.md), and [V3 / future](V3%20Design/V3_ScaffoldAI_Future_Features.md).

---

## 1. Completed features (consolidated)

_All items below are implemented in the product unless noted as “docs/ops only.”_

### V1 — Core product

| ID | Feature | Source |
|----|---------|--------|
| C01 | Landing, onboarding (multi-step), Monthly / Weekly / Daily | V1 |
| C02 | Guided Mode (timer, sub-steps, AI guidance, pause/done transitions) | V1 |
| C03 | Decision Helper (3-option AI, history) | V1 |
| C04 | Settings: high contrast, font size, dyslexia font | V1 |
| C05 | Email login (create / lookup user by email) | V1 |
| C06 | Microsoft Entra (MSAL + API JWT validation) | V1 |
| C07 | Brain dump → AI convert, AI Top 3, focus sentence, daily helper, sub-step AI, decision AI, playbook AI suggest | V1 |
| C08 | SQLite dev + Azure SQL prod, REST API, error boundaries | V1 |
| C09 | Rule of 3, Not Today, undo toast, transition prompts, empty/loading states | V1 |
| C10 | Horizon nav, quick-add weekly, playbook CRUD, task filters (API + UI) | V1 |
| C11 | AI-suggested playbooks from patterns | V1 |
| C12 | `last_used_at` on playbook open | V2 2A |

### V2 — Shipped themes

| ID | Feature | Source |
|----|---------|--------|
| C20 | Reduce motion setting (WCAG) | V2 2A |
| C21 | Focus mode (Daily) | V2 2A |
| C22 | Tooltips on task metadata | V2 2A |
| C23 | Task chat (“Need more help?” / in-context) | V2 2B |
| C24 | Editable Guided Mode sub-steps | V2 2B |
| C25 | Energy-aware AI suggestions | V2 2B |
| C26 | Dark mode (settings + theme) | V2 2C |
| C27 | Bulk actions (multi-select → Done / Pause) | V2 2C |
| C28 | ARIA / screen reader improvements | V2 2C |
| C29 | PWA (vite-plugin-pwa, manifest, SW) | V2 2D |
| C30 | Basic API health / test hook (as documented in V2) | V2 2D |
| C31 | Smart re-prioritization after pause / Not today | V2 closeout |
| C32 | Drag-and-drop / manual reorder for Daily Top 3 and playbook steps | V2 closeout |
| C33 | Task color-coding + inline task editing | V2 closeout |
| C34 | Quick-add everywhere (global FAB composer) | V2 closeout |
| C35 | AI weekly review / wins summary | V2 closeout |
| C36 | AI playbook refinement | V2 closeout |
| C37 | Voice input for brain dump | V2 closeout |

### Ops, release & branding (added outside original MDs)

| ID | Feature | Notes |
|----|---------|--------|
| X01 | GitHub Actions → Azure Container Apps (API + Web) | `AZURE_CREDENTIALS` + ACR build/deploy |
| X02 | Custom domains + certs (www / api) | Per deployment checklist |
| X03 | Landing UX overhaul | Plus Jakarta Sans; sky palette; logo **only** on landing; **icon** favicon + PWA |
| X04 | Sign-in positioning | Email-first; Microsoft under **Team / work**; Google / Apple UI placeholders (“coming soon”) |
| X05 | `documentation/SIGN_IN_AND_BRANDING.md` | Sign-in strategy + future OAuth notes |
| X06 | Signed email session tokens + legacy-session migration | Removed normal API reliance on `X-User-Id`; existing local users can migrate cleanly |
| X07 | API/global AI rate limiting + security headers + web CSP | V2 closeout hardening |

---

## 2. Pre-Launch pending (PL)

These are **not required to call V2 feature-complete**. They matter when you set a real launch date for outside users.

| ID | Feature | Why it is PL | What is still needed |
|----|---------|--------------|----------------------|
| **PL-A1** | Verify email / magic link (or OTP) for email sign-in | Important for public users, but not needed while you are the only user and launch timing is unknown | **Foundation shipped:** signed session tokens and legacy migration are live. Still needs actual email delivery provider, verification codes/links, resend/expiry UX, and rollout decision. |
| **PL-B2** | Google / Apple sign-in (B2C or auth provider) | Useful for a public audience, but not worth provider/account cost before launch timing is real | UI placeholder exists only. Needs provider decision, provider setup, callback handling, and account-linking rules. |

---

## 3. Pending backlog (post-V2 / V3+)

**Columns:** target release (current planning intent), value, priority, **suggested order** (batch nearby rows together), and **why it is still pending / what it needs next**.

| Suggested order | Target | Feature | Value | Priority | Pending because / needs |
|-----------------|--------|---------|-------|----------|-------------------------|
| P-E1 | V2–V3 | Task dependencies + recurring tasks (playbook-driven) | Richer planning | P2 | **In progress:** dependency fields, recurrence metadata, blocked-task filtering, recurrence rollover, and Weekly UI controls are built. Still needs deeper scheduling rules, playbook-driven recurrence UX, and broader polish. |
| P-E2 | V2–V3 | Goal progress + weekly calendar view | Visibility | P3 | **In progress:** goal progress cards, goal-linked task planning, optional planned dates, and a Weekly calendar view are built. Still needs refinement around overload prevention, richer scheduling controls, and cross-screen polish. |
| P-E6 | V3 | Redis / caching layer | Scale + latency | P3 | Not needed at current scale. Add when usage/latency justifies infra complexity. |
| P-E7 | V3 | Comprehensive structured logging / dashboards | Ops | P2 | **In progress:** structured JSON API logs, request IDs, route failure events, process-level error logging, and an observability guide are built. Still needs Azure dashboards, alert thresholds, and broader telemetry coverage. |
| P-F1 | V3 | Body doubling mode | Differentiation, ADHD | P2 | **In progress:** Daily now has a first body-doubling session panel with selectable work windows, timed check-ins, and task-linked companion prompts. Still needs persistence, richer tone tuning, and validation that the cadence feels supportive rather than intrusive. |
| P-F2 | V3 | Sensory-friendly themes (“Calm”, “Focus”, “Warm”) | Sensory access | P2 | **In progress:** persisted Calm/Focus/Warm themes are built with app-wide styling and settings controls. Still needs deeper surface-by-surface polish and accessibility verification across every screen/state combo. |
| P-F3 | V3 | Celebration moments (opt-in; respect reduce motion) | Dopamine-safe wins | P3 | **In progress:** subtle opt-in completion feedback is built on Daily and respects reduce motion. Still needs broader trigger coverage and tuning so it stays supportive without becoming noisy. |
| P-F4 | V3 | Persona-based onboarding | Conversion | P2 | **In progress:** onboarding now includes persona selection with tailored setup copy, starter playbooks, and first brain-dump prompts. Still needs measurement, deeper branching, and validation that the personas improve onboarding clarity rather than adding friction. |
| P-F5 | V3 | Shareable playbooks / templates | Viral loop | P3 | Needs import/export format, permissions/moderation rules, and template browsing UX. |
| P-F6 | V3 | “Scaffolding score” / gentle usage insights | Show value; not punitive | P3 | Needs analytics model and careful framing so it motivates without judgment. |
| P-G1 | V2–V3 | **Full E2E suite** (Playwright/Cypress in CI) | Catch regressions | **P1** | Basic build/test exists, but no full critical-path browser automation or stable CI environment for it yet. |
| P-G2 | V3 | Dev / staging environment (test before prod) | Process (per team plan ~V3/V4) | P2 | Current workflow is prod-first. Needs separate infra, secrets, branch/release rules, and test data strategy. |

## 3A. Recommended V3 next

If V2 is considered closed, these are the strongest next candidates for V3 based on product value vs complexity:

| Order | Feature | Why it is a strong next step |
|-------|---------|------------------------------|
| V3-1 | **P-E1** Task dependencies + recurring tasks | Highest planning-system value; deepens the core workflow rather than adding surface polish. |
| V3-2 | **P-E7** Structured logging / dashboards | Improves operational confidence before more users and more complexity. |
| V3-3 | **P-G2** Dev / staging environment | Matches your stated V4-ish process goal and reduces prod-first risk. |
| V3-4 | **P-F1** Body doubling mode | Strong differentiation for ADHD users and a clear “Skafold-only” feature. |
| V3-5 | **P-F2** Sensory-friendly themes | High brand/value alignment with the neurodivergent-first positioning. |
| V3-6 | **P-F4** Persona-based onboarding | Good conversion/fit improvement once the core loop is stable. |

## 3B. Very Low Priority / Reference only

These are intentionally **out of the active build backlog for now**. Keep them for reference, but assume they are unlikely to ship unless priorities change later.

| Suggested order | Original target | Feature | Why parked for now |
|-----------------|-----------------|---------|--------------------|
| P-B3 | V2 | Push notifications (timebox, daily nudge) — infra + permission UX | Higher UX/security/core-flow items matter more first; notifications add infra and interruption risk. |
| P-D2 | V2 | Timebox / Pomodoro polish | Basic timer support already exists in Guided Mode; deeper Pomodoro work is not essential right now. |
| P-D3 | V2 | Extended undo / history (beyond 5s toast) | Current undo covers the common case; broader history is extra complexity for low near-term value. |
| P-D5 | V2 | Auditory cues (opt-in) | Easy to over-stimulate users and adds sound design/settings surface area. |
| P-E3 | V3 | Multi-tenancy / orgs | Not needed while the product is single-user / early-stage. |
| P-E4 | V3 | Offline-first sync (beyond current PWA shell) | Installable PWA is enough for now; full sync/conflict handling is large scope. |
| P-E5 | V3 | Data export (CSV/PDF) + backup story | Useful later, but not core to validating current product-market fit. |

**Grouping for active sprints**

| Group | Orders | Theme |
|-------|--------|--------|
| **Pre-launch only** | PL-A1, PL-B2 | Public-user auth/provider setup |
| **Scale & V3** | P-E1, P-E2, P-E6, P-E7, P-F* | Planning depth, ops, themes, market features |
| **Quality bar** | P-G1–P-G2 | E2E + environments |

---

## 3. How to use this doc

1. **Ship check:** Use §1 before a release demo.  
2. **Planning:** Treat §2 as **launch-only**, §3 as the real post-V2 backlog, and start with §3A for likely V3 work.  
3. **Detail:** When a row ships, update the relevant **V1 / V2 / V3** MD section and tick it here or remove from the appropriate section.

---

*References: [V1_ScaffoldAI_Features.md](V1%20Design/V1_ScaffoldAI_Features.md) · [V2_ScaffoldAI_Features.md](V2%20Design/V2_ScaffoldAI_Features.md) · [V3_ScaffoldAI_Future_Features.md](V3%20Design/V3_ScaffoldAI_Future_Features.md) · [SIGN_IN_AND_BRANDING.md](../SIGN_IN_AND_BRANDING.md)*

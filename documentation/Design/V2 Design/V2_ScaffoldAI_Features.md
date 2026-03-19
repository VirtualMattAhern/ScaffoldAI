# SkafoldAI — V2 Feature Roadmap

**Last updated:** 2026-03-20 UTC  

**Master list:** [FEATURE_TRACKER.md](../FEATURE_TRACKER.md) — consolidated **completed** table, **pending** table (priority P0–P3, suggested order, target release).

This document outlines the V2 feature roadmap. V2 builds on a stable V1 with deeper AI, richer interactions, and broader accessibility. Items are grouped by theme and prioritized.

---

## V2 Summary — Status at a Glance

| Phase | Status | Delivered | Pending |
|-------|--------|-----------|---------|
| **2A** | ✅ Complete | Reduce motion, tooltips, focus mode, last_used_at | — |
| **2B** | ✅ Complete | Task chat, editable sub-steps, energy-aware | Smart re-prioritization |
| **2C** | ✅ Mostly complete | Dark mode, bulk actions, ARIA/screen reader | Drag-and-drop, color-coding |
| **2D** | ⚠️ Partial | PWA, basic API test | Push notifications, full E2E |
| **Release & UX (chat / post-roadmap)** | ✅ Delivered | Landing overhaul, brand logo + app icon, email-first + team Microsoft, CI/CD | Google/Apple OAuth (see tracker P-B2) |

**V2 core themes are largely implemented.** Remaining V2-scope work, V2.1 hardening, and V3 items are in **FEATURE_TRACKER.md §2**.

---

## Delivered — product & branding (not in original theme tables)

| Item | Description |
|------|-------------|
| **Landing redesign** | Single font (Plus Jakarta Sans), cohesive sky/blue palette, one-screen hero + sign-in, touch-friendly controls |
| **Brand assets** | Full logo on landing only; octopus icon for favicon + `apple-touch-icon` + PWA manifest |
| **Sign-in UX** | Email primary; Microsoft under “Team / work”; Google / Apple disabled placeholders (“coming soon”) |
| **CI/CD** | GitHub Actions builds API + Web in ACR, deploys Container Apps (with secrets documented) |
| **Docs** | [SIGN_IN_AND_BRANDING.md](../../SIGN_IN_AND_BRANDING.md) |

---

## V2 Vision

V2 transforms SkafoldAI from a productivity scaffold into an adaptive executive function partner. The app learns from user patterns, proactively suggests improvements, and supports users in more complex decision-making — while keeping the neurodivergent-friendly simplicity that defines V1.

---

## Theme 1: Deeper AI Integration

| Feature | Priority | Description |
|---------|----------|-------------|
| AI-suggested playbooks from task patterns | High | Detect repeated task sequences and suggest reusable playbooks automatically |
| Task-specific chat ("Need more help?") | High | In-context AI chat scoped to the active task; slide-out panel or dedicated screen |
| AI task breakdown (Guided Mode sub-tasks) | High | Auto-generate sub-tasks when user starts a task; editable |
| AI energy-aware suggestions | Medium | "Low energy? Start with the easiest task" based on task complexity scoring |
| AI weekly review | Medium | End-of-week summary: completed tasks, patterns, suggestions for next week |
| Smart re-prioritization | Medium | When user pauses or skips tasks, AI adjusts Top 3 and explains why |
| AI playbook refinement | Low | After playbook use, AI suggests step improvements based on actual execution |

---

## Theme 2: Enhanced User Experience

| Feature | Priority | Description |
|---------|----------|-------------|
| Tooltips on task metadata | High | Hover/focus tooltips for Top 3 star, type, timebox, task age |
| Drag-and-drop task reordering | Medium | Reorder Top 3 tasks on Daily; reorder steps in Playbooks |
| Bulk actions | Medium | Select multiple tasks → mark Done, Pause, or assign to goal |
| Quick-add everywhere | Medium | Floating "+" button or `Cmd+N` from any screen to capture a thought |
| Inline task editing | Medium | Click task title to edit in-place; click status to cycle states |
| Undo history (extended) | Low | Undo stack beyond 5 seconds; accessible via Ctrl+Z |
| Customizable views | Low | Toggle between list/card/Kanban view on Weekly Planning |

---

## Theme 3: Accessibility & Neurodivergent Design

| Feature | Priority | Description |
|---------|----------|-------------|
| Reduce motion setting | High | Disable animations, transitions, auto-scrolling; WCAG 2.1 AAA |
| Focus mode | High | On Daily screen: hide header, helper, nav — show only top 3 tasks and actions |
| Screen reader optimization | High | ARIA labels, live regions for AI responses, focus management |
| Color-coding per goal/task | Medium | Optional user-assigned colors for visual grouping |
| Auditory cues (opt-in) | Medium | Subtle sounds for: task completed, timer up, AI ready; must be optional and adjustable |
| Voice input for brain dump | Low | Dictate brain dump via speech-to-text |
| Dark mode (full theme) | Medium | True dark theme beyond high contrast |

---

## Theme 4: Planning & Execution

| Feature | Priority | Description |
|---------|----------|-------------|
| Guided Mode (full screen) | High | Carries over from V1 pending; dedicated execution screen with sub-tasks, timer, helper |
| Decision Helper (full screen) | High | Carries over from V1 pending; 3-option AI decisions linked to active task |
| Timebox timer / Pomodoro | Medium | Countdown timer on active task; configurable intervals |
| Task dependencies | Medium | "Can't start until X is done" — visual indicator, AI respects in Top 3 |
| Recurring tasks | Medium | Auto-create tasks on schedule (daily, weekly, monthly) from playbooks |
| Goal progress tracking | Low | Visual progress bar per goal based on task completion |
| Weekly calendar view | Low | See tasks plotted by day of week |

---

## Theme 5: Infrastructure & Scale

| Feature | Priority | Description |
|---------|----------|-------------|
| Multi-tenancy / organizations | Medium | Share playbooks, assign tasks within a team |
| Offline-first (PWA) | Medium | Service worker + IndexedDB sync; work offline, sync when connected |
| Push notifications | Medium | Reminders for timebox, daily planning prompt, weekly review |
| Data export (CSV, PDF) | Low | Export tasks, decisions, weekly summaries |
| API rate limiting | Medium | Per-user rate limits on AI calls; queue for heavy usage |
| Caching layer (Redis) | Low | Cache playbooks, Top 3, focus sentence; invalidate on change |
| Comprehensive logging | Medium | Structured JSON logging to Application Insights |
| Automated testing | High | Unit tests for API routes; integration tests for AI flows; E2E for critical paths |

---

## V2 Delivery Phases (historical plan — actuals)

Original phase intent vs **current state** (see § Summary above and [FEATURE_TRACKER.md](../FEATURE_TRACKER.md)):

| Phase | Planned focus | Actual |
|-------|----------------|--------|
| **2A** | V1 gaps + reduce motion | ✅ Guided/Decision shipped in V1; 2A added motion, tooltips, focus mode, `last_used_at` |
| **2B** | Deeper AI + timer + tests | ✅ Task chat, editable steps, energy-aware; ⏳ smart re-prioritize, timebox polish, full E2E |
| **2C** | Scale + dark + PWA | ✅ Dark mode, bulk, ARIA; ⏳ DnD, color-coding; PWA shell ✅, deep offline ⏳ V3 |
| **2D** / ongoing | Notifications, polish | ⏳ Push; ✅ PWA manifest/icons; landing/branding/CI per tracker |

---

## Dependencies

| Feature | Depends On |
|---------|------------|
| Task-specific chat | Guided Mode screen |
| AI task breakdown | Guided Mode screen |
| Decision Helper | Guided Mode screen (Decision button) |
| Recurring tasks | Playbook improvements |
| Multi-tenancy | Entra ID fully deployed |
| PWA / offline | Stable production deployment |

---

## Success Metrics (V2)

| Metric | Target |
|--------|--------|
| Onboarding completion rate | > 80% |
| Daily active usage (open app + complete 1 task) | > 60% of registered users |
| AI Convert usage | > 70% of brain dumps converted |
| Guided Mode adoption | > 50% of started tasks use Guided Mode |
| Decision Helper usage | > 30% of stuck tasks use Decision Helper |
| Accessibility settings usage | Track opt-in rates for high contrast, dyslexia font, reduce motion |

---

*Reference: [V1_ScaffoldAI_Features.md](../V1%20Design/V1_ScaffoldAI_Features.md), [V1_Design_Review_and_Recommendations.md](../V1%20Design/V1_Design_Review_and_Recommendations.md)*

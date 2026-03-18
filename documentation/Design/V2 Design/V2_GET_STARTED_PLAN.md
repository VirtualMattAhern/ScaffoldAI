# V2 Get Started Plan

**Last updated:** 2026-03-13 UTC

Recommendation: **Group features into phases** rather than tackling all at once. Each phase delivers a coherent set of value and can be shipped independently.

**V1 completion (done):** AI-suggested playbooks, task filtering (by status + type). These are now delivered before starting V2.

---

## Phase 2A — Polish & Quick Wins (Recommended First)

**Goal:** Complete V1 gaps and low-effort UX improvements.  
**Estimated effort:** 1–2 weeks  
**Risk:** Low

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Reduce motion setting | High | WCAG AAA; simple toggle |
| Tooltips on task metadata | High | Low-noise; improves discoverability |
| Focus mode | High | Hide nav/helper on Daily; reduces distraction |
| Wire quick-add on Weekly | Medium | May already be done; verify |
| Update `last_used_at` when playbook used | Low | Small DB fix |

**Why start here:** These are self-contained, don't require new AI or backend work, and improve daily use immediately.

---

## Phase 2B — Deeper AI

**Goal:** Make AI more contextual and helpful.  
**Estimated effort:** 2–3 weeks  
**Risk:** Medium (AI prompt tuning)

| Feature | Priority | Notes |
|---------|----------|-------|
| AI-suggested playbooks from task patterns | High | Detect repeated sequences; suggest playbook |
| Task-specific chat ("Need more help?") | High | In-context AI; slide-out or panel |
| AI task breakdown (Guided Mode sub-tasks) | High | Auto-generate sub-steps; editable |
| AI energy-aware suggestions | Medium | "Low energy? Start with the easiest" |
| Smart re-prioritization | Medium | When user pauses/skips; AI adjusts Top 3 |

**Dependencies:** Guided Mode and Decision Helper already built in V1; Task-specific chat depends on Guided Mode.

---

## Phase 2C — Interaction & Accessibility

**Goal:** Richer interactions and broader accessibility.  
**Estimated effort:** 2–3 weeks  
**Risk:** Medium (UX complexity)

| Feature | Priority | Notes |
|---------|----------|-------|
| Drag-and-drop task reordering | Medium | Reorder Top 3; reorder playbook steps |
| Screen reader optimization | High | ARIA, live regions, focus management |
| Dark mode (full theme) | Medium | Beyond high contrast |
| Color-coding per goal/task | Medium | Optional user-assigned colors |
| Bulk actions | Medium | Select multiple → mark Done/Pause |

---

## Phase 2D — Scale & Infrastructure

**Goal:** Production readiness and scale.  
**Estimated effort:** 2–4 weeks  
**Risk:** Medium–High

| Feature | Priority | Notes |
|---------|----------|-------|
| Automated testing | High | Unit tests API; E2E critical flows |
| PWA / offline-first | Medium | Service worker + IndexedDB |
| Push notifications | Medium | Reminders for timebox, daily prompt |
| Multi-tenancy | Medium | Post–Entra ID fully deployed |
| Data export (CSV, PDF) | Low | Export tasks, decisions, summaries |

---

## Suggested Order

1. **Phase 2A** — Polish & Quick Wins (start here)
2. **Phase 2B** — Deeper AI (when 2A is stable)
3. **Phase 2C** — Interaction & Accessibility (can overlap with 2B)
4. **Phase 2D** — Scale (ongoing; parallel with 2B/2C)

---

## Grouping Rationale

- **2A** = High impact, low effort, no new architecture
- **2B** = AI features; group together for prompt/context consistency
- **2C** = UX/accessibility; group for design coherence
- **2D** = Infra; can run in parallel with feature work

---

*Reference: [V2_ScaffoldAI_Features.md](V2_ScaffoldAI_Features.md), [V1_ScaffoldAI_Features.md](../V1%20Design/V1_ScaffoldAI_Features.md)*

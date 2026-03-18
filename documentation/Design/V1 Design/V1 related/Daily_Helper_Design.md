# Daily Screen — Helper Design (V1 Simplification)

**Context:** User testing showed mismatched, redundant helper content. This doc proposes a simpler design.

---

## Current Issues

1. **AI suggestion** and **SkafoldAI Helper** are both hardcoded placeholders (inventory/sales) — not context-aware
2. **Redundant** — Two separate boxes with overlapping purpose
3. **Visibility** — Helper appears below the fold; user had to scroll
4. **Trigger** — Unclear when helper should show (Start click vs. always visible)
5. **"Need more help?"** — No path to deeper, task-specific assistance

---

## Proposed Design: Single Contextual Helper

### One box, one purpose

Replace both boxes with a **single "Your SkafoldAI Helper"** section that:

- **Content:** AI-generated, based on the user's actual tasks (not hardcoded)
- **When idle (no task started):** Suggests which task to start first and why (e.g., "Start with Finish song—it unblocks the next two tasks.")
- **When a task is in progress:** Shows task-specific guidance (e.g., "For finishing a song: block time, minimize distractions, and aim for a rough mix first.")

### Placement

- **Above the fold** — Place directly below the task cards, before any "Need more help?" link
- Keeps the helper visible without scrolling when there are 3 tasks

### Trigger

- **Always visible** — The helper box is always shown
- **Content updates** when user clicks Start (switches from "which to start" to "how to do this task")
- No separate "show on Start" — simpler mental model

### "Need more help?" (Future / Post-V1)

- **Link/button** inside the helper: "Need more help with this task?"
- **Opens:** A task-specific chat screen (or slide-out panel)
- **Scope:** Chat is limited to the active task — AI won't wander to other topics
- **Defer to post-V1** — Implement after core flow is solid

---

## V1 Implementation Scope

| Item | Action |
|------|--------|
| Consolidate to one box | Remove AI suggestion box; keep only SkafoldAI Helper |
| Make content dynamic | Add API: `GET /api/daily/helper?activeTaskId=` — returns context-aware text |
| Placement | Move helper directly below task cards (already there; ensure no scroll needed for 3 tasks) |
| "Need more help?" | Out of scope for V1; document for later |

---

## API: Daily Helper

**Endpoint:** `GET /api/daily/helper?activeTaskId=`

- **No activeTaskId:** Return suggestion for which task to start first (based on top 3)
- **With activeTaskId:** Return task-specific guidance for that task

**AI prompt:** Use task titles and (when active) the specific task to generate relevant, non-generic advice. Avoid inventory/sales language when tasks are about music, creative work, etc.

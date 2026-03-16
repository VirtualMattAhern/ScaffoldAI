# SkafoldAI V1 Design Review & Recommendations

**Purpose:** Tighten and finalize design before build. Focus areas: simplification, ease of use, neurodivergent design, Azure readiness, and scalability.

---

## Executive Summary

The current design is strong: clear three-horizon model (Monthly → Weekly → Daily), AI embedded throughout, and neurodivergence-friendly principles already present. The recommendations below aim to reduce friction, strengthen accessibility, and ensure a clean path to Azure at scale.

---

## V1 Confirmed Scope (Locked for Build)

The following items are **confirmed for V1** and will be implemented in the first release.

### 1. Simplification
| Item | Implementation |
|------|----------------|
| **Onboarding** | First-time setup flow (3–5 steps): business type, one starter playbook, brain dump → AI convert demo |
| **Navigation** | Persistent horizon switcher: Monthly · Weekly · Daily (tabs or pills), always visible |
| **Empty states** | Explicit copy per screen with clear next action (e.g., "No playbooks yet. Add one or let AI suggest from your tasks.") |
| **AI Convert** | Default path for Brain Dump; auto-convert on blur or short delay instead of button-only |
| **Guided Mode entry** | Click "Start" → go straight into Guided Mode; no intermediate confirm or choose-sub-tasks step |

### 2. Ease of Use
| Item | Implementation |
|------|----------------|
| **Loading states** | Indicators for AI Convert, AI Suggest Top 3, Decision Helper; skeleton loaders or spinners with short messages |
| **Undo** | Undo for: marking task Done, choosing Decision option; 5-second window with toast |
| **Quick add** | Floating "+" or persistent "Add idea" bar on Weekly Planning for capture without scrolling |
| **Focus sentence** | AI-suggested focus sentence based on top 3 tasks; user can accept or edit |

### 3. Design for Neurodivergent Users
| Item | Implementation |
|------|----------------|
| **High contrast mode** | High-contrast theme (dark mode or increased contrast); WCAG AA (4.5:1) minimum |
| **Font and size** | Font size adjustment (90%, 100%, 110%, 125%); dyslexia-friendly font option (e.g., OpenDyslexic) |
| **Explicit state labels** | Clear labels: "Not started," "In progress," "Paused," "Done" — text paired with icons |
| **Helper tone** | Concrete, low-jargon, reassuring; "You might start with..." not "You should" |
| **Predictable AI** | Brief plain-language explanation when AI suggests or converts (e.g., why marked as Top 3) |
| **Pause without guilt** | Pause prominent and neutral; optional "Pause and schedule for later" with date picker |

### 4. Azure Strategy
**Build for Azure from day one.** Migration could happen within days or weeks, so avoid a local-first approach that would require refactoring. Use Azure services from the start where practical.

---

## 1. Simplification (for Users)

### Current Strengths
- Rule of 3 limits daily overload
- Brain Dump removes pre-categorization burden
- Decision Helper reduces open-ended choices to 3 options
- Playbooks turn repeated work into reusable routines

### Recommended Additions

| Area | Suggestion | Rationale |
|------|------------|-----------|
| **Onboarding** | Add a single "First-time setup" flow (3–5 steps max) that: (1) captures business type, (2) creates one starter playbook, (3) does one brain dump → AI convert demo. | New users need a clear starting point; otherwise they may bounce between screens without a first action. |
| **Navigation** | Use a persistent horizon switcher: **Monthly | Weekly | Daily** as tabs or pills. Always visible, one click to change context. | Reduces cognitive load of "where am I?" and "where do I go next?" |
| **Empty states** | Define explicit empty-state copy for each screen (e.g., "No playbooks yet. Add one or let AI suggest from your tasks."). | Prevents blank screens and gives a clear next action. |
| **AI Convert** | Make "AI Convert" the default path for Brain Dump. Consider auto-convert on blur or after a short delay instead of requiring a button click. | One less decision; users who dump ideas often want them structured immediately. |
| **Guided Mode entry** | When user clicks "Start," go straight into Guided Mode. Avoid an intermediate "confirm" or "choose sub-tasks" step. | Fewer clicks = less friction to begin. |

### Simplification to Defer (Post-V1)
- Customizable views (Kanban, calendar) — adds complexity; keep table/card view for V1
- Multiple AI models or personality options — stick to one consistent helper voice

---

## 2. Ease of Use

### Current Strengths
- Consistent button placement (Open/Edit, Start/Pause/Done)
- Clear column headers and task types
- Helper explains what AI did and suggests next steps

### Recommended Additions

| Area | Suggestion | Rationale |
|------|------------|-----------|
| **Keyboard shortcuts** | Support: `N` (new task/idea), `Enter` (submit), `Esc` (back/cancel), `1/2/3` (select top 3 task). Document in a "?" or keyboard icon. | Power users and many neurodivergent users prefer keyboard flow. |
| **Loading states** | Show clear loading indicators for: AI Convert, AI Suggest Top 3, Decision Helper options. Use skeleton loaders or spinners with short messages ("Organizing your ideas..."). | Reduces anxiety when AI is "thinking"; users know the system is working. |
| **Undo** | Allow "Undo" for: marking task Done, choosing a Decision option. Short window (e.g., 5 seconds) with toast. | Mistakes happen; undo reduces fear of irreversible actions. |
| **Quick add** | Add a floating "+" or persistent "Add idea" bar on Weekly Planning so users can capture without scrolling to Brain Dump. | Captures thoughts before they’re lost. |
| **Focus sentence** | Offer AI-suggested focus sentence based on top 3 tasks (e.g., "Today is for: inventory, content, and vendor payments"). User can accept or edit. | Reduces blank-page syndrome; still user-controlled. |
| **Tooltips** | Add optional tooltips for: `*` (Top 3), Type (one-off/repeat/playbook), Timebox, Task age. Keep them dismissible and low-noise. | Clarifies meaning without cluttering the main UI. |

### Ease of Use to Defer (Post-V1)
- Drag-and-drop reordering — adds interaction complexity
- Bulk actions (e.g., mark multiple Done) — edge case for V1

---

## 3. Design for Neurodivergent Users

### Current Strengths
- Limited visible items (Rule of 3, playbook cards)
- Explicit steps and sub-tasks
- Decision Helper reduces analysis paralysis
- Consistent layout and predictable structure

### Recommended Additions

| Area | Suggestion | Rationale |
|------|------------|-----------|
| **Reduced motion** | Add a user setting: "Reduce motion" (off by default). When on: disable animations, transitions, and auto-scrolling. | Many neurodivergent users are sensitive to motion; WCAG 2.1 Level AAA supports this. |
| **High contrast mode** | Offer a high-contrast theme (e.g., dark mode or increased contrast). Ensure text meets WCAG AA minimum (4.5:1 for normal text). | Supports visual processing differences and light sensitivity. |
| **Font and size** | Allow font size adjustment (e.g., 90%, 100%, 110%, 125%) and a dyslexia-friendly font option (e.g., OpenDyslexic). | Reading differences are common; this is low-effort, high-impact. |
| **Focus mode** | On Daily screen, add "Focus mode" that hides header, helper chat, and extra UI—shows only the 3 tasks and essential actions. | Reduces distraction and sensory load during execution. |
| **Explicit state labels** | Use clear status labels: "Not started," "In progress," "Paused," "Done." Avoid icons-only; pair with text. | Reduces ambiguity; some users struggle with icon-only communication. |
| **Helper tone** | Keep helper language: concrete, low-jargon, reassuring. Avoid "You should" or "You must"; prefer "You might start with..." or "A good next step is...". | Reduces performance anxiety and shame; supports autonomy. |
| **Predictable AI** | When AI suggests or converts, briefly explain *why* in plain language (e.g., "I marked these as top 3 because they’re high-impact and have been open for a few days."). | Reduces "black box" anxiety; builds trust. |
| **Pause without guilt** | Make Pause prominent and neutral. Optional: "Pause and schedule for later" with a date picker so the task doesn’t feel abandoned. | Supports energy fluctuations and task-switching without shame. |

### Neurodivergent Design to Defer (Post-V1)
- Auditory cues/reminders — requires careful design to avoid sensory overload
- Customizable color-coding per goal/task — valuable but adds settings complexity

---

## 4. Azure Strategy — Build for Azure from Day One

**Decision:** Build directly for Azure. Migration could happen within days or weeks, so avoid local-first patterns that would require refactoring. Use Azure services from the start.

### Recommended Azure Stack for V1

| Layer | Azure Service | Notes |
|-------|---------------|------|
| **Auth** | Azure Entra ID (formerly Azure AD) or Azure AD B2C | Start with Entra ID for single-tenant; B2C when multi-tenant needed |
| **Database** | Azure SQL Database or Azure Cosmos DB | SQL for relational queries; Cosmos for flexible schema + global scale |
| **AI/LLM** | Azure OpenAI Service | Same API as OpenAI; no migration later; enterprise compliance |
| **File/Blob** | Azure Blob Storage | For attachments, exports, backups |
| **API** | Azure App Service or Azure Functions | App Service for always-on; Functions for serverless, event-driven |
| **Frontend** | Azure Static Web Apps or App Service | Static Web Apps for SPA + serverless API; App Service for full-stack |
| **Config** | Azure App Configuration or Key Vault | Secrets, feature flags, environment-specific settings |

### Local Development Approach

- Use **Azure emulators** (e.g., Azurite for Blob/Queue) or **dev containers** that mirror Azure
- Or: connect to **Azure dev resources** (separate subscription/resource group) for realistic testing
- Keep config environment-driven: `local.settings.json` / `appsettings.Development.json` point to local or dev Azure

### Design Decisions That Support Azure

1. **Stateless API design** — Avoid server-side session storage; use tokens and client-side state. Eases horizontal scaling.
2. **User-scoped data** — All entities (playbooks, tasks, goals, decisions) must have a `userId` or `tenantId` from the start.
3. **Idempotent operations** — Design create/update APIs to be idempotent where possible (e.g., upsert by ID). Helps with retries and eventual consistency.
4. **Async AI calls** — AI Convert, AI Suggest, Decision options can be async. Return a job ID; poll or use WebSockets for result. Enables queue-based processing (Azure Service Bus, Azure Functions) at scale.
5. **Config-driven** — All environment-specific config (API URLs, feature flags, connection strings) in config; never hardcode.

### Data Model Considerations

- **Playbooks**: `id`, `userId`, `title`, `type`, `steps[]`, `lastUsedAt`, `createdAt`
- **Tasks**: `id`, `userId`, `goalId`, `title`, `status`, `type`, `timebox`, `createdAt`, `completedAt`
- **Goals**: `id`, `userId`, `title`, `createdAt`
- **Decisions**: `id`, `userId`, `taskId`, `question`, `chosenOption`, `createdAt`
- **Brain Dump items**: Consider storing raw dump + converted output for AI training/improvement (with user consent)

---

## 5. Scalability (Many Users)

### Design Choices That Scale

| Concern | Recommendation |
|---------|----------------|
| **Per-user isolation** | Every query filters by `userId`. Use row-level security or application-level filtering. |
| **AI rate limiting** | Plan for per-user or per-tenant rate limits on AI calls. Azure OpenAI has quotas; design fallbacks (e.g., cached suggestions, queue for later). |
| **Pagination** | Weekly task list: paginate or virtualize when > 50–100 items. Playbooks: typically < 20 per user; full load is fine. |
| **Caching** | Cache playbook list, today’s top 3, and focus sentence. Invalidate on update. Use Redis (Azure Cache for Redis) post-migration. |
| **Background jobs** | AI suggestions, playbook pattern detection, and "AI Suggest Top 3" can run as background jobs. Don’t block the main request. |
| **Logging and telemetry** | Log key actions (task started, decision made, playbook used) with `userId` and `timestamp`. Use structured logging (JSON). Enables Azure Monitor / Application Insights. |

### Scalability to Defer (Post-V1)

- Multi-tenancy (organizations/teams)
- Real-time collaboration
- Offline-first sync (e.g., PWA with sync)

---

## 6. V1 Scope Summary

### In Scope for V1
- All 5 screens as designed (Monthly Playbooks, Weekly Planning, Daily Rule of 3, Guided Mode, Decision Helper)
- **Simplification:** Onboarding, navigation (horizon switcher), empty states, AI Convert as default, direct Guided Mode entry
- **Ease of use:** Loading states, undo, quick add, AI-suggested focus sentence
- **Neurodivergent:** High contrast mode, font size + dyslexia-friendly font, explicit state labels, helper tone, predictable AI, pause without guilt
- **Azure:** Build for Azure from day one (Azure SQL/Cosmos, Azure OpenAI, App Service/Functions, etc.)
- Single-user or simple multi-user (email-based accounts)

### Out of Scope for V1
- Keyboard shortcuts, tooltips
- Reduce motion, Focus mode
- Customizable views (Kanban, calendar)
- Auditory cues
- Multi-tenant / organization features
- Offline sync
- Advanced analytics or reporting

---

## 7. Recommended Next Steps

1. **Update mockups** — Incorporate: horizon switcher, empty states, loading states, settings panel (High contrast, Font size, dyslexia-friendly font).
2. **Define data model** — Create schema with `userId` on all tables; document API contracts.
3. **Choose stack** — Align on: frontend framework, backend (e.g., .NET 8, Node), Azure SQL vs Cosmos DB, Azure OpenAI.
4. **Provision Azure resources** — Set up dev resource group: Azure SQL/Cosmos, Azure OpenAI, App Service or Static Web Apps, Key Vault.
5. **Build order** — Suggested sequence: (1) Auth + data layer (Azure), (2) Weekly Planning + Brain Dump + AI Convert, (3) Daily Rule of 3 + AI Suggest, (4) Guided Mode + Decision Helper, (5) Monthly Playbooks.
6. **Accessibility audit** — Before release, run axe or similar on key flows; ensure WCAG AA compliance.

---

## Appendix: Quick Reference — Design Principles

| Principle | Application |
|------------|-------------|
| **Reduce visible complexity** | Rule of 3, Focus mode, limited playbook cards per view |
| **Explicit over implicit** | Clear labels, tooltips, helper explanations |
| **Predictable structure** | Consistent layout, same button placement, horizon switcher |
| **Low-friction capture** | Brain Dump, quick add, AI Convert as default |
| **Decision support, not replacement** | 3 options, user chooses; AI suggests, doesn’t mandate |
| **Azure from day one** | Build on Azure services from start; no local-first migration path |

---

*Document version: 1.1 | Date: March 7, 2025 — V1 scope confirmed; Azure-first strategy adopted*

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

### Ops, release & branding (added outside original MDs)

| ID | Feature | Notes |
|----|---------|--------|
| X01 | GitHub Actions → Azure Container Apps (API + Web) | `AZURE_CREDENTIALS` + ACR build/deploy |
| X02 | Custom domains + certs (www / api) | Per deployment checklist |
| X03 | Landing UX overhaul | Plus Jakarta Sans; sky palette; logo **only** on landing; **icon** favicon + PWA |
| X04 | Sign-in positioning | Email-first; Microsoft under **Team / work**; Google / Apple UI placeholders (“coming soon”) |
| X05 | `documentation/SIGN_IN_AND_BRANDING.md` | Sign-in strategy + future OAuth notes |

---

## 2. Pending backlog

**Columns:** Target release (when we *intend* to align the item — still flexible), value, priority, **suggested order** (batch with nearby rows for planning).

| Suggested order | Target | Feature | Value | Priority |
|-----------------|--------|---------|-------|----------|
| P-A1 | **V2.1** | **Verify email / magic link (or OTP) for email sign-in** | Stops account impersonation before real users | **P0** |
| P-A2 | **V2.1** | **API rate limiting + abuse caps on AI** | Cost control, fair use | **P0** |
| P-A3 | **V2.1** | **CSP headers + security pass on API/web** | Hardening for public web | **P0** |
| P-B1 | V2 | Smart re-prioritization (AI adjusts Top 3 on pause/skip + short “why”) | Less manual juggling; core ADHD value | P1 |
| P-B2 | V2 | Google / Apple sign-in (B2C or auth provider) | Matches expectation for “regular people” | P1 |
| P-B3 | V2 | Push notifications (timebox, daily nudge) — infra + permission UX | Re-engagement without opening app | P1 |
| P-C1 | V2 | Drag-and-drop (Daily Top 3 + playbook steps) | Faster reordering | P2 |
| P-C2 | V2 | Color-coding per goal/task (optional) | Visual grouping | P2 |
| P-C3 | V2 | Inline task edit (title + status cycle) | Less friction than full forms | P2 |
| P-C4 | V2 | Quick-add everywhere (FAB or shortcut) | Capture from any screen | P2 |
| P-D1 | V2 | AI weekly review / wins summary | Closure + motivation | P2 |
| P-D2 | V2 | Timebox / Pomodoro polish (if not fully meeting V2 spec) | Execution support | P2 |
| P-D3 | V2 | Extended undo / history (beyond 5s toast) | Safety net for mistakes | P3 |
| P-D4 | V2 | AI playbook refinement after use | Better templates over time | P3 |
| P-D5 | V2 | Auditory cues (opt-in) | Accessibility + feedback | P3 |
| P-D6 | V2 | Voice input for brain dump | Faster capture | P3 |
| P-E1 | V2–V3 | Task dependencies + recurring tasks (playbook-driven) | Richer planning | P2 |
| P-E2 | V2–V3 | Goal progress + weekly calendar view | Visibility | P3 |
| P-E3 | V3 | Multi-tenancy / orgs | Teams | P2 |
| P-E4 | V3 | Offline-first sync (beyond current PWA shell) | True offline | P2 |
| P-E5 | V3 | Data export (CSV/PDF) + backup story | Trust + GDPR | P2 |
| P-E6 | V3 | Redis / caching layer | Scale + latency | P3 |
| P-E7 | V3 | Comprehensive structured logging / dashboards | Ops | P2 |
| P-F1 | V3 | Body doubling mode | Differentiation, ADHD | P2 |
| P-F2 | V3 | Sensory-friendly themes (“Calm”, “Focus”, “Warm”) | Sensory access | P2 |
| P-F3 | V3 | Celebration moments (opt-in; respect reduce motion) | Dopamine-safe wins | P3 |
| P-F4 | V3 | Persona-based onboarding | Conversion | P2 |
| P-F5 | V3 | Shareable playbooks / templates | Viral loop | P3 |
| P-F6 | V3 | “Scaffolding score” / gentle usage insights | Show value; not punitive | P3 |
| P-G1 | V2–V3 | **Full E2E suite** (Playwright/Cypress in CI) | Catch regressions | **P1** |
| P-G2 | V3 | Dev / staging environment (test before prod) | Process (per team plan ~V3/V4) | P2 |

**Grouping for sprints**

| Group | Orders | Theme |
|-------|--------|--------|
| **Trust & launch** | P-A1–P-A3 | Safe email auth, limits, CSP |
| **Engagement** | P-B1–P-B3 | Smarter list, social login, notifications |
| **Daily polish** | P-C1–P-C4 | Interaction quality on core screens |
| **AI + depth** | P-D1–P-D4 | Reviews, timers, undo, playbooks |
| **Scale & V3** | P-E*, P-F* | Orgs, offline, themes, market features |
| **Quality bar** | P-G1–P-G2 | E2E + environments |

---

## 3. How to use this doc

1. **Ship check:** Use §1 before a release demo.  
2. **Planning:** Sort §2 by *Suggested order* within priority (P0 first).  
3. **Detail:** When a row ships, update the relevant **V1 / V2 / V3** MD section and tick it here or remove from §2.

---

*References: [V1_ScaffoldAI_Features.md](V1%20Design/V1_ScaffoldAI_Features.md) · [V2_ScaffoldAI_Features.md](V2%20Design/V2_ScaffoldAI_Features.md) · [V3_ScaffoldAI_Future_Features.md](V3%20Design/V3_ScaffoldAI_Future_Features.md) · [SIGN_IN_AND_BRANDING.md](../SIGN_IN_AND_BRANDING.md)*

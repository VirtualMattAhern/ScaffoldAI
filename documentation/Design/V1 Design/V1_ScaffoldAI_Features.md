# SkafoldAI — V1 Feature Summary

**Last updated:** 2026-03-18 UTC

This document tracks all V1 features: what has been delivered, what is still pending, and what was deferred to V2.

---

## V1 Summary — Status at a Glance

| Area | Status | Pending |
|------|--------|---------|
| **Core screens** | ✅ Complete | — |
| **Authentication** | ✅ Complete | — |
| **AI features** | ✅ Complete | — |
| **Infrastructure** | ✅ Complete | — |
| **Neurodivergent design** | ✅ Complete | — |
| **Deployment** | ⚠️ Deploy failing | AZURE_CREDENTIALS secret required for CI/CD |

**V1 is feature-complete.** All planned features are implemented. The Container Apps deploy workflow requires `AZURE_CREDENTIALS` (service principal JSON) in GitHub Secrets to succeed.

---

## V1 Vision

SkafoldAI helps a business owner move from ideas to plans to focused action across three planning horizons — Monthly (playbooks), Weekly (planning), Daily (Rule of 3) — with AI embedded throughout to simplify, prioritize, break down, and move forward. Designed with neurodivergent users as a primary audience.

---

## Delivered Features

### Core Screens

| Screen | Status | Notes |
|--------|--------|-------|
| Landing / Sign-in | ✅ Delivered | Email login + Microsoft Entra ID ("Sign in with Microsoft") |
| Onboarding (5 steps) | ✅ Delivered | Welcome → business type → starter playbook → brain dump demo → completion |
| Monthly — Playbooks | ✅ Delivered | List, Open/Close expand, inline Edit (title + steps), Create new playbook, AI badge |
| Weekly — Planning | ✅ Delivered | Brain dump, AI Convert, task table with status badges + delete, quick-add, AI Suggest Top 3 |
| Daily — Rule of 3 | ✅ Delivered | Focus sentence (edit + AI suggest), top 3 tasks, Start→Guided Mode, Pause, Done (with undo), Not Today, transition prompt, status badges, active task highlighting |
| Guided Mode (Task Started) | ✅ Delivered | Active task with timer (elapsed/countdown), AI-generated sub-step checklist, contextual guidance, Pause/Resume, Done with transition prompt, Decision button |
| Decision Helper | ✅ Delivered | Question input, AI-generated 3-option cards, click-to-choose, confirmation, past decisions history |
| Settings | ✅ Delivered | High contrast, font size (90–125%), dyslexia-friendly font |

### Authentication & Users

| Feature | Status | Notes |
|---------|--------|-------|
| Email-based login (simple) | ✅ Delivered | No password; email + optional display name |
| Microsoft Entra ID (Azure AD) | ✅ Delivered | MSAL React + jose JWT validation; optional when env vars set |
| Dual auth support | ✅ Delivered | Email (dev/legacy) and Entra (production) coexist |
| User creation + sync | ✅ Delivered | Auto-create user on first login (email or Entra OID) |

### AI Features

| Feature | Status | Notes |
|---------|--------|-------|
| Brain Dump → AI Convert | ✅ Delivered | Converts raw text into goals + tasks via Azure OpenAI |
| AI Suggest Top 3 | ✅ Delivered | Marks 3 high-impact tasks from weekly list |
| AI Focus Sentence | ✅ Delivered | Generates daily focus sentence from top tasks |
| Daily Helper | ✅ Delivered | Contextual AI guidance (idle: which task to start; active: task-specific advice) |
| AI Sub-Step Breakdown | ✅ Delivered | Generates 3–5 actionable sub-steps for Guided Mode |
| AI Decision Options | ✅ Delivered | Generates 3 concrete options with trade-offs for any decision |
| Predictable AI | ✅ Delivered | Explanations when AI suggests or converts ("I marked these because...") |
| Placeholder fallback | ✅ Delivered | App still works when Azure OpenAI is not configured |

### Data & Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| SQLite (local dev) | ✅ Delivered | Default for `npm run dev` |
| Azure SQL (production) | ✅ Delivered | Via `DATABASE_URL` connection string |
| Azure OpenAI integration | ✅ Delivered | Multiple endpoint format fallbacks |
| REST API (Express + TypeScript) | ✅ Delivered | All routes: auth, goals, tasks, playbooks, brain-dump, focus-sentence, daily, settings, guided, decisions |
| GitHub Actions (API deploy) | ✅ Delivered | `.github/workflows/azure-api-deploy.yml` |
| Azure deployment scripts | ✅ Delivered | PowerShell + Bash for Steps 0–5 |
| Error boundaries | ✅ Delivered | Per-screen React error boundaries with Try Again + Go to Daily |

### Neurodivergent Design

| Feature | Status | Notes |
|---------|--------|-------|
| Rule of 3 (limit daily overload) | ✅ Delivered | Only 3 tasks visible on Daily screen |
| Brain Dump (no pre-categorization) | ✅ Delivered | Capture first, organize later |
| High contrast mode | ✅ Delivered | WCAG AA compliant |
| Font size adjustment | ✅ Delivered | 90%, 100%, 110%, 125% |
| Dyslexia-friendly font | ✅ Delivered | OpenDyslexic toggle |
| Explicit state labels | ✅ Delivered | Status badges: open, in_progress, paused, done |
| Helper tone | ✅ Delivered | Concrete, low-jargon, reassuring ("You might start with...") |
| Pause without guilt | ✅ Delivered | Pause button prominent and neutral |
| Not Today (defer without guilt) | ✅ Delivered | Removes task from Top 3 without marking done |
| Transition prompts | ✅ Delivered | "Great work. Take a breath. Ready for the next one?" between tasks |
| Undo (Done → undo toast) | ✅ Delivered | 5-second undo window on marking tasks Done |
| Empty states with guidance | ✅ Delivered | Clear next action on every empty screen |
| Loading states | ✅ Delivered | "Organizing your ideas...", "Suggesting...", "Thinking..." |

### Simplification

| Feature | Status | Notes |
|---------|--------|-------|
| Onboarding (first-time setup) | ✅ Delivered | 3–5 step flow |
| Horizon navigation | ✅ Delivered | Monthly / Weekly / Daily tabs (Layout component) |
| AI Convert as default path | ✅ Delivered | Primary action for Brain Dump |
| Quick-add task | ✅ Delivered | Enter key support, immediate add from Weekly |

---

## Remaining Items (Infrastructure / Deployment)

| Feature | Status | Notes |
|---------|--------|-------|
| Container Apps (API + Web) | ✅ Delivered | Migrated from App Service / Static Web App |
| Custom domain (www.skafoldai.com) | ✅ Delivered | Managed cert + hostname bound |
| Custom domain (api.skafoldai.com) | ✅ Delivered | Cert bound; https://api.skafoldai.com/api/health verified |
| Entra ID app registration | ✅ Delivered | App registered; API configured; add GitHub secrets + redeploy web for frontend |
| CI/CD (GitHub Actions) | ✅ Delivered | `.github/workflows/azure-container-apps-deploy.yml` |
| Monitoring (App Insights) | ✅ Delivered | Linked to Container Apps env |
| Managed identity (ACR) | ✅ Delivered | No admin credentials for image pull |
| AI-suggested playbooks from task patterns | ✅ Delivered | POST /playbooks/ai-suggest; "AI Suggest Playbooks" on Monthly |
| Task filtering (by status, type) | ✅ Delivered | API `?status` + `?type`; filter dropdowns on Weekly Planning |
| Update `last_used_at` when playbook is used | ✅ Delivered | Updates when playbook opened (V2 Phase 2A) |

---

## V1 Remaining (Summary)

| Item | Status | Notes |
|------|--------|-------|
| **All core features** | ✅ Complete | Landing, onboarding, Monthly/Weekly/Daily, Guided Mode, Decision Helper, Settings |
| **Infrastructure** | ✅ Complete | Container Apps, custom domains, certs, Entra API |
| **last_used_at** | ✅ Complete | Implemented in V2 Phase 2A |
| **CI/CD deploy** | ⚠️ Blocked | Add `AZURE_CREDENTIALS` secret (service principal JSON) for Azure login |
| **Entra frontend** | ✅ Ready | `VITE_ENTRA_CLIENT_ID` and `VITE_ENTRA_TENANT_ID` added; will apply on next successful deploy |

---

## Pending: Steps Required

### api.skafoldai.com Cert Bind

**What it is:** Bind the managed certificate for `api.skafoldai.com` to the API Container App so the API is reachable via the custom domain with HTTPS.

**Prerequisites:**
- DNS CNAME for `api.skafoldai.com` points to `skafoldai-api.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io`
- Managed certificate `cert-api-skafoldai` exists and provisioning state is **Succeeded** (check in Azure Portal → Container Apps Environment → Certificates)

**Steps:**
1. Verify cert status:
   ```powershell
   az containerapp env certificate list -g skafoldai-rg -n skafoldai-env -o table
   ```
2. When `provisioningState` is `Succeeded` for `cert-api-skafoldai`, bind:
   ```powershell
   az containerapp hostname bind -g skafoldai-rg -n skafoldai-api --hostname api.skafoldai.com --environment skafoldai-env --certificate cert-api-skafoldai
   ```
3. Test: `https://api.skafoldai.com/api/health`

**Reference:** [DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md), [AZURE_SETUP_GUIDE.md](../../AZURE_SETUP_GUIDE.md)

---

### Entra ID App Registration

**What it is:** Register SkafoldAI in Microsoft Entra ID so users can sign in with "Sign in with Microsoft" in production.

**Prerequisites:** Access to [Microsoft Entra admin center](https://entra.microsoft.com)

**Steps:**

1. **Create app registration**
   - Go to [Microsoft Entra admin center](https://entra.microsoft.com)
   - **Applications** → **App registrations** → **New registration**
   - **Name:** `SkafoldAI`
   - **Supported account types:** Single tenant (org only) or "Accounts in any org + personal" (external users)
   - **Redirect URI:** Leave empty → **Register**

2. **Configure redirect URIs**
   - App registration → **Authentication** → **Add a platform** → **Single-page application (SPA)**
   - Add:
     - `https://www.skafoldai.com`
     - `https://skafoldai-web.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io` (Container App default)
     - `http://localhost:5173` (local dev)
   - **Save**

3. **API permissions**
   - **API permissions** → **Add a permission**
   - **Microsoft Graph** → **Delegated** → `User.Read`, `openid`
   - **Add permission**
   - If required: **Grant admin consent for [Your Org]**

4. **Get IDs**
   - **Overview** → copy **Application (client) ID** and **Directory (tenant) ID**

5. **Configure API (Container App)**
   ```powershell
   .\scripts\azure-entra-config.ps1 -EntraTenantId "<tenant-id>" -EntraClientId "<client-id>"
   ```
   Or add manually: `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID` in skafoldai-api → Configuration

6. **Configure frontend**
   - Add to `src/web/.env.production` or build secrets:
   ```
   VITE_ENTRA_CLIENT_ID=<client-id>
   VITE_ENTRA_TENANT_ID=<tenant-id>
   VITE_APP_URL=https://www.skafoldai.com
   VITE_API_URL=https://api.skafoldai.com/api
   ```
   - Rebuild and redeploy web Container App

**Reference:** [ENTRA_ID_MULTI_APP_SETUP.md](../../ENTRA_ID_MULTI_APP_SETUP.md), [DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md)

---

## How Entra ID Works (Reference)

### For Users
- **"Sign in with Microsoft"** lets users sign in with their Microsoft account (work or personal).
- No separate SkafoldAI password; they use their existing Microsoft identity.
- One-click sign-in instead of typing email and name.
- For work accounts: SSO with their organization's Microsoft 365 setup.

### For Your App
- **Identity provider:** Microsoft handles authentication (login, password, MFA).
- **Token-based auth:** After sign-in, Microsoft issues a JWT. The frontend sends it to your API; the API validates it and trusts the user.
- **User info:** The token includes user ID and email so you can create or look up the user in your DB.
- **No password storage:** You never store or handle passwords.

### For Your System
- **Security:** Microsoft manages credentials, MFA, and account security.
- **Compliance:** Uses Microsoft's identity and security controls.
- **Flexibility:** You still support email-only sign-in for dev or users without Microsoft accounts.
- **Isolation:** SkafoldAI's app registration is separate from BidBudAI and RezAGI; changes to one don't affect the others.

### Flow in Short
1. User clicks **Sign in with Microsoft**.
2. Browser redirects to Microsoft's login page.
3. User signs in with Microsoft.
4. Microsoft redirects back to your app with a token.
5. Frontend sends the token to your API on each request.
6. API validates the token (issuer, audience, expiry) and uses the user ID/email to create or load the user in your database.

---

## Deferred to V2

These were explicitly scoped out of V1 in the design review:

| Feature | Reason |
|---------|--------|
| Keyboard shortcuts | Removed from roadmap — too complex for neurodivergent users (ADHD); adds cognitive load |
| Tooltips on task metadata | Low-noise improvement; defer |
| Reduce motion setting | WCAG AAA; defer to V2 |
| Focus mode (hide header/helper) | Desirable but not V1 scope |
| Drag-and-drop reordering | Interaction complexity |
| Bulk actions (mark multiple Done) | Edge case |
| Customizable views (Kanban, calendar) | Significant UI work |
| Auditory cues / reminders | Needs careful design |
| Custom color-coding per goal/task | Settings complexity |
| Multi-tenancy / organizations | Post-V1 architecture |
| Offline sync (PWA) | Post-V1 |
| Advanced analytics / reporting | Post-V1 |

---

## V1 Screen Inventory

| # | Screen | Mockup | Built |
|---|--------|--------|-------|
| 1 | Monthly — Playbooks | `1.scaffoldai_monthly_playbooks_v3.png` | ✅ |
| 2 | Weekly — Planning | `2.scaffoldai_weekly_planning_v2.png` | ✅ |
| 3 | Daily — Rule of 3 | `3.scaffoldai_daily_rule_of_3_v2.png` | ✅ |
| 4 | Task Started — Guided Mode | `4.scaffoldai_task_started_guided_v4.png` | ✅ |
| 5 | Decision Helper | `5.scaffoldai_decision_helper_v4.png` | ✅ |

---

*Reference: [V1_Design_Review_and_Recommendations.md](V1_Design_Review_and_Recommendations.md), [DataModel.md](DataModel.md), [ScaffoldAI_Day_in_the_Life_Updated.pdf](ScaffoldAI_Day_in_the_Life_Updated.pdf)*

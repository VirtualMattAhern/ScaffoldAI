# SkafoldAI — Local Testing Guide

Steps to run and test SkafoldAI on your machine.

---

## Prerequisites

- Node.js 18+ installed
- Azure/Foundry configured (see [AZURE_SETUP_GUIDE.md](AZURE_SETUP_GUIDE.md))
- `.env` file in `src/api/` or `src/api/src/` with your Azure keys

---

## 1. Install Dependencies

From the project root:

```bash
npm install
cd src/api && npm install && cd ../..
cd src/web && npm install && cd ../..
```

Or, if you prefer to run from the root only:

```bash
npm install
```

(The root `npm install` installs `concurrently`; the API and web apps have their own dependencies.)

---

## 2. Start the App

From the project root:

```bash
npm run dev
```

This starts:
- **API** at http://localhost:3003
- **Web** at http://localhost:5173

The web app proxies `/api` requests to the API automatically.

---

## 3. Test the Flow

### A. Sign in and onboarding

1. Open http://localhost:5173 in your browser.
2. You should see the **landing page** (Sign in).
3. Enter your email (and optional name), click **Sign in**.
4. New users see the **onboarding** flow (5 steps). Complete it:
   - Step 1: Welcome — click **Next**
   - Step 2: Business type — enter something (e.g., "Small retail") → **Next**
   - Step 3: Starter playbook — **Next**
   - Step 4: Brain dump — type a few items (e.g., "Order inventory", "Reply to customer") → **Next**
   - Step 5: Get started — click **Get started**

### B. AI Convert (Brain Dump → tasks)

1. Go to **Weekly** (click **Weekly** in the header).
2. In **Brain Dump**, type or paste:
   ```
   Order inventory
   Create Instagram post about restock
   Pay supplier invoice
   Reply to customer email
   ```
3. Click **AI Convert**.
4. You should see tasks appear in the **Weekly Task List** below.
5. The helper message should explain what the AI did.

**If it fails:** Check the browser console (F12) and the API terminal for errors. Verify your `.env` has the correct endpoint and API key.

### C. AI Suggest Top 3

1. With tasks in the list, click **AI Suggest Top 3**.
2. Some tasks should get a `*` in the Top 3 column.
3. The helper message should explain the selection.

### D. Daily Rule of 3

1. Click **Daily** in the header.
2. You should see up to 3 tasks (the ones marked with `*`).
3. Click **Suggest** next to the focus sentence to get an AI-suggested focus.
4. Click **Start** on a task to begin (Guided Mode is a placeholder for now).

### E. Monthly Playbooks

1. Click **Monthly** in the header.
2. You should see the starter playbook from onboarding (e.g., "Weekly Review").
3. Empty state appears if you have no playbooks.

---

## 4. Quick Health Check

Open http://localhost:3003/api/health in your browser.

Expected response:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "azureOpenAI": "configured"
}
```

If `azureOpenAI` is `"not configured"`, your `.env` is not being loaded or the keys are missing.

---

## 5. Stop the App

Press `Ctrl+C` in the terminal where `npm run dev` is running.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 3003 or 5173 in use | Stop the other process, or set `PORT=3003` (etc.) in `.env` for the API |
| "AI not configured" | Check `.env` location and values; restart the API |
| AI Convert returns error | Check browser console and API logs; verify Foundry keys and deployment name |
| 404 "Resource not found" from Azure | See [AZURE_SETUP_GUIDE.md](AZURE_SETUP_GUIDE.md) troubleshooting. Try: (1) `AZURE_OPENAI_USE_V1=true` in .env, (2) `AZURE_OPENAI_ENDPOINT=https://skafoldai-ai.openai.azure.com`, (3) Confirm deployment name in Foundry → Build → Models |
| Blank screen | Check browser console; try clearing localStorage and refreshing |
| Onboarding doesn't appear | Sign out (header), then sign in again. Or clear localStorage: `skafoldai_user` and `skafoldai_onboarding_done_*` |

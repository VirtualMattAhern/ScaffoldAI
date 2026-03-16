# SkafoldAI

SkafoldAI helps a business owner move from ideas to plans to focused action—without holding everything in their head at once.

**Three planning horizons:**
- **Monthly** — Playbooks for recurring workflows
- **Weekly** — Brain dump, goals, and tasks
- **Daily** — Rule of 3 for focused execution

AI is embedded throughout to simplify, prioritize, break down, and move forward.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Run locally

```bash
# Install dependencies
npm install
cd src/api && npm install && cd ../..
cd src/web && npm install && cd ../..

# Start API and frontend (from project root)
npm run dev
```

- **API:** http://localhost:3003  
- **Web:** http://localhost:5173  

The API proxies `/api` requests to the backend when running `npm run dev` from the root.

### Run API and Web separately

```bash
# Terminal 1 - API
cd src/api && npm run dev

# Terminal 2 - Web
cd src/web && npm run dev
```

---

## Project Structure

```
SkafoldAI/
├── Design/           # Design docs, mockups, data model
├── src/
│   ├── api/          # Node.js + Express + TypeScript API
│   │   └── src/
│   │       ├── db/   # SQLite schema (Azure SQL–ready)
│   │       └── routes/
│   └── web/          # React + Vite + TypeScript frontend
├── data/             # SQLite database (created on first run)
└── package.json      # Root scripts
```

---

## Azure Setup (Required for AI Features)

To enable AI Convert, Focus sentence suggestions, and Top 3 suggestions:

1. **Follow the step-by-step guide:** [`docs/AZURE_SETUP_GUIDE.md`](docs/AZURE_SETUP_GUIDE.md)
2. **Automated setup (optional):** Run `.\scripts\azure-setup-steps-0-5.ps1` to create Azure resources.
3. Create or move a **Microsoft Foundry** project into `rg-skafoldai-prod` and deploy a model (e.g., gpt-4o-mini).
4. Copy `src/api/.env.example` to `src/api/.env` and add your endpoint, API key, and deployment name.
5. Restart the API server.

Without Azure/Foundry configured, the app still runs but AI features return placeholder responses.

---

## Azure Deployment

The app is designed for Azure from day one. Recommended stack:

| Layer    | Azure Service              |
|----------|----------------------------|
| Auth     | Azure Entra ID / AD B2C     |
| Database | Azure SQL Database         |
| AI       | Azure OpenAI Service       |
| API      | Azure App Service / Functions |
| Frontend | Azure Static Web Apps      |
| Config   | Azure Key Vault            |

### Steps to deploy

1. **Provision Azure resources**
   - Create a resource group
   - Azure SQL Database (or Cosmos DB)
   - Azure OpenAI (or OpenAI API key)
   - App Service or Static Web Apps

2. **Configure environment**
   - Set `DATABASE_URL` (Azure SQL connection string)
   - Set `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_KEY` (or `OPENAI_API_KEY`)
   - Set `DEV_USER_ID` for dev; replace with real auth

3. **Deploy API**
   - Build: `cd src/api && npm run build`
   - Deploy to App Service or Azure Functions

4. **Deploy frontend**
   - Build: `cd src/web && npm run build`
   - Deploy `dist/` to Azure Static Web Apps

---

## V1 Features

- **Simplification:** Onboarding, horizon switcher, empty states, AI Convert as default, direct Guided Mode entry
- **Ease of use:** Loading states, undo, quick add, AI-suggested focus sentence
- **Neurodivergent:** High contrast mode, font size, dyslexia-friendly font, explicit state labels, helper tone, predictable AI, pause without guilt
- **Settings:** High contrast, font size (90–125%), dyslexia font

---

## Development

- **API health:** `GET http://localhost:3001/api/health`
- **Data model:** See `Design/DataModel.md`
- **Design review:** See `Design/V1_Design_Review_and_Recommendations.md`

# SkafoldAI — Friendly User Test Deployment

**Last updated:** 2026-03-14 15:00 UTC

This guide gets SkafoldAI to a **test-production** state for friendly users: persistent data, custom domain, and a complete working app. Not yet real production, but ready for trusted testers.

**Target state:**
- Frontend at your domain (e.g., `app.skafoldai.com` or `www.skafoldai.com`)
- API at a subdomain (e.g., `api.skafoldai.com`)
- Persistent SQLite database (no data loss on restarts)
- HTTPS everywhere
- Your GoDaddy domain connected

**Subscription:** SkafoldAI-Prod | **Region:** Same for all resources (e.g., East US)

> **Deployment path:** This guide uses **App Service** for the API (simpler, no Docker). For the full architecture with **Container Apps**, **Key Vault**, and **Log Analytics**, follow [AZURE_SETUP_GUIDE.md](AZURE_SETUP_GUIDE.md) Steps 6–9.

---

## Prerequisites

- [ ] Steps 0–4 of [AZURE_SETUP_GUIDE.md](AZURE_SETUP_GUIDE.md) done (resource group, storage, Foundry/Azure OpenAI working locally)
- [ ] SkafoldAI-Prod subscription
- [ ] Domain purchased (e.g., GoDaddy)
- [ ] GitHub repo with your SkafoldAI code (for automated deploys, optional)

---

## Architecture

```
[Users] → app.yourdomain.com (skafoldai-web) → React frontend
                ↓
         api.yourdomain.com (skafoldai-api) → Node.js API → SQLite on Azure Files
                ↓
         skafoldai-ai (Azure OpenAI / Foundry)
```

All resources in `rg-skafoldai-prod`, SkafoldAI-Prod subscription.

---

## Step 1: Create Azure Resources (Portal)

Do these in order.

### 1a. Resource Group

1. Azure Portal → **Resource groups** → **Create**
2. Name: `rg-skafoldai-prod`
3. Region: same as your Foundry project (e.g., East US)
4. Create

### 1b. Storage Account (for SQLite persistence)

1. **Create a resource** → **Storage account**
2. Resource group: `rg-skafoldai-prod`
3. Name: `skafoldaisa` (must be globally unique; try `skafoldaisa<yourname>` if taken)
4. Region: same as resource group
5. Performance: **Standard**
6. Redundancy: **LRS**
7. Create

### 1c. File Share (inside the storage account)

1. Open your storage account → **Data storage** → **File shares**
2. **+ File share**
3. Name: `skafoldai-data`
4. Create

---

## Step 2: App Service (API)

### 2a. Create Web App

1. **Create a resource** → **Web App**
2. Resource group: `rg-skafoldai-prod`
3. Name: `skafoldai-api` (or `skafoldai-api-<yourname>` if taken)
4. Publish: **Code**
5. Runtime: **Node 20 LTS**
6. Operating system: **Linux**
7. Region: same as resource group
8. Plan: **Basic B1** (or Free F1 for testing; Free has limits)
9. Create

### 2b. Mount Azure Files for SQLite

1. In your App Service → **Development Tools** → **Advanced Tools** → **Go** (opens Kudu)
2. Or: App Service → **Settings** → **Configuration** → **Path mappings**
3. **+ New Azure Storage Mount**
4. Name: `data`
5. Storage account: select your storage account
6. Storage type: **Azure Files**
7. File share: `skafoldai-data`
8. Mount path: `/home/data`
9. Save

### 2c. Application Settings (Environment Variables)

1. App Service → **Settings** → **Configuration** → **Application settings**
2. **+ New application setting** for each:

| Name | Value |
|------|-------|
| `AZURE_OPENAI_ENDPOINT` | Your Foundry/Azure OpenAI endpoint (e.g., `https://skafoldai-ai.openai.azure.com`) |
| `AZURE_OPENAI_API_KEY` | Your Foundry Key 1 |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | `gpt-4o-mini` (or your deployment name) |
| `DATABASE_PATH` | `/home/data/skafoldai.db` |
| `PORT` | `8080` |
| `CORS_ORIGINS` | `https://app.yourdomain.com,https://www.yourdomain.com` (use your actual domain) |

3. **Save** (top of Configuration)

### 2d. Deploy the API

**Option A: VS Code**
1. Install **Azure App Service** extension
2. Right-click `src/api` folder → **Deploy to Web App**
3. Select your App Service

**Option B: Azure CLI**
```bash
cd src/api
npm run build
az webapp up --name skafoldai-api --resource-group rg-skafoldai-prod --runtime "NODE:20-lts" --plan <your-plan-name>
```

**Option C: GitHub Actions**
1. App Service → **Deployment Center**
2. Source: GitHub, authorize, select repo
3. Build provider: **GitHub Actions**
4. Azure will create a workflow. Ensure it runs `npm run build` in `src/api` and deploys the `dist` folder

**Verify:** Open `https://skafoldai-api.azurewebsites.net/api/health` — should return `{"status":"ok",...}`.

---

## Step 3: Static Web App (Frontend)

### 3a. Create Static Web App

1. **Create a resource** → **Static Web App**
2. Resource group: `rg-skafoldai-prod`
3. Name: `skafoldai-web`
4. Plan: **Free**
5. **Deploy** tab:
   - Source: **GitHub** (or **Other** for manual)
   - Organization/repo: your SkafoldAI repo
   - Branch: `main`
   - Build preset: **Custom**
   - App location: `/` (repo root)
   - Api location: *(leave empty — API is on App Service)*
   - Output location: `src/web/dist`

6. Create

### 3b. Configure Build

**VITE_API_URL** must be set at build time so the frontend knows where the API lives.

**Option A: GitHub Secret (recommended)**  
1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**: `VITE_API_URL` = `https://skafoldai-api.azurewebsites.net/api` (your API URL)
3. When Azure creates the workflow, add `env: VITE_API_URL: ${{ secrets.VITE_API_URL }}` to the build step. Or use the workflow in `.github/workflows/azure-static-web-apps.yml` as reference.

**Option B: .env.production (manual deploy)**  
1. Copy `src/web/.env.production.example` to `src/web/.env.production`
2. Set `VITE_API_URL=https://skafoldai-api.azurewebsites.net/api`
3. Run `cd src/web && npm run build` — output goes to `src/web/dist`

### 3c. Build Locally (if not using GitHub)

```bash
cd src/web
# Create .env.production with: VITE_API_URL=https://skafoldai-api.azurewebsites.net/api
npm run build
# Deploy the dist folder via Azure CLI: swa deploy
```

---

## Step 4: Custom Domain (GoDaddy)

Use subdomains: `app.yourdomain.com` (frontend) and `api.yourdomain.com` (API).

### 4a. Get Azure URLs

- **Static Web App default URL:** `https://<app-name>.azurestaticapps.net`
- **App Service default URL:** `https://<app-name>.azurewebsites.net`

### 4b. Add Custom Domain in Azure

**For Static Web App (app.yourdomain.com):**
1. Static Web App → **Custom domains**
2. **+ Add**
3. Domain: `app.yourdomain.com`
4. Azure will show a **CNAME** record to add (e.g., `xxx.azurestaticapps.net`)

**For App Service (api.yourdomain.com):**
1. App Service → **Custom domains**
2. **+ Add custom domain**
3. Domain: `api.yourdomain.com`
4. Azure will show a **CNAME** or **A** record to add

### 4c. Configure DNS in GoDaddy

1. Go to [GoDaddy Domain Manager](https://dcc.godaddy.com/)
2. Select your domain → **DNS** or **Manage DNS**
3. Add records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | app | `<your-static-web-app>.azurestaticapps.net` | 600 |
| CNAME | api | `<your-app-service>.azurewebsites.net` | 600 |

(Use the exact values Azure shows in Custom domains.)

4. **Save** — DNS can take 5–60 minutes to propagate.

### 4d. Enable SSL in Azure

1. **Static Web App:** Custom domains usually get a managed certificate automatically. If not, use **Custom domains** → select domain → **Add certificate**.
2. **App Service:** **Custom domains** → select `api.yourdomain.com` → **Add binding** → choose **SNI SSL** (free managed cert).

### 4e. Update CORS and Frontend

1. **App Service** → **Configuration** → **Application settings**
2. Update `CORS_ORIGINS` to: `https://app.yourdomain.com,https://www.yourdomain.com` (add any variants you use)

3. **Frontend:** Rebuild with `VITE_API_URL=https://api.yourdomain.com/api` and redeploy.

---

## Step 5: Verify End-to-End

1. Open `https://app.yourdomain.com`
2. Sign in with an email
3. Complete onboarding
4. Add tasks, use AI Convert, etc.
5. Sign out, sign in again — data should persist
6. Try from another device/browser — same account, same data

---

## Checklist

- [ ] Storage account + file share created
- [ ] App Service created, Azure Files mounted at `/home/data`
- [ ] `DATABASE_PATH`, `CORS_ORIGINS`, Azure OpenAI vars set
- [ ] API deployed and `/api/health` works
- [ ] Static Web App created, `VITE_API_URL` set for build
- [ ] Frontend deployed
- [ ] Custom domains added in Azure (app + api)
- [ ] DNS records added in GoDaddy
- [ ] SSL certificates active
- [ ] CORS updated with production domain
- [ ] Full flow tested

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API 401 on requests | Check `CORS_ORIGINS` includes your frontend URL (with `https://`) |
| Database errors / data lost | Verify Azure Files mount: App Service → Path mappings. Check `DATABASE_PATH` is `/home/data/skafoldai.db` |
| Frontend can't reach API | Check `VITE_API_URL` was set at build time. Rebuild and redeploy. |
| Custom domain not working | Wait for DNS (up to 48h). Use `nslookup app.yourdomain.com` to verify. |
| SSL certificate pending | Can take up to 24h. Ensure CNAME points correctly. |

---

## After Friendly Test → V2

Before real production:
- Add **Microsoft Entra ID** (or Azure AD B2C) for real auth
- Consider **Azure SQL** for scale (migrate from SQLite)
- Add monitoring, error tracking, backups
- Finalize V2 feature set from friendly user feedback

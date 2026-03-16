# SkafoldAI Production Deployment Checklist

**Last updated:** 2026-03-15 UTC

This document tracks deployment progress and open steps. Use it as a reference for what's done and what remains.

---

## Status Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Step 1: App Service (API) | ⬜ **BLOCKED** | Quota exhausted in eastus/westus |
| Step 2: AZURE_OPENAI_API_KEY | ⬜ Pending | Add in Portal after Step 1 |
| Step 3: Static Web App | ⬜ In progress | GitHub device auth required |
| Step 4: DNS (GoDaddy) | ⬜ Your action | Steps documented below |
| Step 5: Entra ID | ✅ Code ready | Azure setup steps below |

---

## What We've Done

### Codebase
- [x] Production deployment script (`scripts/azure-production-deploy.ps1`) — uses skafoldai-rg, skafoldai-openai
- [x] Entra ID integration in frontend (MSAL React) — optional when `VITE_ENTRA_CLIENT_ID` is set
- [x] Entra ID token validation in API — optional when `ENTRA_TENANT_ID` + `ENTRA_CLIENT_ID` are set
- [x] Dual auth support — email (legacy) + Entra (production)
- [x] GitHub Actions workflow for API deploy (`.github/workflows/azure-api-deploy.yml`)

### Documentation
- [x] [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) — full deployment guide
- [x] [Azure Highlevel Structure.txt](Azure%20Highlevel%20Structure.txt) — resource naming, domain mapping
- [x] This checklist

### Azure (Existing)
- [x] skafoldai-rg (SkafoldAI-Prod subscription)
- [x] skafoldai-db, skafoldai-sql-wus, skafoldai-kv
- [x] skafoldai-openai, skafoldai-insights, skafoldai-logs, skafoldaistorage

---

## Step 1: Create App Service (API) — BLOCKED

**Issue:** App Service quota exhausted in eastus and westus for SkafoldAI-Prod.

**What you need to do:**
1. Go to [Azure Portal](https://portal.azure.com) → **Subscriptions** → **SkafoldAI-Prod**
2. **Usage + quotas** → search **Microsoft.Web** (or "App Service")
3. Request quota increase for your region (e.g., East US, West US)
4. Or try another region: `.\scripts\azure-production-deploy.ps1 -Region centralus`

**After quota is available, run:**
```powershell
az account set --subscription "SkafoldAI-Prod"
.\scripts\azure-production-deploy.ps1 -OpenAIKey "<your-openai-key>"
```

---

## Step 2: Add AZURE_OPENAI_API_KEY

**When:** After Step 1 (skafoldai-api exists).

**Steps:**
1. Azure Portal → **skafoldai-api** (App Service)
2. **Settings** → **Configuration** → **Application settings**
3. **+ New application setting**
   - Name: `AZURE_OPENAI_API_KEY`
   - Value: Key 1 from **skafoldai-openai** → Keys and Endpoint
4. **Save**

---

## Step 3: Create Static Web App

**Status:** Command was run; GitHub device auth may be pending.

**If you saw a device code prompt:**
1. Go to https://github.com/login/device
2. Enter the code shown (e.g., D003-3FC6)
3. Authorize Azure to access your GitHub
4. The `az staticwebapp create` command will complete

**Or create manually:**
1. Azure Portal → **Create a resource** → **Static Web App**
2. **Resource group:** skafoldai-rg
3. **Name:** skafoldai-web
4. **Deploy:** Source = GitHub → authorize → repo: VirtualMattAhern/ScaffoldAI, branch: main
5. **Build preset:** Custom
6. **App location:** `src/web`
7. **Output location:** `dist`
8. **Api location:** *(empty)*
9. Create

**GitHub secret for build:**
- Repo → Settings → Secrets → **VITE_API_URL** = `https://skafoldai-api.azurewebsites.net/api` (or `https://api.skafoldai.com/api` after DNS)

---

## Step 4: DNS (GoDaddy) — Your Action

**When:** After skafoldai-web and skafoldai-api exist and custom domains are added in Azure.

### 4a. Add Custom Domains in Azure

**Static Web App (www.skafoldai.com):**
1. skafoldai-web → **Custom domains** → **+ Add**
2. Domain: `www.skafoldai.com`
3. Note the CNAME target (e.g., `xxx.azurestaticapps.net`)

**App Service (api.skafoldai.com):**
1. skafoldai-api → **Custom domains** → **+ Add custom domain**
2. Domain: `api.skafoldai.com`
3. Note CNAME target: `skafoldai-api.azurewebsites.net`

### 4b. Configure DNS in GoDaddy

1. Go to [GoDaddy DNS](https://dcc.godaddy.com/) → select **skafoldai.com** → **DNS**
2. Add/update records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | `<value from Static Web App>` | 600 |
| CNAME | api | skafoldai-api.azurewebsites.net | 600 |

3. (Optional) Root `skafoldai.com` → CNAME to www or A record for redirect
4. **Save** — DNS can take 5–60 minutes to propagate

### 4c. SSL in Azure

- **Static Web App:** Managed cert is automatic when domain validates
- **App Service:** Custom domains → api.skafoldai.com → **Add binding** → **SNI SSL** (free)

### 4d. Update CORS and VITE_API_URL

1. skafoldai-api → Configuration → `CORS_ORIGINS` = `https://www.skafoldai.com,https://skafoldai.com`
2. GitHub secret `VITE_API_URL` = `https://api.skafoldai.com/api`
3. Trigger new frontend build (push to main or redeploy)

---

## Step 5: Entra ID — Azure Setup (Your Action)

**Code is ready.** You need to register the app in Entra and configure env vars.

### 5a. Register App in Entra

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com)
2. **Applications** → **App registrations** → **New registration**
3. **Name:** SkafoldAI
4. **Supported account types:** Choose one:
   - "Accounts in this organizational directory only" (single tenant)
   - "Accounts in any organizational directory and personal Microsoft accounts" (broader)
5. **Redirect URI:** Platform = **Single-page application (SPA)**
   - Add: `https://www.skafoldai.com`
   - Add: `https://skafoldai-web.azurestaticapps.net`
   - Add: `http://localhost:5173` (dev)
6. **Register**
7. Note: **Application (client) ID**, **Directory (tenant) ID**

### 5b. API Permissions

1. App registration → **API permissions** → **Add a permission**
2. **Microsoft Graph** → **Delegated** → `User.Read`, `openid`
3. **Grant admin consent** (if required)

### 5c. Frontend Environment Variables

Add to `src/web/.env.production` (or GitHub secret for build):
```
VITE_ENTRA_CLIENT_ID=<your-client-id>
VITE_ENTRA_TENANT_ID=<your-tenant-id>
VITE_APP_URL=https://www.skafoldai.com
```

For local dev, add to `src/web/.env`:
```
VITE_ENTRA_CLIENT_ID=<your-client-id>
VITE_ENTRA_TENANT_ID=<your-tenant-id>
VITE_APP_URL=http://localhost:5173
```

### 5d. API Environment Variables

Add to skafoldai-api App Service Configuration:
```
ENTRA_TENANT_ID=<your-tenant-id>
ENTRA_CLIENT_ID=<your-client-id>
```

### 5e. Auth Flow

- **With Entra configured:** Landing page shows "Sign in with Microsoft" (and optionally "Sign in with email" for dev)
- **Without Entra:** Email-only login (current behavior)

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Frontend (prod) | https://www.skafoldai.com |
| API (prod) | https://api.skafoldai.com |
| API health | https://api.skafoldai.com/api/health |
| Static Web App (default) | https://skafoldai-web.azurestaticapps.net |
| App Service (default) | https://skafoldai-api.azurewebsites.net |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App Service quota | Request in Usage + quotas; try centralus |
| Static Web App GitHub auth | Complete device flow at github.com/login/device |
| API 401 / CORS | Add frontend URL to CORS_ORIGINS |
| Entra redirect mismatch | Redirect URI in Entra must match exactly |
| DNS not resolving | Wait up to 48h; use `nslookup www.skafoldai.com` |

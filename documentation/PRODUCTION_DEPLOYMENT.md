# Production Deployment — Full Live App

**Last updated:** 2026-03-15 UTC

This guide gets your app to a **fully live production state**: web + API deployed, custom domain, DNS, and Microsoft Entra ID for authentication.

> **Checklist:** See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for step-by-step progress tracking and your action items.

**App domains (per structure):**
- **SkafoldAI:** www.skafoldai.com, api.skafoldai.com
- **RezAGI:** www.rezagi.com, api.rezagi.com
- **BidBudAI:** www.bidbudai.com, api.bidbudai.com

---

## Gap Analysis: Current vs Target

Compare your Azure resources to [Azure Highlevel Structure.txt](Azure%20Highlevel%20Structure.txt).

### SkafoldAI-Prod (your screenshot)

| Resource | Structure name | Your status |
|---------|----------------|-------------|
| Resource group | rg-skafoldai-prod | ✅ skafoldai-rg (legacy; works) |
| Log Analytics | skafoldai-logs | ✅ |
| App Insights | skafoldai-ins | ✅ skafoldai-insights (legacy) |
| Key Vault | skafoldai-kv | ✅ |
| Storage | skafoldaisa | ✅ skafoldaistorage (legacy) |
| Azure OpenAI | skafoldai-ai | ✅ skafoldai-openai (legacy) |
| SQL Server | skafoldai-sql-&lt;loc&gt; | ✅ skafoldai-sql-wus |
| SQL Database | skafoldai-db | ✅ |
| **Static Web App** | skafoldai-web | ❌ **Missing** |
| **App Service (API)** | skafoldai-api | ❌ **Missing** |
| Container Apps Env | skafoldai-env | Optional (only if using Container Apps) |
| ACR | skafoldai-acr | Optional (only if using containers) |

**Next steps:** Create skafoldai-web and skafoldai-api, then configure DNS and Entra ID.

---

## Phase 1: Deploy Web + API

### 1a. Create App Service (API)

Your existing resources are in `skafoldai-rg`. Use that resource group:

```powershell
az account set --subscription "SkafoldAI-Prod"

# Create App Service Plan (F1 Free or B1 Basic)
az appservice plan create --name skafoldai-plan --resource-group skafoldai-rg --location eastus --is-linux --sku F1

# Create Web App for API
az webapp create --name skafoldai-api --resource-group skafoldai-rg --plan skafoldai-plan --runtime "NODE:20-lts"

# Startup command
az webapp config set --name skafoldai-api --resource-group skafoldai-rg --startup-file "node dist/index.js"
```

**If F1 quota is exhausted:** Try `--location westus` (where your SQL is) or request quota: Subscriptions → SkafoldAI-Prod → Usage + quotas → Microsoft.Web → App Service.

### 1b. Configure API Settings

```powershell
# Get SQL password from Key Vault
$sqlPwd = az keyvault secret show --vault-name skafoldai-kv --name SqlAdminPassword --query value -o tsv
$dbUrl = "Server=tcp:skafoldai-sql-wus.database.windows.net,1433;Database=skafoldai-db;User ID=skafoldaiadmin;Password=$sqlPwd;Encrypt=true;TrustServerCertificate=false;"

# Your OpenAI resource is skafoldai-openai (from screenshot)
az webapp config appsettings set --name skafoldai-api --resource-group skafoldai-rg --settings `
  "DATABASE_URL=$dbUrl" `
  "AZURE_OPENAI_ENDPOINT=https://skafoldai-openai.openai.azure.com" `
  "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini" `
  "PORT=8080" `
  "CORS_ORIGINS=https://www.skafoldai.com,https://skafoldai.com,https://skafoldai-web.azurestaticapps.net,http://localhost:5173"
```

Add `AZURE_OPENAI_API_KEY` manually in Portal (skafoldai-api → Configuration) or from Key Vault if stored there.

### 1c. Deploy API

```powershell
cd src/api
npm ci && npm run build
az webapp deploy --name skafoldai-api --resource-group skafoldai-rg --src-path . --type zip
```

Verify: `https://skafoldai-api.azurewebsites.net/api/health`

### 1d. Create Static Web App (Frontend)

```powershell
az staticwebapp create --name skafoldai-web --resource-group skafoldai-rg --location eastus `
  --source https://github.com/YOUR_ORG/ScaffoldAI --branch main `
  --app-location "src/web" --output-location "dist" --login-with-github
```

Or create in [Azure Portal](https://portal.azure.com) → Static Web App → Connect GitHub → app_location: `src/web`, output_location: `dist`.

**GitHub secret:** `VITE_API_URL` = `https://skafoldai-api.azurewebsites.net/api` (or `https://api.skafoldai.com/api` after DNS).

---

## Phase 2: Custom Domain + DNS

### 2a. Add Custom Domains in Azure

**Static Web App (www.skafoldai.com):**
1. skafoldai-web → Custom domains → + Add
2. Domain: `www.skafoldai.com`
3. Note CNAME target (e.g. `xxx.azurestaticapps.net`)

**App Service (api.skafoldai.com):**
1. skafoldai-api → Custom domains → + Add custom domain
2. Domain: `api.skafoldai.com`
3. Note CNAME target: `skafoldai-api.azurewebsites.net`

### 2b. Configure DNS (GoDaddy or your registrar)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | `<static-web-app>.azurestaticapps.net` | 600 |
| CNAME | api | skafoldai-api.azurewebsites.net | 600 |

(Optional) Root `skafoldai.com` → CNAME to www or A record.

### 2c. SSL

- Static Web App: managed cert when domain validates
- App Service: Custom domains → api.skafoldai.com → Add binding → SNI SSL (free)

### 2d. Update CORS and VITE_API_URL

After DNS propagates:
1. App Service → Configuration → `CORS_ORIGINS` = `https://www.skafoldai.com,https://skafoldai.com`
2. GitHub secret `VITE_API_URL` = `https://api.skafoldai.com/api`
3. Trigger new frontend build (push to main)

---

## Phase 3: Microsoft Entra ID (Authentication)

Current auth uses email-only (no password). For production, use **Microsoft Entra ID** (Azure AD) for sign-in.

### 3a. Register App in Entra

1. [Microsoft Entra admin center](https://entra.microsoft.com) → **Applications** → **App registrations** → **New registration**
2. **Name:** SkafoldAI (or RezAGI, etc.)
3. **Supported account types:** Accounts in this organizational directory only (single tenant) — or "Any Microsoft account" for broader access
4. **Redirect URI:** SPA → `https://www.skafoldai.com` (and `http://localhost:5173` for dev)
5. **Register**
6. Note: **Application (client) ID**, **Directory (tenant) ID**

### 3b. Configure API Permissions

1. App registration → **API permissions** → **Add a permission**
2. **Microsoft Graph** → Delegated → `User.Read`, `openid`
3. **Grant admin consent** (if required)

### 3c. Add Production Redirect URIs

1. App registration → **Authentication**
2. Under **Single-page application**, add:
   - `https://www.skafoldai.com`
   - `https://skafoldai-web.azurestaticapps.net` (default URL before custom domain)
   - `http://localhost:5173` (dev)

### 3d. Frontend: MSAL React

```bash
cd src/web
npm install @azure/msal-browser @azure/msal-react
```

Create `src/web/src/auth/msalConfig.ts`:

```ts
import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID ?? '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID ?? ''}`,
    redirectUri: import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
  },
  cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
  system: { loggerOptions: { logLevel: LogLevel.Warning } },
};

export const loginRequest = { scopes: ['User.Read', 'openid'] };
```

Wrap app in `MsalProvider` (see [Microsoft docs](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-single-page-app-react-configure-authentication)).

### 3e. API: Validate Entra Tokens

API must validate the `Authorization: Bearer <token>` from Entra. Options:

- **Option A:** Use `passport-azure-ad` or `@azure/msal-node` to validate JWT
- **Option B:** Call Microsoft Graph `/me` with the token to get user info, then sync to your `users` table

Add env vars to App Service:
- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID` (same as frontend for SPA; or a separate backend app registration)

### 3f. Migration Path

Until Entra is wired:
- Keep current email-based auth for testing
- Add Entra as an additional sign-in option, or replace once ready

---

## Phase 4: RezAGI (www.rezagi.com)

Same steps, different naming:

| SkafoldAI | RezAGI |
|-----------|--------|
| skafoldai-rg | rg-rezagi-prod |
| skafoldai-web | rezagi-web |
| skafoldai-api | rezagi-api |
| www.skafoldai.com | www.rezagi.com |
| api.skafoldai.com | api.rezagi.com |

1. Create RezAGI-Prod subscription resources (or use existing rg-rezagi-prod)
2. Deploy rezagi-web (Static Web App) and rezagi-api (App Service)
3. Add custom domains www.rezagi.com, api.rezagi.com
4. Configure DNS for rezagi.com
5. Register separate Entra app for RezAGI

---

## Quick Reference

| Resource | SkafoldAI URL |
|----------|---------------|
| Frontend (prod) | https://www.skafoldai.com |
| API (prod) | https://api.skafoldai.com |
| API health | https://api.skafoldai.com/api/health |
| Static Web App (default) | https://skafoldai-web.azurestaticapps.net |
| App Service (default) | https://skafoldai-api.azurewebsites.net |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App Service quota | Request in Usage + quotas; or use westus |
| API 401 / CORS | Add frontend URL to CORS_ORIGINS |
| AI 404 | Check AZURE_OPENAI_ENDPOINT matches your resource (skafoldai-openai) |
| DNS not resolving | Wait up to 48h; use `nslookup www.skafoldai.com` |
| Entra redirect mismatch | Ensure redirect URI in Entra matches exactly (no trailing slash) |

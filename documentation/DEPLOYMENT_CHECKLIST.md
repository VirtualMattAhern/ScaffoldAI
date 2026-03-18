# SkafoldAI Production Deployment Checklist

**Last updated:** 2026-03-18 UTC

This document tracks deployment progress and open steps. Use it as a reference for what's done and what remains.

---

## Status Overview

| Phase | Status | Notes |
|-------|--------|-------|
| **SQL** | ✅ Done | skafoldai-sql-cus (Central US), data migrated from West |
| **API** | ✅ Container App | skafoldai-api in skafoldai-env |
| **Web** | ✅ Container App | skafoldai-web in skafoldai-env |
| **Legacy** | ✅ Decommissioned | App Service + Static Web App removed |
| **CI/CD** | ✅ GitHub Actions | `.github/workflows/azure-container-apps-deploy.yml` |
| **Monitoring** | ✅ Script ready | Run `.\scripts\azure-monitoring-setup.ps1` |
| **Managed Identity** | ✅ Script ready | Run `.\scripts\azure-managed-identity-acr.ps1` |
| **Entra ID** | ✅ Script ready | Run `.\scripts\azure-entra-config.ps1` with your IDs |
| **DNS** | ⚠️ Update needed | Point api/www to Container App FQDNs (see below) |

---

## Current URLs (Working)

| Resource | URL |
|----------|-----|
| **API (default)** | https://skafoldai-api.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io |
| **API health** | https://skafoldai-api.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io/api/health |
| **Web (default)** | https://skafoldai-web.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io |

---

## Custom Domains — www.skafoldai.com ✅ Fixed

**www.skafoldai.com** was returning 404 because the custom domain was not bound. Fixed by:
1. Adding hostname: `az containerapp hostname add -n skafoldai-web -g skafoldai-rg --hostname www.skafoldai.com`
2. Creating managed cert: `az containerapp env certificate create ... --hostname www.skafoldai.com --validation-method CNAME`
3. Binding when cert succeeded: `az containerapp hostname bind ... --hostname www.skafoldai.com --certificate cert-www-skafoldai`

**api.skafoldai.com** — ✅ Bound (2026-03-13). Cert `cert-api-skafoldai` bound; API reachable at https://api.skafoldai.com/api/health

---

## DNS Update Required (GoDaddy)

**api.skafoldai.com** and **www.skafoldai.com** currently point to the old App Service / Static Web App (deleted). Update to Container Apps:

| Type | Name | Old Value | New Value |
|------|------|-----------|-----------|
| **CNAME** | api | ~~skafoldai-api.azurewebsites.net~~ | **skafoldai-api.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io** |
| **TXT** | asuid.api | 5E10D7B594E68E897ECAF25D3AF8DBBA90CC789BE27DFC08E408C61030C72EC9 | (keep) |
| **CNAME** | www | ~~white-mushroom-02850580f.2.azurestaticapps.net~~ | **skafoldai-web.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io** |
| **TXT** | asuid.www | *(add if missing)* | 5E10D7B594E68E897ECAF25D3AF8DBBA90CC789BE27DFC08E408C61030C72EC9 |

1. Go to [GoDaddy DNS](https://dcc.godaddy.com/) → **skafoldai.com** → **DNS**
2. Edit the **api** CNAME → change value to `skafoldai-api.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io`
3. Edit the **www** CNAME → change value to `skafoldai-web.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io`
4. Add **asuid.www** TXT if you get validation errors for www
5. Save — DNS can take 5–60 minutes to propagate

### After DNS Propagates: Add Custom Domains + Managed Certs

```powershell
# API
az containerapp env certificate create -g skafoldai-rg -n skafoldai-env --certificate-name cert-api --hostname api.skafoldai.com --validation-method CNAME
az containerapp hostname bind -g skafoldai-rg -n skafoldai-api --hostname api.skafoldai.com --environment skafoldai-env --certificate cert-api

# Web (after asuid.www TXT exists)
az containerapp hostname add -n skafoldai-web -g skafoldai-rg --hostname www.skafoldai.com
az containerapp env certificate create -g skafoldai-rg -n skafoldai-env --certificate-name cert-www --hostname www.skafoldai.com --validation-method CNAME
az containerapp hostname bind -g skafoldai-rg -n skafoldai-web --hostname www.skafoldai.com --environment skafoldai-env --certificate cert-www
```

---

## CI/CD (GitHub Actions)

**Service principal created.** Add **AZURE_CREDENTIALS** secret — see [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) for one-step command or UI steps.

---

## Monitoring

Run once to create Log Analytics + App Insights and link to Container Apps:

```powershell
.\scripts\azure-monitoring-setup.ps1
```

---

## Managed Identity for ACR

Run once to switch from ACR admin credentials to managed identity for image pull:

```powershell
.\scripts\azure-managed-identity-acr.ps1
```

---

## Entra ID (Microsoft Sign-in)

✅ **API configured.** Client ID `5b66d72f-e8e0-46fb-b90d-edb27c3b07d2`, Tenant ID `8e6d83f9-fbb3-46e9-9f63-ef2ccb6766df`.

**To enable "Sign in with Microsoft" on the frontend (secure, standard approach):**
```powershell
# From repo root, with gh CLI installed and authenticated
.\scripts\github-secrets-entra.ps1
```
This adds `VITE_ENTRA_CLIENT_ID` and `VITE_ENTRA_TENANT_ID` to GitHub Secrets (encrypted, never logged). The next deploy will bake them into the web build.

---

## Architecture Summary

| Resource | Name | Region |
|----------|------|--------|
| Resource Group | skafoldai-rg | — |
| SQL Server | skafoldai-sql-cus | Central US |
| Database | skafoldai-db | — |
| ACR | skafoldaiacr | Central US |
| Container Apps Env | skafoldai-env | Central US |
| API Container App | skafoldai-api | Central US |
| Web Container App | skafoldai-web | Central US |
| Key Vault | skafoldai-kv | — |
| OpenAI | skafoldai-openai | — |

---

## Deploy Latest to Production (Landing Page, UI, Entra)

The landing page (Skafold logo + mascot), calming blue UI, and "Sign in with Microsoft" require a fresh deploy.

1. **Add Entra secrets** (one-time): `.\scripts\github-secrets-entra.ps1`
2. **Push to main** (or trigger workflow manually: Actions → Deploy to Azure Container Apps → Run workflow)
3. **Wait** ~5–10 min for build + deploy. Visit https://www.skafoldai.com

---

## Redeploy / Update Images (Manual)

```powershell
# API
az acr build --registry skafoldaiacr --image skafoldai-api:latest --no-wait src/api
az containerapp update -n skafoldai-api -g skafoldai-rg --image skafoldaiacr.azurecr.io/skafoldai-api:latest

# Web (VITE_API_URL for production)
az acr build --registry skafoldaiacr --image skafoldai-web:latest --build-arg VITE_API_URL=https://api.skafoldai.com/api --no-wait src/web
az containerapp update -n skafoldai-web -g skafoldai-rg --image skafoldaiacr.azurecr.io/skafoldai-web:latest
```

---

## Step 5: Entra ID — Azure Setup (Your Action)

**Code is ready.** You need to register the app in Entra and configure env vars.

### 5a. Register App in Entra

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com)
2. **Applications** → **App registrations** → **New registration**
3. **Name:** SkafoldAI
4. **Supported account types:** Choose one (single tenant or broader)
5. **Redirect URI:** Platform = **Single-page application (SPA)**
   - Add: `https://www.skafoldai.com`
   - Add: `https://skafoldai-web.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io`
   - Add: `http://localhost:5173` (dev)
6. **Register** — note **Application (client) ID**, **Directory (tenant) ID**

### 5b. API Permissions

1. App registration → **API permissions** → **Add a permission**
2. **Microsoft Graph** → **Delegated** → `User.Read`, `openid`
3. **Grant admin consent** (if required)

### 5c. Frontend Environment Variables

Add to `src/web/.env.production` or build secret:
```
VITE_ENTRA_CLIENT_ID=<your-client-id>
VITE_ENTRA_TENANT_ID=<your-tenant-id>
VITE_APP_URL=https://www.skafoldai.com
VITE_API_URL=https://api.skafoldai.com/api
```

### 5d. API Environment Variables (Container App)

Run: `.\scripts\azure-entra-config.ps1 -EntraTenantId "<tenant-id>" -EntraClientId "<client-id>"`

Or add manually to skafoldai-api → Configuration: `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`

**Multi-app setup:** See [ENTRA_ID_MULTI_APP_SETUP.md](ENTRA_ID_MULTI_APP_SETUP.md) — one app registration per product (SkafoldAI, BidBudAI, RezAGI); each isolated.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| api.skafoldai.com 503 | DNS still points to old App Service; update CNAME to Container App FQDN |
| API ConnectionPool error | Fixed in client.ts (createRequire for mssql ESM interop) |
| azure-schema.sql missing | Build script copies it; ensure `npm run build` runs in Docker |
| CORS errors | Add frontend URL to CORS_ORIGINS in API Container App |
| Entra redirect mismatch | Redirect URI in Entra must match exactly |

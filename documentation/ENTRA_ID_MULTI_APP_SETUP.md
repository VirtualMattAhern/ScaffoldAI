# Entra ID Setup for Multi-App Architecture

This guide explains how to set up Microsoft Entra ID (Azure AD) app registrations for **SkafoldAI**, **BidBudAI**, and **RezAGI** so each app is isolated and does not impact the others.

**Tenant:** FloatingKey (shared across all 3 apps)  
**Strategy:** One app registration per product — each gets its own Client ID; all share the same Tenant ID.

---

## Overview

| App | App Registration Name | Redirect URIs | API Config |
|-----|------------------------|---------------|------------|
| SkafoldAI | SkafoldAI | www.skafoldai.com, api.skafoldai.com, localhost | skafoldai-api |
| BidBudAI | BidBudAI | www.bidbudai.com, api.bidbudai.com, localhost | bidbud-api |
| RezAGI | RezAGI | www.rezagi.com, api.rezagi.com, localhost | rezagi-api |

Each registration is independent. Changing SkafoldAI does not affect BidBudAI or RezAGI.

---

## Step 1: Create App Registration for SkafoldAI

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com)
2. **Applications** → **App registrations** → **New registration**
3. **Name:** `SkafoldAI`
4. **Supported account types:** Choose one:
   - **Single tenant** (only your org) — recommended for internal apps
   - **Accounts in any org + personal** — if you want external users
5. **Redirect URI:** Leave empty for now (add in next step)
6. **Register**

---

## Step 2: Configure SkafoldAI Redirect URIs

1. In the SkafoldAI app registration → **Authentication**
2. **Platform configurations** → **Add a platform** → **Single-page application (SPA)**
3. Add these redirect URIs (one per line or separate entries):
   - `https://www.skafoldai.com`
   - `https://skafoldai-web.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io` (default Container App URL)
   - `http://localhost:5173` (local dev)
4. Under **Implicit grant and hybrid flows:** leave unchecked (use PKCE)
5. **Save**

---

## Step 3: Add API Permissions (SkafoldAI)

1. **API permissions** → **Add a permission**
2. **Microsoft Graph** → **Delegated**
3. Add: `User.Read`, `openid`
4. **Add permission**
5. If your org requires it: **Grant admin consent for [Your Org]**

---

## Step 4: Get SkafoldAI IDs

1. **Overview** → copy:
   - **Application (client) ID** → use as `ENTRA_CLIENT_ID` and `VITE_ENTRA_CLIENT_ID`
   - **Directory (tenant) ID** → use as `ENTRA_TENANT_ID` and `VITE_ENTRA_TENANT_ID`

**SkafoldAI (configured):**
- Client ID: `5b66d72f-e8e0-46fb-b90d-edb27c3b07d2`
- Tenant ID: `8e6d83f9-fbb3-46e9-9f63-ef2ccb6766df`

---

## Step 5: Configure SkafoldAI API Container App

✅ **Done.** API has `ENTRA_TENANT_ID` and `ENTRA_CLIENT_ID` set.

To re-run:
```powershell
.\scripts\azure-entra-config.ps1 -EntraTenantId "8e6d83f9-fbb3-46e9-9f63-ef2ccb6766df" -EntraClientId "5b66d72f-e8e0-46fb-b90d-edb27c3b07d2"
```

---

## Step 6: Configure SkafoldAI Frontend

The frontend needs these at **build time** (baked into the bundle). Two options:

**Option A: GitHub Actions (CI/CD)**  
Add these as **GitHub repository secrets** (Settings → Secrets and variables → Actions):
- `VITE_ENTRA_CLIENT_ID` = `5b66d72f-e8e0-46fb-b90d-edb27c3b07d2`
- `VITE_ENTRA_TENANT_ID` = `8e6d83f9-fbb3-46e9-9f63-ef2ccb6766df`

Then push to `main` or trigger a workflow run — the web image will be rebuilt with Entra enabled.

**Option B: Local / manual build**  
Add to `src/web/.env.production`:
```
VITE_ENTRA_CLIENT_ID=5b66d72f-e8e0-46fb-b90d-edb27c3b07d2
VITE_ENTRA_TENANT_ID=8e6d83f9-fbb3-46e9-9f63-ef2ccb6766df
VITE_APP_URL=https://www.skafoldai.com
VITE_API_URL=https://api.skafoldai.com/api
```
Then build and deploy the web image manually.

---

## Replicate for BidBudAI and RezAGI

Use the same pattern for each app:

### BidBudAI

1. **App registrations** → **New registration** → Name: `BidBudAI`
2. **Authentication** → SPA → Add:
   - `https://www.bidbudai.com`
   - `https://api.bidbudai.com` (if used as redirect)
   - BidBudAI Container App default URL
   - `http://localhost:5173`
3. **API permissions** → Microsoft Graph → Delegated → `User.Read`, `openid`
4. Copy Client ID and Tenant ID → configure bidbud-api and bidbud-web

### RezAGI

1. **App registrations** → **New registration** → Name: `RezAGI`
2. **Authentication** → SPA → Add:
   - `https://www.rezagi.com`
   - `https://api.rezagi.com` (if used as redirect)
   - RezAGI Container App default URL
   - `http://localhost:5173`
3. **API permissions** → Microsoft Graph → Delegated → `User.Read`, `openid`
4. Copy Client ID and Tenant ID → configure rezagi-api and rezagi-web

---

## Isolation Summary

| Aspect | Shared | Per-App |
|--------|--------|---------|
| Tenant ID | ✅ Same (FloatingKey) | — |
| Client ID | — | ✅ Unique per app |
| Redirect URIs | — | ✅ Scoped to that app's domains |
| API validation | — | ✅ Each API validates its own Client ID |

Changing or deleting the SkafoldAI app registration does not affect BidBudAI or RezAGI.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Redirect URI mismatch | Redirect URI in Entra must match exactly (including trailing slash, http vs https) |
| CORS on token | Ensure API `CORS_ORIGINS` includes the frontend URL |
| Token validation fails | Verify `ENTRA_TENANT_ID` and `ENTRA_CLIENT_ID` in API match the app registration |

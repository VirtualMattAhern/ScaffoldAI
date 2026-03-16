# Azure Setup Guide for SkafoldAI (SkafoldAI-Prod Subscription)

**Last updated:** 2026-03-15 UTC

This guide walks you through setting up **all Azure resources** for SkafoldAI under a single subscription, with a dedicated Azure OpenAI/Foundry instance so it does not share resources with other apps.

**Subscription:** SkafoldAI-Prod  
**Region:** East US (or your preferred region—keep it consistent for all resources)  
**Naming prefix:** `skafoldai-`  
**Resource group:** `rg-skafoldai-prod` (per [Azure Highlevel Structure](Azure%20Highlevel%20Structure.txt))

> **Legacy deployments:** If you have existing resources with old names (`skafoldai-rg`, `skafoldai-openai`, `skafoldai-insights`, `skafoldaistorage`), you can continue using them. New deployments should use the structure naming above.

---

## Where You Are / Current Step

| Step | Resource | Status |
|------|----------|--------|
| 0 | Subscription & Resource Group | ✅ Done |
| 1 | Log Analytics + App Insights | ✅ Done |
| 2 | Key Vault | ✅ Done |
| 3 | Storage Account | ✅ Done |
| 4 | Azure OpenAI / Foundry | ✅ skafoldai-ai in use |
| 5 | Database | ✅ skafoldai-db (Azure SQL) |
| 6 | App Service (API) | ⬜ In progress |
| 7 | Static Web App (Frontend) | ⬜ In progress |
| 8 | Custom domain (www.skafoldai.com) | ⬜ Pending |
| 9 | Production deploy & verify | ⬜ Pending |

> **Production deployment:** See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for full www.skafoldai.com setup.  
> **Checklist:** See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for step-by-step progress and your action items.

**Start at Step 0** if the subscription is empty (as shown in your overview).

### Automated setup (Steps 0–5)

From the project root, with [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in:

```powershell
# Set subscription first
az account set --subscription "SkafoldAI-Prod"

# Run script (provide SQL admin password for Step 5)
.\scripts\azure-setup-steps-0-5.ps1 -SqlAdminPassword "YourSecureP@ssw0rd"
```

For Step 4 (move existing Foundry), either:
- Run `.\scripts\list-foundry-resources.ps1` to get the resource ID, then:
  `.\scripts\azure-setup-steps-0-5.ps1 -SqlAdminPassword "..." -ExistingOpenAIResourceId "<resource-id>"`
- Or run the script first, then move manually: `az resource move --destination-group rg-skafoldai-prod --ids "<id>"`

---

## Architecture Overview

```
[Users] → skafoldai-web (Static Web App) → React frontend
                ↓
         skafoldai-api (Container App) → Node.js API
                ↓                    ↓
         skafoldai-db (Azure SQL)   skafoldai-ai (Azure OpenAI / Foundry)
                ↓
         skafoldai-kv (Key Vault) — secrets
         skafoldai-logs (Log Analytics) — monitoring
         skafoldai-storage (Storage) — SQLite fallback / files
```

All resources live in **SkafoldAI-Prod** subscription, **same region**, resource group `rg-skafoldai-prod`.

---

## Resource Naming Reference

| Resource | Name | Notes |
|----------|------|-------|
| Resource Group | `rg-skafoldai-prod` | |
| Log Analytics | `skafoldai-logs` | |
| Application Insights | `skafoldai-ins` | Uses skafoldai-logs |
| Key Vault | `skafoldai-kv` | Globally unique; add suffix if taken |
| Storage Account | `skafoldaisa` | 3–24 chars, no hyphens; add suffix if taken |
| File Share | `skafoldai-data` | Inside storage |
| Azure OpenAI / Foundry | `skafoldai-ai` | Dedicated to this app |
| Database | `skafoldai-db` | Azure SQL or PostgreSQL |
| Container Apps Env | `skafoldai-env` | |
| API (Container App) | `skafoldai-api` | |
| Web (Static Web App) | `skafoldai-web` | |

---

## Step 0: Resource Group

1. Go to [Azure Portal](https://portal.azure.com).
2. Ensure **SkafoldAI-Prod** is the active subscription (top bar).
3. **Resource groups** → **Create**.
4. **Subscription:** SkafoldAI-Prod  
   **Resource group:** `rg-skafoldai-prod`  
   **Region:** East US (or your choice—use this for all resources).
5. **Review + create** → **Create**.

---

## Step 1: Log Analytics + Application Insights

1. **Create a resource** → search **Log Analytics workspace**.
2. **Resource group:** `rg-skafoldai-prod`  
   **Name:** `skafoldai-logs`  
   **Region:** same as resource group.
3. **Review + create** → **Create**.
4. **Create a resource** → search **Application Insights**.
5. **Resource group:** `rg-skafoldai-prod`  
   **Name:** `skafoldai-ins`  
   **Region:** same.  
   **Log Analytics workspace:** select `skafoldai-logs`.
6. **Review + create** → **Create**.

---

## Step 2: Key Vault

1. **Create a resource** → **Key Vault**.
2. **Resource group:** `rg-skafoldai-prod`  
   **Key vault name:** `skafoldai-kv` (or `skafoldai-kv-<suffix>` if taken)  
   **Region:** same.
3. **Access configuration:** Choose **Vault access policy** or **Azure RBAC** as preferred.
4. **Review + create** → **Create**.

---

## Step 3: Storage Account

1. **Create a resource** → **Storage account**.
2. **Resource group:** `rg-skafoldai-prod`  
   **Storage account name:** `skafoldaisa` (globally unique; add suffix if needed)  
   **Region:** same.
3. **Performance:** Standard | **Redundancy:** LRS.
4. **Review** → **Create**.
5. After creation: Storage account → **Data storage** → **File shares** → **+ File share** → Name: `skafoldai-data` → **Create**.

---

## Step 4: Azure OpenAI / Foundry (Move Existing)

Foundry is already set up. **Move** your existing Azure OpenAI resource into `rg-skafoldai-prod` so it lives under SkafoldAI-Prod with the rest of the app.

### 4a. Find your existing resource

**Option A: Azure CLI**
```powershell
# From project root
.\scripts\list-foundry-resources.ps1
```
Or manually:
```bash
az account set --subscription "SkafoldAI-Prod"
az cognitiveservices account list --query "[].{Name:name, ResourceGroup:resourceGroup, Id:id}" -o table
```

**Option B: Azure Portal**
1. Go to [portal.azure.com](https://portal.azure.com) → **Cognitive Services** (or search "Azure OpenAI").
2. Find your Foundry resource → **Properties** → copy **Resource ID**.

### 4b. Move to rg-skafoldai-prod

```bash
az resource move --destination-group rg-skafoldai-prod --ids "<YOUR-RESOURCE-ID>"
```

Example (replace with your actual ID):
```bash
az resource move --destination-group rg-skafoldai-prod --ids "/subscriptions/xxx/resourceGroups/old-rg/providers/Microsoft.CognitiveServices/accounts/your-foundry-name"
```

### 4c. Verify

- Resource appears in `rg-skafoldai-prod` in Azure Portal.
- Endpoint and Key 1 are unchanged—no app config updates needed.
- If you renamed the resource to `skafoldai-ai`, update `.env` endpoint accordingly.

### 4d. If no existing Foundry in SkafoldAI-Prod

If your Foundry was created in another subscription (e.g. a different app’s subscription), you can either:

- **Create new:** In [ai.azure.com](https://ai.azure.com), create a project with resource group `rg-skafoldai-prod` and region East US. Deploy gpt-4o-mini.
- **Move from another subscription:** Use [Azure Resource Mover](https://learn.microsoft.com/en-us/azure/resource-mover/) or recreate the resource in `rg-skafoldai-prod` (moving Cognitive Services across subscriptions has limitations).

**Store in Key Vault (optional):** Add `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` as secrets in `skafoldai-kv` for production.

---

## Step 5: Database

### Azure SQL Database (recommended)

1. **Create a resource** → **Azure SQL Database**.
2. **Resource group:** `rg-skafoldai-prod`  
   **Database name:** `skafoldai-db`.
3. **Server:** Create new → Name: `skafoldai-sql-eus` (or `skafoldai-sql-wus` for West US) → **Region:** same → set **SQL admin login** and **password** (save these).
4. **Compute + storage:** Basic or Standard S0 for testing.
5. **Networking:** Allow Azure services; add your IP for dev.
6. **Create**.
7. In the database → **Connection strings** → copy ADO.NET or Node.js string; replace `{your_password}`.

> **Note:** The app supports both SQLite (local) and Azure SQL (production). Set `DATABASE_URL` for Azure SQL; the schema is migrated automatically on startup.

---

## Step 6: Container Apps Environment

1. **Create a resource** → **Container Apps**.
2. **Resource group:** `rg-skafoldai-prod`  
   **Container Apps Environment name:** `skafoldai-env`  
   **Region:** same.
3. **Zone redundancy:** Disabled (for cost).
4. **Create**.

---

## Step 7: skafoldai-api (Container App)

1. **Create a resource** → **Container App**.
2. **Resource group:** `rg-skafoldai-prod`  
   **Container App name:** `skafoldai-api`  
   **Region:** same.
3. **Container Apps Environment:** select `skafoldai-env`.
4. **Create**.
5. After creation:
   - **Containers** → **Edit and deploy** → configure image (e.g., Azure Container Registry or GitHub Container Registry).
   - **Ingress:** Enabled, Accept traffic from: **Everywhere**, Target port: `3003` (or your API port).
   - **Secrets:** Add `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_NAME`, `DATABASE_URL` (Azure SQL connection string), `PORT`=8080.
   - **Storage:** Mount Azure Files `skafoldai-data` at `/home/data` only if using SQLite (omit when using `DATABASE_URL`).

> **Deployment:** Build a Docker image for the API, push to ACR or GHCR, and point the Container App to it. See [DEPLOYMENT_FRIENDLY_TEST.md](DEPLOYMENT_FRIENDLY_TEST.md) for CI/CD options.

---

## Step 8: skafoldai-web (Static Web App)

1. **Create a resource** → **Static Web App**.
2. **Resource group:** `rg-skafoldai-prod`  
   **Name:** `skafoldai-web`  
   **Plan:** Free.
3. **Deploy:** Source: GitHub (or Other) → select repo, branch `main`.
4. **Build preset:** Custom  
   **App location:** `src/web`  
   **Output location:** `dist`  
   **Api location:** *(empty—API is on Container App)*
5. **Create**.
6. Add GitHub secret `VITE_API_URL` = `https://<skafoldai-api-url>/api` (your Container App URL).

---

## Step 9: Wire Secrets, CORS, and Deploy

1. **CORS:** In skafoldai-api (Container App) → **Ingress** → add your Static Web App URL (e.g., `https://skafoldai-web.azurestaticapps.net`) to allowed origins.
2. **Environment variables:** Ensure API has `CORS_ORIGINS` including the frontend URL.
3. **Deploy API:** Build and push container; update Container App to use new image.
4. **Deploy Web:** Push to `main` to trigger Static Web App build, or run `swa deploy` manually.

---

## Local Development (.env)

1. Copy `src/api/src/.env.example` to `src/api/src/.env`.
2. Fill in:

```
AZURE_OPENAI_ENDPOINT=https://skafoldai-ai.openai.azure.com
AZURE_OPENAI_API_KEY=<Key 1 from Step 4>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
```

Use the **base URL only**—no path. The app adds the path automatically.

---

## Verify Locally

```bash
npm run dev
```

Open http://localhost:5173 → **Weekly** → **Brain Dump** → **AI Convert**. Tasks should appear.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Resource not found" / 404 | Deployment name must match exactly. Try `AZURE_OPENAI_USE_V1=true` in `.env`. |
| "Invalid API key" | Re-copy Key 1; no extra spaces. Restart API after changing `.env`. |
| Quota exceeded | Check Foundry/Azure OpenAI quota; request increase if needed. |
| CORS errors | Add frontend URL to `CORS_ORIGINS` in API config. |

---

## Cost Summary

- **Azure OpenAI:** Pay per token (gpt-4o-mini is low cost).
- **Container Apps:** Pay for vCPU/memory usage.
- **Static Web App:** Free tier available.
- **Storage, Key Vault, Log Analytics:** Low cost at small scale.
- Set **Cost Management + Billing → Budgets** for alerts.

---

## What's Next

- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) — **Production at www.skafoldai.com** (App Service + Static Web App + custom domain).
- [DEPLOYMENT_FRIENDLY_TEST.md](DEPLOYMENT_FRIENDLY_TEST.md) — Full deployment flow, custom domain, DNS.
- [LOCAL_TESTING.md](LOCAL_TESTING.md) — Local run and test steps.

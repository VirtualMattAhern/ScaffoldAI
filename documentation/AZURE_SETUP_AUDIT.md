# SkafoldAI Azure Setup — Audit & Remediation

**Last updated:** 2026-03-17 UTC

This document audits the current Azure deployment against [Azure Highlevel Structure.txt](Azure%20Highlevel%20Structure.txt), identifies gaps, and provides a remediation plan for production stability, performance, and scale.

---

## Executive Summary

| Area | Status | Action |
|------|--------|--------|
| **Compute model** | ❌ App Service + Static Web App | Migrate to **Container Apps** + ACR |
| **Regional alignment** | ❌ API (East) + SQL (West) | Co-locate all in **East US** (or Central) |
| **Resource group** | ⚠️ skafoldai-rg (legacy) | Target: **rg-skafoldai-prod** |
| **Container registry** | ❌ Missing | Create **skafoldai-acr** |
| **Container Apps env** | ❌ Missing | Create **skafoldai-env** |
| **Quota issue** | F1 App Service tier | Container Apps avoid App Service quotas |

---

## 1. Structure Compliance Audit

### Per Azure Highlevel Structure.txt

| Resource | Target name | Current | Compliant |
|----------|-------------|---------|-----------|
| Resource group | rg-skafoldai-prod | skafoldai-rg | ❌ Legacy |
| Web | skafoldai-web (container app) | Static Web App | ❌ Wrong type |
| API | skafoldai-api (container app) | App Service | ❌ Wrong type |
| Container Apps env | skafoldai-env | — | ❌ Missing |
| ACR | skafoldai-acr | — | ❌ Missing |
| Azure OpenAI | skafoldai-ai | skafoldai-openai | ⚠️ Legacy name |
| Key Vault | skafoldai-kv | skafoldai-kv | ✅ |
| SQL Server | skafoldai-sql-&lt;loc&gt; | skafoldai-sql-wus | ⚠️ Wrong region |
| SQL Database | skafoldai-db | skafoldai-db | ✅ |
| Storage | skafoldaisa | skafoldaistorage | ⚠️ Legacy |
| Log Analytics | skafoldai-logs | skafoldai-logs | ✅ |
| App Insights | skafoldai-ins | skafoldai-insights | ⚠️ Legacy |

---

## 2. Regional Alignment (Critical)

**Structure rule:** *"Locations within each RG, should attempt to either be all US East or all US West - or if needing to mix at all, mostly one or other + Central, but not mix of East and West (due to degradation)."*

### Current state

| Resource | Location | Issue |
|----------|----------|-------|
| skafoldai-api (App Service) | East US | — |
| skafoldai-web (Static Web App) | East US 2 | — |
| skafoldai-sql-wus | **West US** | Cross-region latency to API |
| skafoldai-plan | East US | — |
| skafoldai-kv, skafoldai-openai, etc. | Mixed | Need verification |

**Impact:** API in East calling SQL in West adds ~50–80 ms latency per query. For a production app with many DB calls, this degrades performance and user experience.

**Remediation:** Co-locate all critical resources in **East US** (or **Central US** if East has quota constraints). SQL must be in the same region as the API.

---

## 3. Container Apps vs App Service / Static Web App

### Why Container Apps?

| Aspect | App Service / Static Web App | Container Apps |
|--------|------------------------------|----------------|
| **Quota** | F1/B1 tier has per-subscription VM quotas | Consumption-based; no F1-style limits |
| **Scale** | Manual scale-out | Auto-scale, scale to zero |
| **Deploy** | Zip / Oryx build (native deps can fail) | Docker image — consistent, reproducible |
| **Structure compliance** | Not in target structure | ✅ Per structure |
| **Maintainability** | Runtime tied to Azure stack | Same image runs locally, CI, prod |
| **Future** | Legacy model | Azure’s recommended path for apps |

**Quota clarification:** The F1 "0 of 0" quota was an **App Service** subscription limit. Container Apps use a different billing model and do not consume App Service F1/B1 quotas. Migrating to Container Apps avoids that class of quota issues.

### Target architecture

```
[Users] → skafoldai-web (Container App) → React SPA
                ↓
         skafoldai-api (Container App) → Node.js API
                ↓                    ↓
         skafoldai-db (Azure SQL)   skafoldai-ai (Azure OpenAI)
                ↓
         skafoldai-acr (container registry)
         skafoldai-env (Container Apps environment)
```

---

## 4. SQL Location Remediation

**Options:**

| Option | Effort | Downtime | Recommendation |
|--------|--------|----------|----------------|
| **A. New SQL in East, migrate data** | Medium | Brief | ✅ Best for production |
| **B. Move API to West** | Low | None | ❌ Puts compute in West; user prefers East |
| **C. Use Central for all** | Low | None (new resources) | ✅ If East has quota issues |

**Recommended: Option A or C**

- **Option A:** Create `skafoldai-sql-eus` in East US. Export data from `skafoldai-sql-wus`, import to new DB. Update connection strings. Decommission West SQL when verified.
- **Option C:** If East has persistent quota or capacity issues, use **Central US** for all new resources (API, Web, SQL, ACR, env). Central has good connectivity to both coasts.

---

## 5. Remediation Plan (Phased)

### Phase 1: Foundation (same region)

1. **Pick primary region:** East US or Central US.
2. **Create/verify SQL in that region:**
   - If new: `skafoldai-sql-eus` (East) or `skafoldai-sql-cus` (Central).
   - If migrating: Create new server + DB, migrate data, then switch.
3. **Create ACR:** `skafoldai-acr` in same region.
4. **Create Container Apps environment:** `skafoldai-env` in same region.

### Phase 2: Containerize & deploy

1. **Add Dockerfiles** for API and Web (see `src/api/Dockerfile`, `src/web/Dockerfile`).
2. **Build and push** images to `skafoldai-acr`.
3. **Create Container Apps:**
   - `skafoldai-api` (from API image)
   - `skafoldai-web` (from Web image, or keep Static Web App for frontend if preferred)
4. **Configure** env vars, secrets (Key Vault references), custom domains.

### Phase 3: Cutover & cleanup

1. **Add custom domains** to Container Apps (api.skafoldai.com, www.skafoldai.com).
2. **Update DNS** if needed (CNAME targets change for Container Apps).
3. **Decommission** old App Service, Static Web App (if replaced), and West SQL (if migrated).

### Phase 4: Resource group alignment (optional)

1. **Create** `rg-skafoldai-prod` if not exists.
2. **Move** resources from `skafoldai-rg` to `rg-skafoldai-prod` (or adopt `skafoldai-rg` as legacy and document).

---

## 6. Files to Create/Update

| File | Action |
|------|--------|
| `src/api/Dockerfile` | Create |
| `src/web/Dockerfile` | Create |
| `scripts/azure-container-apps-deploy.ps1` | Create — full Container Apps + ACR setup |
| `scripts/azure-setup-steps-0-5.ps1` | Update — use `skafoldai-sql-eus` (or cus), `rg-skafoldai-prod` |
| `scripts/azure-production-deploy.ps1` | Deprecate or replace with container deploy |
| `documentation/PRODUCTION_DEPLOYMENT.md` | Update — Container Apps flow |
| `documentation/DEPLOYMENT_CHECKLIST.md` | Update — new steps |
| `.github/workflows/` | Add — build/push to ACR, deploy Container Apps |

---

## 7. SQL Migration: West → East (if needed)

If your SQL is in West (`skafoldai-sql-wus`) and you want everything in East:

**Option A: New SQL in East (recommended)**

```powershell
# Run setup script with East region (creates skafoldai-sql-eus)
.\scripts\azure-setup-steps-0-5.ps1 -SqlAdminPassword "YourPassword" -SkipStep4 -SkipStep5
# Then run Step 5 manually with $sqlServer = "skafoldai-sql-eus"
```

Or create manually:
1. Azure Portal → SQL servers → Create
2. Name: `skafoldai-sql-eus`, Region: East US
3. Create database `skafoldai-db`
4. Run schema: use `src/api/src/db/azure-schema.sql` (or ensureSchema)
5. Export data from West DB, import to East DB
6. Update Key Vault SqlAdminPassword if different
7. Update all connection strings to `skafoldai-sql-eus`
8. Decommission West SQL after verification

**Option B: Move API to West** (not recommended — user prefers East)

---

## 8. Immediate Next Steps

1. **Read** this audit and [Azure Highlevel Structure.txt](Azure%20Highlevel%20Structure.txt).
2. **Decide** primary region: East US vs Central US.
3. **Decide** SQL strategy: new in East/Central + migrate, or keep West and move API to West (not recommended).
4. **Run** `scripts/azure-container-apps-deploy.ps1` (to be created) after Dockerfiles exist.
5. **Verify** all resources are in the chosen region before cutover.

---

*Reference: [Azure Highlevel Structure.txt](Azure%20Highlevel%20Structure.txt), [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)*

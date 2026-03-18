# Deploy Latest to Production

**Why the UI looks unchanged:** The live site at www.skafoldai.com is serving an older build. The landing page (Skafold logo + mascot), calming blue UI, Entra "Sign in with Microsoft", and V2 features exist in the codebase but need a fresh deploy.

---

## Steps to Deploy

### 1. Add Entra secrets (one-time)

**Option A:** Run the script (requires `gh auth login` first):
```powershell
gh auth login
.\scripts\github-secrets-entra.ps1
```

**Option B:** Add manually in GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
- `VITE_ENTRA_CLIENT_ID` = `5b66d72f-e8e0-46fb-b90d-edb27c3b07d2`
- `VITE_ENTRA_TENANT_ID` = `8e6d83f9-fbb3-46e9-9f63-ef2ccb6766df`

### 2. Push to main

```powershell
git add -A
git commit -m "V2 Phase 2A, Entra config, landing page, deploy prep"
git push origin main
```

### 3. Trigger deploy

The workflow runs automatically on push to `main` when `src/api/**`, `src/web/**`, or the workflow file change.

Or manually: **GitHub** → **Actions** → **Deploy to Azure Container Apps** → **Run workflow**.

### 4. Wait and verify

Build + deploy takes ~5–10 minutes. Then visit:

- https://www.skafoldai.com — landing page with Skafold logo + mascot
- Sign in (email or Microsoft)
- Settings → Reduce motion, Focus mode

---

## What This Deploy Includes

| Area | Changes |
|------|---------|
| **Landing** | Skafold logo (blue), mascot, tagline, Get Started |
| **UI** | Calming blue palette, rounded corners, shadows |
| **Entra** | "Sign in with Microsoft" (when secrets added) |
| **V2 2A** | Reduce motion, Focus mode, tooltips, last_used_at |
| **V1** | AI-suggested playbooks, task filtering |

---

## V1 Remaining

- **Deploy** — Add secrets + push (above)
- **last_used_at** — ✅ Implemented (updates when playbook opened)

## V2 Status

- **2A** — ✅ Reduce motion, tooltips, focus mode, last_used_at
- **2B–2D** — In progress / planned

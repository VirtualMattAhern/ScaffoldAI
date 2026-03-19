# GitHub Actions Setup for SkafoldAI

**Add the AZURE_CREDENTIALS secret to GitHub** to enable automated deployment to Azure Container Apps.

**Note:** `VITE_ENTRA_CLIENT_ID` and `VITE_ENTRA_TENANT_ID` are separate — they are for the frontend build. `AZURE_CREDENTIALS` is for Azure login (deploy step). Both are needed for a full deploy.

## One-step: Add secret (service principal already created)

**Option A: GitHub CLI** (run `gh auth login` first if not authenticated)

```powershell
gh secret set AZURE_CREDENTIALS --body '{"clientId":"<SP_APP_ID>","clientSecret":"<SP_PASSWORD>","tenantId":"<TENANT_ID>","subscriptionId":"<SUBSCRIPTION_ID>"}'
```

Replace placeholders with values from `az ad sp create-for-rbac` output.

**Option B: GitHub UI**

1. **GitHub** → repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** → Name: `AZURE_CREDENTIALS`
3. Value: JSON with `clientId`, `clientSecret`, `tenantId`, `subscriptionId` from your service principal

## Verify

Push a change to `src/api` or `src/web` on `main`. The workflow will build and deploy both Container Apps.

## GitHub CLI auth (if needed)

If `gh secret set` fails with auth errors:

```powershell
gh auth login
```

Choose HTTPS, authenticate via browser or token, then retry the secret command.

## Rotate credentials

If compromised: delete the service principal, create a new one, and update the secret.
